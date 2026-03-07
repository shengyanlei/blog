package com.blog.dto.article;

import com.blog.dto.category.CategoryDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Public archive category group payload.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryArticleGroupDTO {

    private CategoryDTO category;
    private long totalCount;
    private List<ArticleSummaryDTO> articles;
}
