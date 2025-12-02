package com.blog.dto.article;

import com.blog.dto.category.CategoryDTO;
import com.blog.dto.tag.TagDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * 文章详情DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArticleDetailDTO {

    private Long id;
    private String title;
    private String slug;
    private String content;
    private String summary;
    private String status;
    private Long views;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private String authorName;
    private CategoryDTO category;
    private Set<TagDTO> tags;
}
