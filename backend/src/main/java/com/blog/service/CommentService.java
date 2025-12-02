package com.blog.service;

import com.blog.dto.comment.CommentCreateRequest;
import com.blog.dto.comment.CommentDTO;

import java.util.List;

/**
 * 评论服务接口
 */
public interface CommentService {

    /**
     * 获取文章的所有已批准评论
     */
    List<CommentDTO> getApprovedCommentsByArticleId(Long articleId);

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
