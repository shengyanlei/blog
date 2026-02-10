package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;
import com.blog.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

/**
 * 评论控制器
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /**
     * 获取文章评论
     */
    @GetMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDTO>>> getComments(@PathVariable Long articleId) {
        List<CommentDTO> comments = commentService.getCommentsByArticleId(articleId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    /**
     * 发布评论
     */
    @PostMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(
            @PathVariable Long articleId,
            @Valid @RequestBody CommentCreateRequest request) {
        CommentDTO comment = commentService.createComment(articleId, request);
        return ResponseEntity.ok(ApiResponse.success("评论已发布", comment));
    }

    /**
     * 删除评论 (仅管理员)
     */
    @DeleteMapping("/comments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /**
     * 批准评论 (仅管理员)
     */
    @PostMapping("/comments/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> approveComment(@PathVariable Long id) {
        commentService.approveComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
