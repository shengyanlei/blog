package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.dashboard.DashboardStatsDTO;
import com.blog.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getStatistics() {
        DashboardStatsDTO stats = dashboardService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
