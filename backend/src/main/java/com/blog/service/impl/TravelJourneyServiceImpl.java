package com.blog.service.impl;

import com.blog.dto.travel.*;
import com.blog.entity.FootprintLocation;
import com.blog.entity.FootprintPhoto;
import com.blog.entity.TravelJourney;
import com.blog.entity.TravelPlan;
import com.blog.repository.FootprintLocationRepository;
import com.blog.repository.FootprintPhotoRepository;
import com.blog.repository.TravelJourneyRepository;
import com.blog.repository.TravelPlanRepository;
import com.blog.service.FootprintService;
import com.blog.service.TravelJourneyService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class TravelJourneyServiceImpl implements TravelJourneyService {

    private final TravelJourneyRepository journeyRepository;
    private final FootprintLocationRepository locationRepository;
    private final FootprintPhotoRepository photoRepository;
    private final TravelPlanRepository planRepository;
    private final FootprintService footprintService;

    public TravelJourneyServiceImpl(
            TravelJourneyRepository journeyRepository,
            FootprintLocationRepository locationRepository,
            FootprintPhotoRepository photoRepository,
            TravelPlanRepository planRepository,
            FootprintService footprintService
    ) {
        this.journeyRepository = journeyRepository;
        this.locationRepository = locationRepository;
        this.photoRepository = photoRepository;
        this.planRepository = planRepository;
        this.footprintService = footprintService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<JourneySummaryDTO> getJourneys(Integer year, String keyword, String tag) {
        String keywordText = normalize(keyword);
        String tagText = normalize(tag);
        return journeyRepository.findAll().stream()
                .filter(journey -> year == null || isInYear(journey, year))
                .filter(journey -> !StringUtils.hasText(keywordText) || containsKeyword(journey, keywordText))
                .filter(journey -> !StringUtils.hasText(tagText) || containsTag(journey.getTags(), tagText))
                .sorted(byTimelineOrder())
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getJourneyYears() {
        Set<Integer> years = new TreeSet<>(Comparator.reverseOrder());
        for (TravelJourney journey : journeyRepository.findAll()) {
            if (journey.getStartDate() != null) {
                years.add(journey.getStartDate().getYear());
            } else if (journey.getEndDate() != null) {
                years.add(journey.getEndDate().getYear());
            }
        }
        return new ArrayList<>(years);
    }

    @Override
    @Transactional(readOnly = true)
    public JourneyDetailDTO getJourneyDetail(Long id) {
        TravelJourney journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        return toDetail(journey);
    }

    @Override
    @Transactional
    public JourneyDetailDTO createJourney(JourneyUpsertRequest request) {
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new IllegalArgumentException("Journey title cannot be blank");
        }
        validateDateRange(request.getStartDate(), request.getEndDate());
        String normalizedTitle = request.getTitle().trim();
        Optional<TravelJourney> latestSameJourney = journeyRepository
                .findTopByTitleAndStartDateAndEndDateOrderByCreatedAtDescIdDesc(
                        normalizedTitle,
                        request.getStartDate(),
                        request.getEndDate()
                );
        if (latestSameJourney.isPresent()) {
            TravelJourney sameJourney = latestSameJourney.get();
            if (sameJourney.getCreatedAt() != null && sameJourney.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(15))) {
                return toDetail(sameJourney);
            }
        }

        TravelJourney journey = new TravelJourney();
        applyJourneyFields(journey, request);
        return toDetail(journeyRepository.save(journey));
    }

    @Override
    @Transactional
    public JourneyDetailDTO updateJourney(Long id, JourneyUpsertRequest request) {
        TravelJourney journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        if (request == null || !StringUtils.hasText(request.getTitle())) {
            throw new IllegalArgumentException("Journey title cannot be blank");
        }
        validateDateRange(request.getStartDate(), request.getEndDate());
        applyJourneyFields(journey, request);
        return toDetail(journeyRepository.save(journey));
    }

    @Override
    @Transactional
    public void deleteJourney(Long id) {
        TravelJourney journey = journeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        List<FootprintLocation> locations = locationRepository.findByJourneyId(id);
        if (!locations.isEmpty()) {
            for (FootprintLocation location : locations) {
                location.setJourney(null);
            }
            locationRepository.saveAll(locations);
        }
        journeyRepository.delete(journey);
    }

    @Override
    @Transactional
    public JourneyDetailDTO linkLocations(Long journeyId, LinkLocationsRequest request) {
        if (request == null || request.getLocationIds() == null || request.getLocationIds().isEmpty()) {
            throw new IllegalArgumentException("locationIds cannot be empty");
        }
        TravelJourney journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        List<Long> uniqueIds = request.getLocationIds().stream().filter(Objects::nonNull).distinct().collect(Collectors.toList());
        if (uniqueIds.isEmpty()) {
            throw new IllegalArgumentException("locationIds cannot be empty");
        }
        List<FootprintLocation> locations = locationRepository.findByIdIn(uniqueIds);
        if (locations.size() != uniqueIds.size()) {
            throw new IllegalArgumentException("Some locations do not exist");
        }
        for (FootprintLocation location : locations) {
            location.setJourney(journey);
        }
        locationRepository.saveAll(locations);
        return toDetail(journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found")));
    }

    @Override
    @Transactional
    public JourneyDetailDTO unlinkLocation(Long journeyId, Long locationId) {
        TravelJourney journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        FootprintLocation location = locationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Footprint location not found"));
        if (location.getJourney() == null || !Objects.equals(location.getJourney().getId(), journeyId)) {
            throw new IllegalArgumentException("Location is not linked to the selected journey");
        }
        location.setJourney(null);
        locationRepository.save(location);
        return toDetail(journey);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UnassignedLocationAssetDTO> getUnassignedAssets() {
        return locationRepository.findByJourneyIsNull().stream()
                .filter(location -> (location.getPhotoCount() != null && location.getPhotoCount() > 0) || !location.getPhotos().isEmpty())
                .sorted(Comparator.comparing(FootprintLocation::getLastVisited, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(location -> {
                    UnassignedLocationAssetDTO dto = new UnassignedLocationAssetDTO();
                    dto.setLocationId(location.getId());
                    dto.setCountry(location.getCountry());
                    dto.setProvince(location.getProvince());
                    dto.setCity(location.getCity());
                    dto.setAddressDetail(location.getAddressDetail());
                    dto.setFullAddress(buildFullAddress(location.getCountry(), location.getProvince(), location.getCity(), location.getAddressDetail()));
                    dto.setPhotoCount(location.getPhotoCount());
                    dto.setPhotos(location.getPhotos().stream()
                            .sorted(Comparator.comparing(FootprintPhoto::getShotAt, Comparator.nullsLast(Comparator.reverseOrder())))
                            .map(photo -> toJourneyPhoto(photo, location))
                            .collect(Collectors.toList()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<PendingAssetPhotoDTO> uploadPendingAssets(MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No files uploaded");
        }
        if (files.length > 50) {
            throw new IllegalArgumentException("At most 50 files are allowed per upload");
        }
        List<PendingAssetPhotoDTO> result = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            var uploadResult = footprintService.uploadAndParseLocation(file);
            FootprintPhoto photo = new FootprintPhoto();
            photo.setUrl(uploadResult.getUrl());
            photo.setShotAt(parseShotAt(uploadResult.getShotAt()));
            FootprintPhoto saved = photoRepository.save(photo);
            result.add(toPendingPhoto(saved));
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PendingAssetPhotoDTO> getPendingAssets(int page, int size, String scope, String keyword, String month, Boolean hasShotAt) {
        int pageNumber = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), 100);
        String scopeText = normalizeScope(scope);
        String keywordText = normalizeKeyword(keyword);

        LocalDateTime monthStart = null;
        LocalDateTime monthEnd = null;
        if (StringUtils.hasText(month)) {
            try {
                YearMonth yearMonth = YearMonth.parse(month.trim());
                monthStart = yearMonth.atDay(1).atStartOfDay();
                monthEnd = yearMonth.plusMonths(1).atDay(1).atStartOfDay();
            } catch (Exception ex) {
                throw new IllegalArgumentException("Invalid month format, expected yyyy-MM");
            }
        }

        Page<FootprintPhoto> pageData = photoRepository.findPendingAssets(
                scopeText,
                keywordText,
                monthStart,
                monthEnd,
                hasShotAt,
                PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
        );
        return new PageImpl<>(
                pageData.getContent().stream().map(this::toPendingPhoto).collect(Collectors.toList()),
                pageData.getPageable(),
                pageData.getTotalElements()
        );
    }

    @Override
    @Transactional
    public BindPendingResultDTO bindPendingAssetsToPlan(BindPendingToPlanRequest request) {
        if (request == null || request.getPlanId() == null) {
            throw new IllegalArgumentException("planId is required");
        }
        TravelPlan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found"));
        if (!StringUtils.hasText(plan.getProvince()) || !StringUtils.hasText(plan.getCity())) {
            throw new IllegalArgumentException("Plan address is incomplete");
        }
        FootprintLocation location = ensureLocation("\u4E2D\u56FD", plan.getProvince().trim(), plan.getCity().trim(), null);
        List<FootprintPhoto> photos = getPendingPhotosForBinding(request.getPhotoIds());
        bindPhotosToLocation(photos, location);
        return buildBindResult(location, photos.size());
    }

    @Override
    @Transactional
    public BindPendingResultDTO bindPendingAssetsToJourney(BindPendingToJourneyRequest request) {
        if (request == null || request.getJourneyId() == null) {
            throw new IllegalArgumentException("journeyId is required");
        }
        TravelJourney journey = journeyRepository.findById(request.getJourneyId())
                .orElseThrow(() -> new IllegalArgumentException("Journey not found"));
        List<FootprintLocation> journeyLocations = journey.getLocations();
        if (journeyLocations == null || journeyLocations.isEmpty()) {
            throw new IllegalArgumentException("Journey has no linked locations");
        }

        FootprintLocation targetLocation;
        if (journeyLocations.size() == 1 && request.getLocationId() == null) {
            targetLocation = journeyLocations.get(0);
        } else {
            if (request.getLocationId() == null) {
                throw new IllegalArgumentException("locationId is required when journey has multiple locations");
            }
            targetLocation = journeyLocations.stream()
                    .filter(item -> Objects.equals(item.getId(), request.getLocationId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Selected location does not belong to this journey"));
        }

        List<FootprintPhoto> photos = getPendingPhotosForBinding(request.getPhotoIds());
        bindPhotosToLocation(photos, targetLocation);
        return buildBindResult(targetLocation, photos.size());
    }

    @Override
    @Transactional
    public BindPendingResultDTO bindPendingAssetsToAddress(BindPendingToAddressRequest request) {
        if (request == null || request.getAddress() == null) {
            throw new IllegalArgumentException("address is required");
        }
        String country = normalizeAddressValue(request.getAddress().getCountry());
        String province = normalizeAddressValue(request.getAddress().getProvince());
        String city = normalizeAddressValue(request.getAddress().getCity());
        String addressDetail = normalizeAddressValue(request.getAddress().getAddressDetail());
        if (!StringUtils.hasText(country)) {
            country = "\u4E2D\u56FD";
        }
        if (!StringUtils.hasText(province) || !StringUtils.hasText(city)) {
            throw new IllegalArgumentException("province and city are required");
        }

        List<Long> uniqueIds = request.getPhotoIds() == null
                ? Collections.emptyList()
                : request.getPhotoIds().stream().filter(Objects::nonNull).distinct().collect(Collectors.toList());
        if (uniqueIds.isEmpty()) {
            throw new IllegalArgumentException("photoIds cannot be empty");
        }

        List<FootprintPhoto> photos = photoRepository.findByIdIn(uniqueIds);
        if (photos.size() != uniqueIds.size()) {
            throw new IllegalArgumentException("Some photos do not exist");
        }

        FootprintLocation targetLocation = ensureLocation(country, province, city, addressDetail);
        int boundCount = 0;
        int reboundCount = 0;
        int skippedCount = 0;
        Set<Long> affectedLocationIds = new HashSet<>();
        affectedLocationIds.add(targetLocation.getId());

        for (FootprintPhoto photo : photos) {
            FootprintLocation current = photo.getLocation();
            if (current == null) {
                photo.setLocation(targetLocation);
                boundCount += 1;
                continue;
            }
            if (Objects.equals(current.getId(), targetLocation.getId())) {
                skippedCount += 1;
                continue;
            }
            affectedLocationIds.add(current.getId());
            photo.setLocation(targetLocation);
            reboundCount += 1;
        }
        photoRepository.saveAll(photos);

        for (Long locationId : affectedLocationIds) {
            refreshLocationStats(locationId);
        }

        BindPendingResultDTO result = buildBindResult(targetLocation, boundCount);
        result.setReboundCount(reboundCount);
        result.setSkippedCount(skippedCount);
        return result;
    }

    private LocalDate parseShotAt(String shotAt) {
        if (!StringUtils.hasText(shotAt)) {
            return null;
        }
        try {
            return LocalDate.parse(shotAt.trim());
        } catch (Exception ex) {
            return null;
        }
    }

    private String normalizeKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        return keyword.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeScope(String scope) {
        if (!StringUtils.hasText(scope)) {
            return "PENDING";
        }
        String normalized = scope.trim().toUpperCase(Locale.ROOT);
        if (!"ALL".equals(normalized) && !"PENDING".equals(normalized) && !"BOUND".equals(normalized)) {
            throw new IllegalArgumentException("Invalid scope, expected ALL | PENDING | BOUND");
        }
        return normalized;
    }

    private String normalizeAddressValue(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private FootprintLocation ensureLocation(String country, String province, String city, String addressDetail) {
        String normalizedCountry = StringUtils.hasText(country) ? country.trim() : "\u4E2D\u56FD";
        String normalizedProvince = province == null ? null : province.trim();
        String normalizedCity = city == null ? null : city.trim();
        String normalizedAddressDetail = StringUtils.hasText(addressDetail) ? addressDetail.trim() : null;
        if (normalizedAddressDetail == null) {
            Optional<FootprintLocation> legacy = locationRepository.findByProvinceAndCity(normalizedProvince, normalizedCity);
            if (legacy.isPresent()) {
                FootprintLocation legacyLocation = legacy.get();
                if (!StringUtils.hasText(legacyLocation.getAddressDetail())
                        && (!StringUtils.hasText(legacyLocation.getCountry()) || Objects.equals(normalizedCountry, legacyLocation.getCountry()))) {
                    legacyLocation.setCountry(normalizedCountry);
                    return locationRepository.save(legacyLocation);
                }
            }
        }
        return locationRepository.findByCountryAndProvinceAndCityAndAddressDetail(
                        normalizedCountry,
                        normalizedProvince,
                        normalizedCity,
                        normalizedAddressDetail
                )
                .orElseGet(() -> {
                    FootprintLocation location = new FootprintLocation();
                    location.setCountry(normalizedCountry);
                    location.setProvince(normalizedProvince);
                    location.setCity(normalizedCity);
                    location.setAddressDetail(normalizedAddressDetail);
                    location.setVisitCount(1);
                    location.setPhotoCount(0);
                    location.setLastVisited(LocalDate.now());
                    return locationRepository.save(location);
                });
    }

    private void refreshLocationStats(Long locationId) {
        if (locationId == null) {
            return;
        }
        FootprintLocation location = locationRepository.findById(locationId).orElse(null);
        if (location == null) {
            return;
        }
        List<FootprintPhoto> photos = photoRepository.findByLocationId(locationId);
        location.setPhotoCount(photos.size());
        LocalDate latestShotAt = photos.stream()
                .map(FootprintPhoto::getShotAt)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
        if (latestShotAt != null) {
            location.setLastVisited(latestShotAt);
        } else if (photos.isEmpty()) {
            location.setLastVisited(null);
        }
        if (!StringUtils.hasText(location.getCountry())) {
            location.setCountry("\u4E2D\u56FD");
        }
        if (location.getVisitCount() == null || location.getVisitCount() <= 0) {
            location.setVisitCount(1);
        }
        if (!StringUtils.hasText(location.getCountry())) {
            location.setCountry("\u4E2D\u56FD");
        }
        locationRepository.save(location);
    }

    private String buildFullAddress(String country, String province, String city, String addressDetail) {
        return Stream.of(country, province, city, addressDetail)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining(" · "));
    }

    private List<FootprintPhoto> getPendingPhotosForBinding(List<Long> photoIds) {
        if (photoIds == null || photoIds.isEmpty()) {
            throw new IllegalArgumentException("photoIds cannot be empty");
        }
        List<Long> uniqueIds = photoIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        if (uniqueIds.isEmpty()) {
            throw new IllegalArgumentException("photoIds cannot be empty");
        }

        List<FootprintPhoto> photos = photoRepository.findByIdIn(uniqueIds);
        if (photos.size() != uniqueIds.size()) {
            throw new IllegalArgumentException("Some photos do not exist");
        }
        for (FootprintPhoto photo : photos) {
            if (photo.getLocation() != null) {
                throw new IllegalArgumentException("Some photos are already bound");
            }
        }
        return photos;
    }

    private void bindPhotosToLocation(List<FootprintPhoto> photos, FootprintLocation location) {
        LocalDate maxShotAt = null;
        for (FootprintPhoto photo : photos) {
            photo.setLocation(location);
            if (photo.getShotAt() != null && (maxShotAt == null || photo.getShotAt().isAfter(maxShotAt))) {
                maxShotAt = photo.getShotAt();
            }
        }
        photoRepository.saveAll(photos);

        List<FootprintPhoto> allPhotos = photoRepository.findByLocationId(location.getId());
        location.setPhotoCount(allPhotos.size());
        if (maxShotAt != null) {
            if (location.getLastVisited() == null || maxShotAt.isAfter(location.getLastVisited())) {
                location.setLastVisited(maxShotAt);
            }
        }
        if (location.getVisitCount() == null || location.getVisitCount() <= 0) {
            location.setVisitCount(1);
        }
        locationRepository.save(location);
    }

    private BindPendingResultDTO buildBindResult(FootprintLocation location, int boundCount) {
        BindPendingResultDTO dto = new BindPendingResultDTO();
        dto.setBoundCount(boundCount);
        dto.setReboundCount(0);
        dto.setSkippedCount(0);
        dto.setLocationId(location.getId());
        dto.setCountry(location.getCountry());
        dto.setProvince(location.getProvince());
        dto.setCity(location.getCity());
        dto.setAddressDetail(location.getAddressDetail());
        dto.setFullAddress(buildFullAddress(location.getCountry(), location.getProvince(), location.getCity(), location.getAddressDetail()));
        return dto;
    }

    private Comparator<TravelJourney> byTimelineOrder() {
        return Comparator
                .comparing((TravelJourney j) -> Optional.ofNullable(j.getStartDate()).orElse(LocalDate.MIN))
                .reversed()
                .thenComparing(j -> Optional.ofNullable(j.getId()).orElse(0L), Comparator.reverseOrder());
    }

    private boolean isInYear(TravelJourney journey, Integer year) {
        if (journey.getStartDate() != null) {
            return journey.getStartDate().getYear() == year;
        }
        if (journey.getEndDate() != null) {
            return journey.getEndDate().getYear() == year;
        }
        return false;
    }

    private boolean containsKeyword(TravelJourney journey, String keyword) {
        String title = normalize(journey.getTitle());
        String summary = normalize(journey.getSummary());
        String content = normalize(journey.getContent());
        return title.contains(keyword) || summary.contains(keyword) || content.contains(keyword);
    }

    private boolean containsTag(String tags, String tag) {
        if (!StringUtils.hasText(tags)) {
            return false;
        }
        String[] parts = tags.split("[,\\uFF0C]");
        for (String part : parts) {
            if (normalize(part).equals(tag)) {
                return true;
            }
        }
        return normalize(tags).contains(tag);
    }

    private String normalize(String text) {
        return text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be later than end date");
        }
    }

    private void applyJourneyFields(TravelJourney journey, JourneyUpsertRequest request) {
        journey.setTitle(request.getTitle().trim());
        journey.setStartDate(request.getStartDate());
        journey.setEndDate(request.getEndDate());
        journey.setSummary(request.getSummary());
        journey.setContent(request.getContent());
        journey.setTags(request.getTags());
        journey.setCompanions(request.getCompanions());
        journey.setBudgetMin(request.getBudgetMin());
        journey.setBudgetMax(request.getBudgetMax());
        journey.setCoverUrl(request.getCoverUrl());
    }

    private JourneySummaryDTO toSummary(TravelJourney journey) {
        JourneySummaryDTO dto = new JourneySummaryDTO();
        dto.setId(journey.getId());
        dto.setTitle(journey.getTitle());
        dto.setStartDate(journey.getStartDate());
        dto.setEndDate(journey.getEndDate());
        dto.setSummary(journey.getSummary());
        dto.setTags(journey.getTags());
        dto.setCoverUrl(resolveCoverUrl(journey));
        dto.setCities(journey.getLocations().stream()
                .map(FootprintLocation::getCity)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList()));
        dto.setPhotoCount(journey.getLocations().stream()
                .mapToLong(location -> Optional.ofNullable(location.getPhotoCount()).orElse(0))
                .sum());
        return dto;
    }

    private JourneyDetailDTO toDetail(TravelJourney journey) {
        JourneyDetailDTO dto = new JourneyDetailDTO();
        JourneySummaryDTO summary = toSummary(journey);
        dto.setId(summary.getId());
        dto.setTitle(summary.getTitle());
        dto.setStartDate(summary.getStartDate());
        dto.setEndDate(summary.getEndDate());
        dto.setSummary(summary.getSummary());
        dto.setTags(summary.getTags());
        dto.setCoverUrl(summary.getCoverUrl());
        dto.setCities(summary.getCities());
        dto.setPhotoCount(summary.getPhotoCount());
        dto.setContent(journey.getContent());
        dto.setCompanions(journey.getCompanions());
        dto.setBudgetMin(journey.getBudgetMin());
        dto.setBudgetMax(journey.getBudgetMax());
        dto.setLocations(journey.getLocations().stream()
                .sorted(Comparator.comparing(FootprintLocation::getLastVisited, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toLocation)
                .collect(Collectors.toList()));
        dto.setPhotos(journey.getLocations().stream()
                .flatMap(location -> location.getPhotos().stream().map(photo -> toJourneyPhoto(photo, location)))
                .sorted(Comparator.comparing(JourneyPhotoDTO::getShotAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList()));
        return dto;
    }

    private JourneyLocationDTO toLocation(FootprintLocation location) {
        JourneyLocationDTO dto = new JourneyLocationDTO();
        dto.setId(location.getId());
        dto.setProvince(location.getProvince());
        dto.setCity(location.getCity());
        dto.setVisitCount(location.getVisitCount());
        dto.setPhotoCount(location.getPhotoCount());
        dto.setLastVisited(location.getLastVisited());
        dto.setCoverUrl(location.getCoverUrl());
        return dto;
    }

    private PendingAssetPhotoDTO toPendingPhoto(FootprintPhoto photo) {
        PendingAssetPhotoDTO dto = new PendingAssetPhotoDTO();
        dto.setPhotoId(photo.getId());
        dto.setUrl(photo.getUrl());
        dto.setShotAt(photo.getShotAt());
        dto.setUploadedAt(photo.getCreatedAt());
        dto.setNote(photo.getNote());
        dto.setTags(photo.getTags());
        FootprintLocation location = photo.getLocation();
        dto.setBound(location != null);
        if (location != null) {
            dto.setLocationId(location.getId());
            dto.setCountry(location.getCountry());
            dto.setProvince(location.getProvince());
            dto.setCity(location.getCity());
            dto.setAddressDetail(location.getAddressDetail());
            dto.setFullAddress(buildFullAddress(location.getCountry(), location.getProvince(), location.getCity(), location.getAddressDetail()));
        } else {
            dto.setFullAddress(null);
        }
        return dto;
    }

    private JourneyPhotoDTO toJourneyPhoto(FootprintPhoto photo, FootprintLocation location) {
        JourneyPhotoDTO dto = new JourneyPhotoDTO();
        dto.setId(photo.getId());
        dto.setUrl(photo.getUrl());
        dto.setShotAt(photo.getShotAt());
        dto.setTrip(photo.getTrip());
        dto.setNote(photo.getNote());
        dto.setTags(photo.getTags());
        dto.setCover(photo.getCover());
        dto.setProvince(location.getProvince());
        dto.setCity(location.getCity());
        return dto;
    }

    private String resolveCoverUrl(TravelJourney journey) {
        if (StringUtils.hasText(journey.getCoverUrl())) {
            return journey.getCoverUrl();
        }
        for (FootprintLocation location : journey.getLocations()) {
            if (StringUtils.hasText(location.getCoverUrl())) {
                return location.getCoverUrl();
            }
            Optional<FootprintPhoto> coverPhoto = location.getPhotos().stream()
                    .filter(photo -> Boolean.TRUE.equals(photo.getCover()))
                    .findFirst();
            if (coverPhoto.isPresent()) {
                return coverPhoto.get().getUrl();
            }
        }
        return null;
    }
}
