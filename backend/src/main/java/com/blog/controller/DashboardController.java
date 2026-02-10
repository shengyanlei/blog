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

/**
 * Dashboard控制器
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * 获取统计信息 (仅管理员)
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getStatistics() {
        DashboardStatsDTO stats = dashboardService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
