package com.blog.repository;

import com.blog.entity.Article;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 文章Repository
 */
@Repository
public interface ArticleRepository extends JpaRepository<Article, Long>, JpaSpecificationExecutor<Article> {

    /**
     * 根据Slug查找文章
     */
    Optional<Article> findBySlug(String slug);

    /**
     * 查找已发布的文章（分页）
     * 使用@EntityGraph避免N+1问题
     */
    @EntityGraph(attributePaths = { "user", "category", "tags" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' ORDER BY a.publishedAt DESC")
    Page<Article> findPublishedArticles(Pageable pageable);

    /**
     * 根据分类ID查找已发布的文章（分页）
     */
    @EntityGraph(attributePaths = { "user", "category", "tags" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' AND a.category.id = :categoryId ORDER BY a.publishedAt DESC")
    Page<Article> findPublishedArticlesByCategory(@Param("categoryId") Long categoryId, Pageable pageable);

    /**
     * 搜索已发布的文章（标题或内容包含关键词）
     */
    @EntityGraph(attributePaths = { "user", "category", "tags" })
    @Query("SELECT a FROM Article a WHERE a.status = 'PUBLISHED' AND (a.title LIKE %:keyword% OR a.content LIKE %:keyword%) ORDER BY a.publishedAt DESC")
    Page<Article> searchPublishedArticles(@Param("keyword") String keyword, Pageable pageable);

    /**
     * 根据ID查找文章并加载关联实体
     */
    @EntityGraph(attributePaths = { "user", "category", "tags" })
    Optional<Article> findWithDetailsById(Long id);
}
