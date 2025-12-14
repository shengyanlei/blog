package com.blog.controller;

import com.blog.common.ApiResponse;
import com.blog.dto.comment.CommentDTO;
import com.blog.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理端评论管理接口。
 */
@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminCommentController {

    private final CommentService commentService;

    /**
     * 分页获取评论，支持按状态筛选。
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommentDTO>>> listComments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<CommentDTO> comments = commentService.getComments(status, pageable);
        return ResponseEntity.ok(ApiResponse.success(comments));
    }
}
