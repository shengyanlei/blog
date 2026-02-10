package com.blog.dto.article;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Notion OAuth authorize URL response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotionOAuthUrlResponse {

    private String url;

    private String state;
}