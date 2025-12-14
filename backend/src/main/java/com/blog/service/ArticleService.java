package com.blog.service;

import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 文章服务接口
 */
public interface ArticleService {

    /**
     * 获取已发布的文章列表（分页）
     */
    Page<ArticleSummaryDTO> getPublishedArticles(Pageable pageable);

    /**
     * 根据分类获取已发布的文章（分页）
     */
    Page<ArticleSummaryDTO> getPublishedArticlesByCategory(Long categoryId, Pageable pageable);

    /**
     * 获取全部文章（管理端）
     */
    Page<ArticleSummaryDTO> getAllArticles(Pageable pageable);

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
     * 创建文章
     */
    Long createArticle(ArticleCreateRequest request, String username);

    /**
     * 更新文章
     */
    void updateArticle(Long id, ArticleUpdateRequest request);

    /**
     * 删除文章
     */
    void deleteArticle(Long id);

    /**
     * 发布/取消发布文章
     */
    void publishArticle(Long id, boolean publish);
}
