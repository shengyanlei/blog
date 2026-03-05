package com.blog.service.impl;

import com.blog.dto.footprint.*;
import com.blog.entity.FootprintLocation;
import com.blog.entity.FootprintPhoto;
import com.blog.repository.FootprintLocationRepository;
import com.blog.repository.FootprintPhotoRepository;
import com.blog.service.FootprintService;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class FootprintServiceImpl implements FootprintService {

    private final FootprintLocationRepository locationRepository;
    private final FootprintPhotoRepository photoRepository;
    private static final Logger log = LoggerFactory.getLogger(FootprintServiceImpl.class);
    private static final AtomicInteger REVERSE_GEO_THREAD_COUNTER = new AtomicInteger(1);
    private static final ThreadFactory REVERSE_GEO_THREAD_FACTORY = runnable -> {
        Thread thread = new Thread(runnable, "reverse-geo-" + REVERSE_GEO_THREAD_COUNTER.getAndIncrement());
        thread.setDaemon(true);
        return thread;
    };
    private static final ExecutorService REVERSE_GEO_EXECUTOR = Executors.newFixedThreadPool(2, REVERSE_GEO_THREAD_FACTORY);

    @Value("${footprint.reverse-geocode-async:true}")
    private boolean reverseGeocodeAsync;

    @Value("${footprint.reverse-geocode-connect-timeout-ms:1500}")
    private int reverseGeoConnectTimeoutMs;

    @Value("${footprint.reverse-geocode-read-timeout-ms:2500}")
    private int reverseGeoReadTimeoutMs;

    public FootprintServiceImpl(FootprintLocationRepository locationRepository, FootprintPhotoRepository photoRepository) {
        this.locationRepository = locationRepository;
        this.photoRepository = photoRepository;
    }

    private static class ReverseGeoResult {
        String province;
        String city;
        String shotAt;
        Double latitude;
        Double longitude;
    }

    @Override
    public List<ProvinceSummaryDTO> getProvinceSummaries() {
        return locationRepository.findAll().stream()
                .collect(Collectors.groupingBy(FootprintLocation::getProvince))
                .entrySet().stream()
                .map(entry -> {
                    var list = entry.getValue();
                    long visitedCitiesWithPhotos = list.stream()
                            .filter(loc -> Optional.ofNullable(loc.getPhotoCount()).orElse(0) > 0)
                            .count();
                    long visitCount = list.stream().mapToLong(loc -> Optional.ofNullable(loc.getVisitCount()).orElse(0)).sum();
                    long photoCount = list.stream().mapToLong(loc -> Optional.ofNullable(loc.getPhotoCount()).orElse(0)).sum();
                    LocalDate lastVisited = list.stream()
                            .map(FootprintLocation::getLastVisited)
                            .filter(d -> d != null)
                            .max(LocalDate::compareTo)
                            .orElse(null);
                    return new ProvinceSummaryDTO(entry.getKey(), list.size(), visitedCitiesWithPhotos, visitCount, photoCount, lastVisited);
                })
                .sorted(Comparator.comparing(ProvinceSummaryDTO::getProvince))
                .collect(Collectors.toList());
    }

    @Override
    public List<CitySummaryDTO> getCitiesByProvince(String province) {
        return locationRepository.findByProvince(province).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Override
    public CityDetailDTO getCityDetail(Long id) {
        FootprintLocation location = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Footprint not found"));
        return toDetail(location);
    }

    @Override
    @Transactional
    public CityDetailDTO createFootprint(CreateFootprintRequest request) {
        FootprintLocation location = locationRepository.findByProvinceAndCity(request.getProvince(), request.getCity())
                .orElseGet(FootprintLocation::new);
        location.setProvince(request.getProvince());
        location.setCity(request.getCity());
        if (!StringUtils.hasText(location.getCountry())) {
            location.setCountry("\u4E2D\u56FD");
        }
        location.setVisitCount(Optional.ofNullable(request.getVisitCount()).orElse(1));
        location.setLastVisited(Optional.ofNullable(request.getLastVisited()).orElse(LocalDate.now()));
        location.setTags(request.getTags());
        locationRepository.save(location);

        if (request.getPhotos() != null && !request.getPhotos().isEmpty()) {
            addPhotosInternal(location, request.getPhotos());
        }

        updateCounts(location);
        return toDetail(locationRepository.save(location));
    }

    @Override
    @Transactional
    public CityDetailDTO addPhotos(Long id, AddPhotosRequest request) {
        FootprintLocation location = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Footprint not found"));
        if (request == null || request.getPhotos() == null || request.getPhotos().isEmpty()) {
            throw new IllegalArgumentException("Photo list cannot be empty");
        }
        try {
            addPhotosInternal(location, request.getPhotos());
            // Save then reload to ensure relationship counts are computed from fresh entity state.
            locationRepository.save(location);
            FootprintLocation fresh = locationRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Footprint not found"));
            updateCounts(fresh);
            locationRepository.save(fresh);
            return toDetail(fresh);
        } catch (Exception e) {
            log.error("Failed to add photos for locationId={}", id, e);
            throw new RuntimeException("Failed to save photos: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void deletePhoto(Long photoId) {
        FootprintPhoto photo = photoRepository.findById(photoId).orElse(null);
        if (photo == null) {
            return;
        }
        FootprintLocation location = photo.getLocation();
        photoRepository.delete(photo);
        if (location != null) {
            location.getPhotos().removeIf(p -> Objects.equals(p.getId(), photoId));
            updateCounts(location);
            locationRepository.save(location);
        }
    }

    @Override
    @Transactional
    public PhotoDTO reassignPhoto(Long photoId, ReassignPhotoRequest request) {
        FootprintPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found"));
        FootprintLocation oldLocation = photo.getLocation();

        String targetProvince = request.getProvince();
        String targetCity = request.getCity();
        if (targetProvince == null || targetCity == null) {
            throw new IllegalArgumentException("Province and city cannot be blank");
        }

        FootprintLocation target = locationRepository.findByProvinceAndCity(targetProvince, targetCity)
                .orElseGet(() -> {
                    FootprintLocation loc = new FootprintLocation();
                    loc.setProvince(targetProvince);
                    loc.setCity(targetCity);
                    loc.setCountry("\u4E2D\u56FD");
                    loc.setVisitCount(1);
                    loc.setLastVisited(LocalDate.now());
                    return locationRepository.save(loc);
                });

        // Unbind from old location.
        if (oldLocation != null) {
            oldLocation.getPhotos().removeIf(p -> Objects.equals(p.getId(), photoId));
            updateCounts(oldLocation);
            locationRepository.save(oldLocation);
        }

        // Bind to target location.
        photo.setLocation(target);
        target.getPhotos().add(photo);
        photoRepository.save(photo);
        updateCounts(target);
        locationRepository.save(target);

        return toPhoto(photo);
    }

    @Override
    @Transactional
    public PhotoDTO updatePhotoNote(Long photoId, UpdatePhotoNoteRequest request) {
        FootprintPhoto photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found"));
        if (request.getNote() != null) {
            photo.setNote(request.getNote());
        }
        if (request.getTags() != null) {
            photo.setTags(request.getTags());
        }
        photoRepository.save(photo);
        FootprintLocation location = photo.getLocation();
        if (location != null) {
            updateCounts(location);
            locationRepository.save(location);
        }
        return toPhoto(photo);
    }

    @Override
    public FootprintStatsDTO getStats() {
        List<FootprintLocation> all = locationRepository.findAll();
        List<FootprintLocation> withPhotos = all.stream()
                .filter(loc -> Optional.ofNullable(loc.getPhotoCount()).orElse(0) > 0)
                .collect(Collectors.toList());
        long provinceCount = withPhotos.stream().map(FootprintLocation::getProvince).distinct().count();
        long cityCount = withPhotos.size();
        long photoCount = withPhotos.stream().mapToLong(loc -> Optional.ofNullable(loc.getPhotoCount()).orElse(0)).sum();
        String topCity = withPhotos.stream()
                .max(Comparator.comparing(loc -> Optional.ofNullable(loc.getVisitCount()).orElse(0)))
                .map(loc -> loc.getCity())
                .orElse(null);
        return new FootprintStatsDTO(provinceCount, cityCount, photoCount, topCity);
    }

    @Override
    @Transactional
    public UploadPhotoResponse uploadAndParseLocation(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        try {
            String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString().replace("-", "");
            if (StringUtils.hasText(ext)) {
                filename = filename + "." + ext;
            }
            Path uploadDir = Paths.get("uploads/footprints");
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            String url = "/uploads/footprints/" + filename;

            ReverseGeoResult geo = new ReverseGeoResult();
            try {
                geo = extractLocation(file);
            } catch (Exception ex) {
                // EXIF/GPS parsing failure must not block upload success.
                log.warn("Parse EXIF/GPS failed for uploaded image, fallback to raw upload. filename={}", filename, ex);
            }

            UploadPhotoResponse response = new UploadPhotoResponse(url, null, null, geo.shotAt);
            if (geo.latitude != null && geo.longitude != null) {
                if (reverseGeocodeAsync) {
                    scheduleReverseGeo(url, geo.latitude, geo.longitude);
                } else {
                    ReverseGeoResult resolved = reverseGeo(geo.latitude, geo.longitude);
                    if (resolved != null) {
                        response.setProvince(resolved.province);
                        response.setCity(resolved.city);
                    }
                }
            }
            return response;
        } catch (Exception e) {
            throw new RuntimeException("Upload failed: " + e.getMessage(), e);
        }
    }

    private void addPhotosInternal(FootprintLocation location, List<PhotoDTO> photos) {
        if (photos == null) return;
        for (PhotoDTO dto : photos) {
            if (dto.getUrl() == null || dto.getUrl().isEmpty()) {
                continue;
            }
            try {
                FootprintPhoto photo = new FootprintPhoto();
                photo.setLocation(location);
                photo.setUrl(dto.getUrl());
                photo.setShotAt(dto.getShotAt());
                photo.setTrip(dto.getTrip());
                photo.setNote(dto.getNote());
                photo.setTags(dto.getTags());
                photo.setCover(dto.getCover());
                location.getPhotos().add(photo);
                photoRepository.save(photo);
            } catch (Exception ex) {
                log.error("Failed to save single photo url={}", dto.getUrl(), ex);
            }
        }
    }

    private void updateCounts(FootprintLocation location) {
        location.setPhotoCount(location.getPhotos().size());
        LocalDate lastVisited = location.getPhotos().stream()
                .map(FootprintPhoto::getShotAt)
                .filter(d -> d != null)
                .max(LocalDate::compareTo)
                .orElse(location.getLastVisited());
        location.setLastVisited(lastVisited);
    }

    private CitySummaryDTO toSummary(FootprintLocation location) {
        CitySummaryDTO dto = new CitySummaryDTO();
        dto.setId(location.getId());
        dto.setProvince(location.getProvince());
        dto.setCity(location.getCity());
        dto.setVisitCount(location.getVisitCount());
        dto.setPhotoCount(location.getPhotoCount());
        dto.setLastVisited(location.getLastVisited());
        dto.setTags(location.getTags());
        dto.setCoverUrl(location.getCoverUrl());
        return dto;
    }

    private CityDetailDTO toDetail(FootprintLocation location) {
        CityDetailDTO dto = new CityDetailDTO();
        dto.setId(location.getId());
        dto.setProvince(location.getProvince());
        dto.setCity(location.getCity());
        dto.setVisitCount(location.getVisitCount());
        dto.setPhotoCount(location.getPhotoCount());
        dto.setLastVisited(location.getLastVisited());
        dto.setTags(location.getTags());
        dto.setCoverUrl(location.getCoverUrl());
        dto.setPhotos(location.getPhotos().stream().map(this::toPhoto).collect(Collectors.toList()));
        return dto;
    }

    private PhotoDTO toPhoto(FootprintPhoto photo) {
        PhotoDTO dto = new PhotoDTO();
        dto.setId(photo.getId());
        dto.setUrl(photo.getUrl());
        dto.setShotAt(photo.getShotAt());
        dto.setTrip(photo.getTrip());
        dto.setNote(photo.getNote());
        dto.setTags(photo.getTags());
        dto.setCover(photo.getCover());
        return dto;
    }

    private ReverseGeoResult extractLocation(MultipartFile file) {
        ReverseGeoResult result = new ReverseGeoResult();
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(file.getInputStream());
            ExifSubIFDDirectory exif = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
            if (exif != null && exif.getDateOriginal() != null) {
                result.shotAt = exif.getDateOriginal().toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
            }
            GpsDirectory gps = metadata.getFirstDirectoryOfType(GpsDirectory.class);
            if (gps != null && gps.getGeoLocation() != null) {
                result.latitude = gps.getGeoLocation().getLatitude();
                result.longitude = gps.getGeoLocation().getLongitude();
            }
        } catch (Exception ignored) {
            // EXIF parsing best effort only.
        }
        return result;
    }

    private void scheduleReverseGeo(String url, double lat, double lon) {
        REVERSE_GEO_EXECUTOR.submit(() -> {
            ReverseGeoResult geo = reverseGeo(lat, lon);
            if (geo != null && (StringUtils.hasText(geo.province) || StringUtils.hasText(geo.city))) {
                log.info("Async reverse geocode resolved for {} => province={}, city={}", url, geo.province, geo.city);
            } else {
                log.debug("Async reverse geocode skipped or failed for {}", url);
            }
        });
    }

    @SuppressWarnings("unchecked")
    private ReverseGeoResult reverseGeo(double lat, double lon) {
        try {
            RestTemplate restTemplate = createGeoRestTemplate();
            String url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon + "&zoom=10&accept-language=zh-CN";
            HttpHeaders headers = new HttpHeaders();
            headers.add("User-Agent", "footprint-app/1.0");
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = resp.getBody();
            if (body == null) return null;
            Map<String, String> address = (Map<String, String>) body.get("address");
            if (address == null) return null;

            ReverseGeoResult r = new ReverseGeoResult();
            r.province = address.getOrDefault("state", address.getOrDefault("province", null));
            r.city = address.getOrDefault("city", address.getOrDefault("county", address.getOrDefault("town", address.get("village"))));
            return r;
        } catch (Exception e) {
            log.debug("Reverse geocode request failed: {}", e.getMessage());
            return null;
        }
    }

    private RestTemplate createGeoRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(500, reverseGeoConnectTimeoutMs));
        requestFactory.setReadTimeout(Math.max(500, reverseGeoReadTimeoutMs));
        return new RestTemplate(requestFactory);
    }
}
