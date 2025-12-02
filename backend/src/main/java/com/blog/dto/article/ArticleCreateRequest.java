package com.blog.dto.article;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import java.util.Set;

/**
 * 文章创建请求DTO
 */
@Data
public class ArticleCreateRequest {

    @NotBlank(message = "标题不能为空")
    private String title;

    @NotBlank(message = "Slug不能为空")
    private String slug;

    @NotBlank(message = "内容不能为空")
    private String content;

    private String summary;

    private Long categoryId;

    private Set<Long> tagIds;
}
