package com.blog.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.util.StringUtils;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "guestbook_entries")
@Data
@EntityListeners(AuditingEntityListener.class)
public class GuestbookEntry {

    public static final String STATUS_APPROVED = "APPROVED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "author_name", nullable = false, length = 60)
    private String authorName;

    @Column(length = 80)
    private String location;

    @NotBlank(message = "content is required")
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    private String status = STATUS_APPROVED;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (!StringUtils.hasText(status)) {
            status = STATUS_APPROVED;
        }
        if (location != null) {
            location = location.trim();
        }
        if (authorName != null) {
            authorName = authorName.trim();
        }
        if (content != null) {
            content = content.trim();
        }
    }
}