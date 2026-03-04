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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDTO>>> getComments(@PathVariable Long articleId) {
        List<CommentDTO> comments = commentService.getCommentsByArticleId(articleId);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }

    @PostMapping("/articles/{articleId}/comments")
    public ResponseEntity<ApiResponse<CommentDTO>> createComment(
            @PathVariable Long articleId,
            @Valid @RequestBody CommentCreateRequest request) {
        CommentDTO comment = commentService.createComment(articleId, request);
        return ResponseEntity.ok(ApiResponse.success("Comment created", comment));
    }

    @DeleteMapping("/comments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/comments/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','OWNER')")
    public ResponseEntity<ApiResponse<Void>> approveComment(@PathVariable Long id) {
        commentService.approveComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
