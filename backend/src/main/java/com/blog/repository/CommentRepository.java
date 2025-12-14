package com.blog.repository;

import com.blog.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 评论Repository
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * 根据文章ID查找所有已批准的评论
     */
    @Query("SELECT c FROM Comment c WHERE c.article.id = :articleId AND c.status = 'APPROVED' ORDER BY c.createdAt DESC")
    List<Comment> findApprovedCommentsByArticleId(@Param("articleId") Long articleId);

    /**
     * 根据文章ID查找所有评论（包含待审核）
     */
    List<Comment> findByArticleIdOrderByCreatedAtDesc(Long articleId);

    /**
     * 统计指定状态的评论数
     */
    long countByStatus(String status);

    /**
     * 根据文章删除评论
     */
    void deleteByArticleId(Long articleId);

    /**
     * 按状态分页查询评论
     */
    Page<Comment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /**
     * 查询全部评论（分页，按时间倒序）
     */
    Page<Comment> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
