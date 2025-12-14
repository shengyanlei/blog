package com.blog.dto.comment;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * Comment creation request DTO.
 */
@Data
public class CommentCreateRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private String authorName;

    private String email;

    private Long parentId;
}
