package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;
import com.blog.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class CommentController {

    private final CommentService commentService;

    /**
     * 获取文章评论
     */
    @GetMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDTO>>> getComments(@PathVariable Long articleId) {
        try {
            List<CommentDTO> comments = commentService.getApprovedCommentsByArticleId(articleId);
            return ResponseEntity.ok(ApiResponse.success(comments));
        } catch (Exception e) {
            log.error("获取评论失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 发表评论
     */
    @PostMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(
            @PathVariable Long articleId,
            @Valid @RequestBody CommentCreateRequest request) {
        try {
            CommentDTO comment = commentService.createComment(articleId, request);
            return ResponseEntity.ok(ApiResponse.success("评论已提交，等待审核", comment));
        } catch (Exception e) {
            log.error("发表评论失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 删除评论 (仅管理员)
     */
    @DeleteMapping("/comments/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        try {
            commentService.deleteComment(id);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("删除评论失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 批准评论 (仅管理员)
     */
    @PostMapping("/comments/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> approveComment(@PathVariable Long id) {
        try {
            commentService.approveComment(id);
            return ResponseEntity.ok(ApiResponse.success());
        } catch (Exception e) {
            log.error("批准评论失败: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
