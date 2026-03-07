package com.blog.dto.article;

import lombok.Data;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotNull;

/**
 * Request payload for updating article featured level.
 */
@Data
public class ArticleFeaturedLevelUpdateRequest {

    @NotNull(message = "featuredLevel 不能为空")
    @Min(value = 0, message = "featuredLevel 只能是 0/1/2")
    @Max(value = 2, message = "featuredLevel 只能是 0/1/2")
    private Integer featuredLevel;
}
