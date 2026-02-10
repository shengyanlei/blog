package com.blog.service;

import com.blog.dto.article.NotionImportPreviewResponse;
import com.blog.dto.article.NotionImportRequest;

/**
 * Notion import service.
 */
public interface NotionImportService {

    NotionImportPreviewResponse preview(NotionImportRequest request, String username);

    Long importFromShareUrl(NotionImportRequest request, String username);
}