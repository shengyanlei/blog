package com.blog.service;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import com.blog.dto.article.CategoryArticleGroupDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 文章服务接口
 */
public interface ArticleService {

    /**
     * 获取已发布的文章列表（分页）
     */
    Page<ArticleSummaryDTO> getPublishedArticles(Pageable pageable);

    /**
     * 获取已发布文章的组合筛选结果（分页）。
     */
    Page<ArticleSummaryDTO> getPublishedArticles(
            String keyword,
            Long categoryId,
            Integer featuredLevel,
            Boolean excludeFeatured,
            Pageable pageable);

    /**
     * 根据分类获取已发布的文章（分页）
     */
    Page<ArticleSummaryDTO> getPublishedArticlesByCategory(Long categoryId, Pageable pageable);

    /**
     * 获取全部文章（管理端）
     */
    Page<ArticleSummaryDTO> getAllArticles(Pageable pageable);

    /**
     * 鎸夊叧閿瘝鑾峰彇绠＄悊绔枃绔犲垪琛ㄣ€?     */
    Page<ArticleSummaryDTO> getAllArticles(String keyword, Pageable pageable);

    /**
     * 按分类分组获取公开文章归档。
     */
    List<CategoryArticleGroupDTO> getPublishedArticleGroups(int perCategoryLimit);

    /**
     * 搜索已发布的文章（分页）
     */
    Page<ArticleSummaryDTO> searchPublishedArticles(String keyword, Pageable pageable);

    /**
     * 获取文章详情
     */
    ArticleDetailDTO getArticleById(Long id);

    /**
     * 根据 slug 获取文章详情
     */
    ArticleDetailDTO getArticleBySlug(String slug);

    /**
     * 管理端按 ID 获取文章详情（不增加浏览量）
     */
    ArticleDetailDTO getArticleDetailForAdmin(Long id);

    /**
     * 创建文章
     */
    Long createArticle(ArticleCreateRequest request, String username);

    /**
     * 更新文章
     */
    void updateArticle(Long id, ArticleUpdateRequest request);

    /**
     * 更新文章精选等级。
     */
    ArticleSummaryDTO updateFeaturedLevel(Long id, int featuredLevel);

    /**
     * 删除文章
     */
    void deleteArticle(Long id);

    /**
     * 发布/取消发布文章
     */
    void publishArticle(Long id, boolean publish);
}
