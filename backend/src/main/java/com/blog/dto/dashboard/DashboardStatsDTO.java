package com.blog.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Dashboard统计数据DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {

    /**
     * 文章统计
     */
    private Long totalArticles;
    private Long publishedArticles;
    private Long draftArticles;

    /**
     * 评论统计
     */
    private Long totalComments;
    private Long pendingComments;

    /**
     * 浏览量统计
     */
    private Long totalViews;

    /**
     * 分类统计 (分类名 -> 文章数)
     */
    private Map<String, Long> categoryStats;

    /**
     * 热门文章列表
     */
    private List<TopArticleDTO> topArticles;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopArticleDTO {
        private Long id;
        private String title;
        private Long views;
    }
}
