package com.blog.service;

import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 评论服务接口
 */
public interface CommentService {

    /**
     * 获取文章的所有评论（按时间倒序）
     */
    List<CommentDTO> getCommentsByArticleId(Long articleId);

    /**
     * 管理端按状态分页获取评论，status 为空则查询全部
     */
    Page<CommentDTO> getComments(String status, Pageable pageable);

    /**
     * 创建评论
     */
    CommentDTO createComment(Long articleId, CommentCreateRequest request);

    /**
     * 删除评论 (管理员)
     */
    void deleteComment(Long commentId);

    /**
     * 批准评论 (管理员)
     */
    void approveComment(Long commentId);
}
