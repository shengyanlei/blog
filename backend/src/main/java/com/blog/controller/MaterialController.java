package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.travel.*;
import com.blog.service.TravelJourneyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final TravelJourneyService travelJourneyService;

    @GetMapping("/unassigned")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<UnassignedLocationAssetDTO>> unassignedAssets() {
        return ApiResponse.success(travelJourneyService.getUnassignedAssets());
    }

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<PendingAssetPhotoDTO>> uploadAssets(@RequestParam("files") MultipartFile[] files) {
        return ApiResponse.success(travelJourneyService.uploadPendingAssets(files));
    }

    @GetMapping("/pending")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Page<PendingAssetPhotoDTO>> pendingAssets(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "24") int size,
            @RequestParam(value = "scope", defaultValue = "PENDING") String scope,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "hasShotAt", required = false) Boolean hasShotAt
    ) {
        return ApiResponse.success(travelJourneyService.getPendingAssets(page, size, scope, keyword, month, hasShotAt));
    }

    @PostMapping("/pending/bind-address")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToAddress(@RequestBody BindPendingToAddressRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToAddress(request));
    }

    @Deprecated
    @PostMapping("/pending/bind-plan")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToPlan(@RequestBody BindPendingToPlanRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToPlan(request));
    }

    @Deprecated
    @PostMapping("/pending/bind-journey")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToJourney(@RequestBody BindPendingToJourneyRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToJourney(request));
    }

    @DeleteMapping("/{photoId}")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> deleteMaterial(@PathVariable Long photoId) {
        travelJourneyService.deleteMaterial(photoId);
        return ApiResponse.success();
    }
}
