package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import com.blog.dto.article.CategoryArticleGroupDTO;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * Article controller.
 */
@RestController
@RequestMapping("/api/articles")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    /**
     * List published articles with optional category or keyword filter.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ArticleSummaryDTO>>> getArticles(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer featuredLevel,
            @RequestParam(required = false, defaultValue = "false") Boolean excludeFeatured,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ArticleSummaryDTO> articles = articleService.getPublishedArticles(
                keyword,
                categoryId,
                featuredLevel,
                excludeFeatured,
                pageable
        );
        return ResponseEntity.ok(ApiResponse.success(articles));
    }

    /**
     * Group published articles by category for archive landing page.
     */
    @GetMapping("/grouped")
    public ResponseEntity<ApiResponse<java.util.List<CategoryArticleGroupDTO>>> getGroupedArticles(
            @RequestParam(defaultValue = "6") int perCategoryLimit) {
        return ResponseEntity.ok(ApiResponse.success(articleService.getPublishedArticleGroups(perCategoryLimit)));
    }

    /**
     * Get article detail by id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArticleDetailDTO>> getArticleById(@PathVariable Long id) {
        ArticleDetailDTO article = articleService.getArticleById(id);
        return ResponseEntity.ok(ApiResponse.success(article));
    }

    /**
     * Get article detail by slug.
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ArticleDetailDTO>> getArticleBySlug(@PathVariable String slug) {
        ArticleDetailDTO article = articleService.getArticleBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(article));
    }

    /**
     * Create article (admin only).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Long>> createArticle(
            @Valid @RequestBody ArticleCreateRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        Long articleId = articleService.createArticle(request, username);
        return ResponseEntity.ok(ApiResponse.success("创建成功", articleId));
    }

    /**
     * Update article (admin only).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleUpdateRequest request) {
        articleService.updateArticle(id, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * Delete article (admin only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteArticle(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * Publish or unpublish article (admin only).
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> publishArticle(
            @PathVariable Long id,
            @RequestParam boolean publish) {
        articleService.publishArticle(id, publish);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
