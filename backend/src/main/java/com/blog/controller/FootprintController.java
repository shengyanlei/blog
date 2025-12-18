package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.footprint.*;
import com.blog.service.FootprintService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/footprints")
public class FootprintController {

    private final FootprintService footprintService;

    public FootprintController(FootprintService footprintService) {
        this.footprintService = footprintService;
    }

    @GetMapping("/provinces")
    public ApiResponse<List<ProvinceSummaryDTO>> provinces() {
        return ApiResponse.success(footprintService.getProvinceSummaries());
    }

    @GetMapping("/provinces/{province}/cities")
    public ApiResponse<List<CitySummaryDTO>> cities(@PathVariable String province) {
        return ApiResponse.success(footprintService.getCitiesByProvince(province));
    }

    @GetMapping("/cities/{id}")
    public ApiResponse<CityDetailDTO> cityDetail(@PathVariable Long id) {
        return ApiResponse.success(footprintService.getCityDetail(id));
    }

    @PostMapping
    public ApiResponse<CityDetailDTO> create(@RequestBody CreateFootprintRequest request) {
        return ApiResponse.success(footprintService.createFootprint(request));
    }

    @PostMapping("/{id}/photos")
    public ApiResponse<CityDetailDTO> addPhotos(@PathVariable Long id, @RequestBody AddPhotosRequest request) {
        try {
            return ApiResponse.success(footprintService.addPhotos(id, request));
        } catch (Exception e) {
            return ApiResponse.error("添加照片失败: " + e.getMessage());
        }
    }

    @DeleteMapping("/photos/{photoId}")
    public ApiResponse<Void> deletePhoto(@PathVariable Long photoId) {
        footprintService.deletePhoto(photoId);
        return ApiResponse.success(null);
    }

    @PostMapping("/photos/{photoId}/reassign")
    public ApiResponse<PhotoDTO> reassignPhoto(@PathVariable Long photoId, @RequestBody ReassignPhotoRequest request) {
        return ApiResponse.success(footprintService.reassignPhoto(photoId, request));
    }

    @PutMapping("/photos/{photoId}/note")
    public ApiResponse<PhotoDTO> updatePhotoNote(@PathVariable Long photoId, @RequestBody UpdatePhotoNoteRequest request) {
        return ApiResponse.success(footprintService.updatePhotoNote(photoId, request));
    }

    @PostMapping("/upload")
    public ApiResponse<UploadPhotoResponse> upload(@RequestParam("file") MultipartFile file) {
        return ApiResponse.success(footprintService.uploadAndParseLocation(file));
    }

    @GetMapping("/stats")
    public ApiResponse<FootprintStatsDTO> stats() {
        return ApiResponse.success(footprintService.getStats());
    }
}
