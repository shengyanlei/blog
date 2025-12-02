package com.blog.service;

import com.blog.dto.dashboard.DashboardStatsDTO;

/**
 * Dashboard服务接口
 */
public interface DashboardService {

    /**
     * 获取统计信息
     * 
     * @return 统计数据
     */
    DashboardStatsDTO getStatistics();
}
