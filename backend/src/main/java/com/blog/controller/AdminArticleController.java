package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.article.ArticleSummaryDTO;
import com.blog.dto.article.NotionImportPreviewResponse;
import com.blog.dto.article.NotionImportRequest;
import com.blog.service.NotionImportService;
import com.blog.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

/**
 * Admin article controller.
 */
@RestController
@RequestMapping("/api/admin/articles")
@RequiredArgsConstructor
public class AdminArticleController {

    private final ArticleService articleService;
    private final NotionImportService notionImportService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<ArticleSummaryDTO>>> getAllArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ArticleSummaryDTO> articles = articleService.getAllArticles(pageable);
        return ResponseEntity.ok(ApiResponse.success(articles));
    }

    @PostMapping("/import-notion/preview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotionImportPreviewResponse>> previewNotion(
            @Valid @RequestBody NotionImportRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        NotionImportPreviewResponse preview = notionImportService.preview(request, username);
        return ResponseEntity.ok(ApiResponse.success(preview));
    }

    @PostMapping("/import-notion")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Long>> importNotion(
            @Valid @RequestBody NotionImportRequest request,
            Authentication authentication) {
        String username = authentication.getName();
        Long articleId = notionImportService.importFromShareUrl(request, username);
        return ResponseEntity.ok(ApiResponse.success(articleId));
    }
}
