package com.blog.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * 文章实体
 */
@Entity
@Table(name = "articles")
@Data
@EntityListeners(AuditingEntityListener.class)
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "标题不能为空")
    @Column(nullable = false, length = 255)
    private String title;

    @NotBlank(message = "Slug不能为空")
    @Column(unique = true, nullable = false, length = 255)
    private String slug;

    @NotBlank(message = "内容不能为空")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 500)
    private String summary;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT"; // DRAFT, PUBLISHED

    @Column(nullable = false)
    private Long views = 0L;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 多对一：文章 -> 用户
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // 多对一：文章 -> 分类
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    // 多对多：文章 -> 标签
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "article_tags", joinColumns = @JoinColumn(name = "article_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();
}
