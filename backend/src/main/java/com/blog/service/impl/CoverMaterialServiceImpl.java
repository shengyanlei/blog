package com.blog.service.impl;

import com.blog.dto.travel.CoverMaterialDTO;
import com.blog.entity.FootprintPhoto;
import com.blog.exception.BusinessException;
import com.blog.repository.ArticleRepository;
import com.blog.repository.FootprintPhotoRepository;
import com.blog.service.CoverMaterialService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CoverMaterialServiceImpl implements CoverMaterialService {

    private static final String COVER_MATERIAL_SOURCE = FootprintPhoto.SOURCE_TYPE_COVER_MATERIAL;

    private final FootprintPhotoRepository footprintPhotoRepository;
    private final ArticleRepository articleRepository;

    public CoverMaterialServiceImpl(
            FootprintPhotoRepository footprintPhotoRepository,
            ArticleRepository articleRepository
    ) {
        this.footprintPhotoRepository = footprintPhotoRepository;
        this.articleRepository = articleRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CoverMaterialDTO> getCoverMaterials(int page, int size, Long photoId) {
        int pageNumber = Math.max(page, 0);
        int pageSize = Math.min(Math.max(size, 1), 100);

        List<FootprintPhoto> photos = footprintPhotoRepository.findBySourceTypeOrderByCreatedAtDescIdDesc(COVER_MATERIAL_SOURCE);
        if (photoId != null) {
            photos = photos.stream()
                    .filter(photo -> photoId.equals(photo.getId()))
                    .collect(Collectors.toList());
        }

        int fromIndex = pageNumber * pageSize;
        if (fromIndex >= photos.size()) {
            return new PageImpl<>(List.of(), PageRequest.of(pageNumber, pageSize), photos.size());
        }

        Set<Long> usedPhotoIds = new HashSet<>(articleRepository.findDistinctCoverPhotoIds());
        int toIndex = Math.min(fromIndex + pageSize, photos.size());
        List<CoverMaterialDTO> content = photos.subList(fromIndex, toIndex).stream()
                .map(photo -> toCoverMaterial(photo, usedPhotoIds.contains(photo.getId())))
                .collect(Collectors.toList());

        return new PageImpl<>(content, PageRequest.of(pageNumber, pageSize), photos.size());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CoverMaterialDTO> recommendCoverMaterials(int size, Long photoId) {
        int limit = Math.max(1, Math.min(size, 100));
        List<FootprintPhoto> candidates = footprintPhotoRepository.findBySourceTypeOrderByCreatedAtDescIdDesc(COVER_MATERIAL_SOURCE);
        if (candidates.isEmpty()) {
            return List.of();
        }

        Set<Long> usedPhotoIds = new HashSet<>(articleRepository.findDistinctCoverPhotoIds());
        List<CoverMaterialDTO> result = new ArrayList<>();

        if (photoId != null) {
            candidates.stream()
                    .filter(candidate -> photoId.equals(candidate.getId()))
                    .findFirst()
                    .map(candidate -> toCoverMaterial(candidate, usedPhotoIds.contains(candidate.getId())))
                    .ifPresent(result::add);
        }

        candidates.stream()
                .filter(candidate -> photoId == null || !photoId.equals(candidate.getId()))
                .sorted(Comparator
                        .comparing((FootprintPhoto candidate) -> usedPhotoIds.contains(candidate.getId()))
                        .thenComparing(FootprintPhoto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(FootprintPhoto::getId, Comparator.reverseOrder()))
                .limit(Math.max(0, limit - result.size()))
                .map(candidate -> toCoverMaterial(candidate, usedPhotoIds.contains(candidate.getId())))
                .forEach(result::add);

        return result;
    }

    @Override
    @Transactional
    public List<CoverMaterialDTO> uploadCoverMaterials(MultipartFile[] files) {
        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("No files uploaded");
        }
        if (files.length > 50) {
            throw new IllegalArgumentException("At most 50 files are allowed per upload");
        }

        List<CoverMaterialDTO> result = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            FootprintPhoto photo = new FootprintPhoto();
            photo.setUrl(storeFile(file));
            photo.setSourceType(COVER_MATERIAL_SOURCE);
            FootprintPhoto saved = footprintPhotoRepository.save(photo);
            result.add(toCoverMaterial(saved, false));
        }
        return result;
    }

    @Override
    @Transactional
    public void deleteCoverMaterial(Long photoId) {
        FootprintPhoto photo = footprintPhotoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Cover material not found"));
        if (!COVER_MATERIAL_SOURCE.equals(photo.getSourceType())) {
            throw new IllegalArgumentException("Cover material not found");
        }
        if (articleRepository.existsByCoverPhotoId(photoId)) {
            throw new BusinessException("Material is referenced by article cover", HttpStatus.CONFLICT);
        }
        footprintPhotoRepository.delete(photo);
    }

    private String storeFile(MultipartFile file) {
        try {
            String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString().replace("-", "");
            if (StringUtils.hasText(extension)) {
                filename = filename + "." + extension;
            }
            Path uploadDir = Paths.get("uploads/cover-materials");
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/cover-materials/" + filename;
        } catch (IOException ex) {
            throw new RuntimeException("Upload failed: " + ex.getMessage(), ex);
        }
    }

    private CoverMaterialDTO toCoverMaterial(FootprintPhoto photo, boolean usedAsCover) {
        CoverMaterialDTO dto = new CoverMaterialDTO();
        dto.setPhotoId(photo.getId());
        dto.setUrl(photo.getUrl());
        dto.setUploadedAt(photo.getCreatedAt());
        dto.setUsedAsCover(usedAsCover);
        return dto;
    }
}

