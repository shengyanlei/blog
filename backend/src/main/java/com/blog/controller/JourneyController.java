package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.travel.*;
import org.springframework.data.domain.Page;
import com.blog.service.TravelJourneyService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/journeys")
public class JourneyController {

    private final TravelJourneyService travelJourneyService;

    public JourneyController(TravelJourneyService travelJourneyService) {
        this.travelJourneyService = travelJourneyService;
    }

    @GetMapping
    public ApiResponse<List<JourneySummaryDTO>> list(
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "tag", required = false) String tag
    ) {
        return ApiResponse.success(travelJourneyService.getJourneys(year, keyword, tag));
    }

    @GetMapping("/years")
    public ApiResponse<List<Integer>> years() {
        return ApiResponse.success(travelJourneyService.getJourneyYears());
    }

    @GetMapping("/{id}")
    public ApiResponse<JourneyDetailDTO> detail(@PathVariable Long id) {
        return ApiResponse.success(travelJourneyService.getJourneyDetail(id));
    }

    @PostMapping
    public ApiResponse<JourneyDetailDTO> create(@RequestBody JourneyUpsertRequest request) {
        return ApiResponse.success(travelJourneyService.createJourney(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<JourneyDetailDTO> update(@PathVariable Long id, @RequestBody JourneyUpsertRequest request) {
        return ApiResponse.success(travelJourneyService.updateJourney(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        travelJourneyService.deleteJourney(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/locations:link")
    public ApiResponse<JourneyDetailDTO> linkLocations(@PathVariable Long id, @RequestBody LinkLocationsRequest request) {
        return ApiResponse.success(travelJourneyService.linkLocations(id, request));
    }

    @DeleteMapping("/{id}/locations/{locationId}")
    public ApiResponse<JourneyDetailDTO> unlinkLocation(@PathVariable Long id, @PathVariable Long locationId) {
        return ApiResponse.success(travelJourneyService.unlinkLocation(id, locationId));
    }

    @GetMapping("/assets/unassigned")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<UnassignedLocationAssetDTO>> unassignedAssets() {
        return ApiResponse.success(travelJourneyService.getUnassignedAssets());
    }

    @PostMapping("/assets/upload")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<PendingAssetPhotoDTO>> uploadAssets(@RequestParam("files") MultipartFile[] files) {
        return ApiResponse.success(travelJourneyService.uploadPendingAssets(files));
    }

    @GetMapping("/assets/pending")
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

    @PostMapping("/assets/pending/bind-address")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToAddress(@RequestBody BindPendingToAddressRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToAddress(request));
    }

    @Deprecated
    @PostMapping("/assets/pending/bind-plan")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToPlan(@RequestBody BindPendingToPlanRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToPlan(request));
    }

    @Deprecated
    @PostMapping("/assets/pending/bind-journey")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<BindPendingResultDTO> bindPendingToJourney(@RequestBody BindPendingToJourneyRequest request) {
        return ApiResponse.success(travelJourneyService.bindPendingAssetsToJourney(request));
    }
}
