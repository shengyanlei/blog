package com.blog.repository;

import com.blog.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Comment repository
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * 根据文章ID查询评论（包含待审核），按时间倒序
     */
    List<Comment> findByArticleIdOrderByCreatedAtDesc(Long articleId);

    /**
     * 统计指定状态评论数量
     */
    long countByStatus(String status);

    /**
     * 根据文章ID删除评论
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
