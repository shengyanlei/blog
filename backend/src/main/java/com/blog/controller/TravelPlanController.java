package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.travel.CompleteAndArchiveRequest;
import com.blog.dto.travel.TravelPlanDTO;
import com.blog.dto.travel.TravelPlanStatusUpdateRequest;
import com.blog.dto.travel.TravelPlanUpsertRequest;
import com.blog.service.TravelPlanService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/travel-plans")
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    public TravelPlanController(TravelPlanService travelPlanService) {
        this.travelPlanService = travelPlanService;
    }

    @GetMapping
    public ApiResponse<List<TravelPlanDTO>> list(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "month", required = false) String month
    ) {
        return ApiResponse.success(travelPlanService.getPlans(status, month));
    }

    @PostMapping
    public ApiResponse<TravelPlanDTO> create(@RequestBody TravelPlanUpsertRequest request) {
        return ApiResponse.success(travelPlanService.createPlan(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<TravelPlanDTO> update(@PathVariable Long id, @RequestBody TravelPlanUpsertRequest request) {
        return ApiResponse.success(travelPlanService.updatePlan(id, request));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<TravelPlanDTO> updateStatus(@PathVariable Long id, @RequestBody TravelPlanStatusUpdateRequest request) {
        return ApiResponse.success(travelPlanService.updateStatus(id, request.getStatus()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        travelPlanService.deletePlan(id);
        return ApiResponse.success(null);
    }

    @PostMapping("/{id}/complete-and-archive")
    public ApiResponse<TravelPlanDTO> completeAndArchive(@PathVariable Long id, @RequestBody(required = false) CompleteAndArchiveRequest request) {
        return ApiResponse.success(travelPlanService.completeAndArchive(id, request));
    }
}
