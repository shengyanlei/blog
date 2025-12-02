package com.blog.dto.comment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 评论DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentDTO {

    private Long id;
    private String content;
    private String authorName;
    private String status;
    private LocalDateTime createdAt;
    private Long parentId;
}
