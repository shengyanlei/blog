package com.blog.service.impl;

import com.blog.dto.dashboard.DashboardStatsDTO;
import com.blog.entity.Article;
import com.blog.repository.ArticleRepository;
import com.blog.repository.CommentRepository;
import com.blog.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dashboard服务实现类
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardServiceImpl implements DashboardService {

    private final ArticleRepository articleRepository;
    private final CommentRepository commentRepository;

    @Override
    public DashboardStatsDTO getStatistics() {
        log.info("获取Dashboard统计信息");

        DashboardStatsDTO stats = new DashboardStatsDTO();

        // 文章统计
        long totalArticles = articleRepository.count();
        long publishedArticles = articleRepository.countByStatus("PUBLISHED");
        long draftArticles = articleRepository.countByStatus("DRAFT");

        stats.setTotalArticles(totalArticles);
        stats.setPublishedArticles(publishedArticles);
        stats.setDraftArticles(draftArticles);

        // 评论统计
        long totalComments = commentRepository.count();
        long pendingComments = commentRepository.countByStatus("PENDING");

        stats.setTotalComments(totalComments);
        stats.setPendingComments(pendingComments);

        // 浏览量统计
        Long totalViews = articleRepository.getTotalViews();
        stats.setTotalViews(totalViews != null ? totalViews : 0L);

        // 分类统计
        List<Object[]> categoryData = articleRepository.countArticlesByCategory();
        Map<String, Long> categoryStats = new HashMap<>();
        for (Object[] row : categoryData) {
            String categoryName = (String) row[0];
            Long count = (Long) row[1];
            categoryStats.put(categoryName, count);
        }
        stats.setCategoryStats(categoryStats);

        // 热门文章（前10篇）
        Page<Article> topArticlesPage = articleRepository.findTopArticlesByViews(
                PageRequest.of(0, 10));

        List<DashboardStatsDTO.TopArticleDTO> topArticles = topArticlesPage.getContent().stream()
                .map(article -> new DashboardStatsDTO.TopArticleDTO(
                        article.getId(),
                        article.getTitle(),
                        article.getViews()))
                .collect(Collectors.toList());

        stats.setTopArticles(topArticles);

        log.info("统计信息获取完成: 文章{}篇, 评论{}条, 浏览量{}", totalArticles, totalComments, totalViews);

        return stats;
    }
}
