package com.blog.service;

import com.blog.dto.travel.CoverMaterialDTO;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CoverMaterialService {
    Page<CoverMaterialDTO> getCoverMaterials(int page, int size, Long photoId);

    List<CoverMaterialDTO> recommendCoverMaterials(int size, Long photoId);

    List<CoverMaterialDTO> uploadCoverMaterials(MultipartFile[] files);

    void deleteCoverMaterial(Long photoId);
}
