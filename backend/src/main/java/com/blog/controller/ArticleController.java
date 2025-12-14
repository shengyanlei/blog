package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.article.ArticleCreateRequest;
import com.blog.dto.article.ArticleDetailDTO;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.ArticleUpdateRequest;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class ArticleController {

    private final ArticleService articleService;

    /**
     * List published articles with optional category or keyword filter.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<ArticleSummaryDTO>>> getArticles(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<ArticleSummaryDTO> articles;

            if (categoryId != null) {
                articles = articleService.getPublishedArticlesByCategory(categoryId, pageable);
            } else if (keyword != null && !keyword.isEmpty()) {
                articles = articleService.searchPublishedArticles(keyword, pageable);
            } else {
                articles = articleService.getPublishedArticles(pageable);
            }

            return ResponseEntity.ok(ApiResponse.success(articles));
        } catch (Exception e) {
            log.error("Failed to fetch article list: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get article detail by id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArticleDetailDTO>> getArticleById(@PathVariable Long id) {
        try {
            ArticleDetailDTO article = articleService.getArticleById(id);
            return ResponseEntity.ok(ApiResponse.success(article));
        } catch (Exception e) {
            log.error("Failed to fetch article detail: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Get article detail by slug.
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ArticleDetailDTO>> getArticleBySlug(@PathVariable String slug) {
        try {
            ArticleDetailDTO article = articleService.getArticleBySlug(slug);
            return ResponseEntity.ok(ApiResponse.success(article));
        } catch (Exception e) {
            log.error("Failed to fetch article detail by slug: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Create article (admin only).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> createArticle(
            @Valid @RequestBody ArticleCreateRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            Long articleId = articleService.createArticle(request, username);
            return ResponseEntity.ok(ApiResponse.success("创建成功", articleId));
        } catch (Exception e) {
            log.error("Failed to create article: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Update article (admin only).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleUpdateRequest request) {
        try {
            articleService.updateArticle(id, request);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("Failed to update article: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Delete article (admin only).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteArticle(@PathVariable Long id) {
        try {
            articleService.deleteArticle(id);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("Failed to delete article: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Publish or unpublish article (admin only).
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> publishArticle(
            @PathVariable Long id,
            @RequestParam boolean publish) {
        try {
            articleService.publishArticle(id, publish);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("Failed to change publish status: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
