package com.blog.dto.article;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Notion OAuth exchange response.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotionOAuthExchangeResponse {

    private String successRedirect;
}