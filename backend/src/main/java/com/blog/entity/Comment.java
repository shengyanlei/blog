package com.blog.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;

/**
 * 评论实体
 */
@Entity
@Table(name = "comments")
@Data
@EntityListeners(AuditingEntityListener.class)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "评论内容不能为空")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @NotBlank(message = "作者名称不能为空")
    @Column(name = "author_name", nullable = false, length = 50)
    private String authorName;

    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, APPROVED, SPAM

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 多对一：评论 -> 文章
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private Article article;

    // 自关联：父评论
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;
}
