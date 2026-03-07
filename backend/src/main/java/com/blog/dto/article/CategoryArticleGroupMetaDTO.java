package com.blog.dto.article;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Internal metadata for building grouped archive responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryArticleGroupMetaDTO {

    private Long categoryId;
    private String categoryName;
    private String categoryDescription;
    private String categorySlugPath;
    private Long parentId;
    private long totalCount;
    private LocalDateTime latestPublishedAt;
}
