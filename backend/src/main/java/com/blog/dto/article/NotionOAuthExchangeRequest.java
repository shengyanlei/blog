package com.blog.dto.article;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * Notion OAuth exchange request.
 */
@Data
public class NotionOAuthExchangeRequest {

    @NotBlank(message = "code must not be empty")
    private String code;

    @NotBlank(message = "state must not be empty")
    private String state;
}