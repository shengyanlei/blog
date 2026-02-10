package com.blog.dto.article;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.util.Set;

/**
 * Notion import request.
 */
@Data
public class NotionImportRequest {

    @NotBlank(message = "Notion 分享链接不能为空")
    private String shareUrl;

    /**
     * AUTO | INTEGRATION | OAUTH | PUBLIC
     */
    private String authMode;

    /**
     * Optional token override for current request only.
     */
    private String tokenOverride;

    private String titleOverride;

    private String summaryOverride;

    private Long categoryId;

    private Set<Long> tagIds;

    private Boolean publish;
}