package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.travel.CoverMaterialDTO;
import com.blog.service.CoverMaterialService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/cover-materials")
@RequiredArgsConstructor
public class CoverMaterialController {

    private final CoverMaterialService coverMaterialService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<CoverMaterialDTO>> list(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "24") int size,
            @RequestParam(value = "photoId", required = false) Long photoId
    ) {
        return ApiResponse.success(coverMaterialService.getCoverMaterials(page, size, photoId));
    }

    @GetMapping("/recommendations")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<CoverMaterialDTO>> recommendations(
            @RequestParam(value = "size", defaultValue = "8") int size,
            @RequestParam(value = "photoId", required = false) Long photoId
    ) {
        return ApiResponse.success(coverMaterialService.recommendCoverMaterials(size, photoId));
    }

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<CoverMaterialDTO>> upload(@RequestParam("files") MultipartFile[] files) {
        return ApiResponse.success(coverMaterialService.uploadCoverMaterials(files));
    }

    @DeleteMapping("/{photoId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> delete(@PathVariable Long photoId) {
        coverMaterialService.deleteCoverMaterial(photoId);
        return ApiResponse.success();
    }
}
