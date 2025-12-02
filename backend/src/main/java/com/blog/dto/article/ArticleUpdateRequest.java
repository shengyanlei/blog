package com.blog.dto.article;

import lombok.Data;

import java.util.Set;

/**
 * 文章更新请求DTO
 */
@Data
public class ArticleUpdateRequest {

    private String title;
    private String slug;
    private String content;
    private String summary;
    private Long categoryId;
    private Set<Long> tagIds;
}
