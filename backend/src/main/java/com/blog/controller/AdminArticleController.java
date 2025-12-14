package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin article controller.
 */
@RestController
@RequestMapping("/api/admin/articles")
@RequiredArgsConstructor
@Slf4j
public class AdminArticleController {

    private final ArticleService articleService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ArticleSummaryDTO>>> getAllArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<ArticleSummaryDTO> articles = articleService.getAllArticles(pageable);
            return ResponseEntity.ok(ApiResponse.success(articles));
        } catch (Exception e) {
            log.error("Failed to fetch all articles: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
