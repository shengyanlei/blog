package com.blog.dto.comment;

import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 评论创建请求DTO
 */
@Data
public class CommentCreateRequest {

    @NotBlank(message = "评论内容不能为空")
    private String content;

    @NotBlank(message = "作者名称不能为空")
    private String authorName;

    private String email;

    private Long parentId;
}
