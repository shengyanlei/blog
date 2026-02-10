package com.blog.entity;

import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Notion OAuth connection.
 */
@Entity
@Table(name = "notion_connections", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
@Data
@EntityListeners(AuditingEntityListener.class)
public class NotionConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "access_token", nullable = false, length = 500)
    private String accessToken;

    @Column(name = "workspace_id", length = 100)
    private String workspaceId;

    @Column(name = "workspace_name", length = 200)
    private String workspaceName;

    @Column(name = "bot_id", length = 100)
    private String botId;

    @Column(name = "owner_type", length = 50)
    private String ownerType;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
