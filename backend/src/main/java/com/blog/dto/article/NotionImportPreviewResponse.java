package com.blog.dto.article;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Notion import preview response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotionImportPreviewResponse {

    private String title;

    private String summary;

    private String content;
}