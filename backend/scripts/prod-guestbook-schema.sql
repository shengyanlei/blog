CREATE TABLE IF NOT EXISTS guestbook_entries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    author_name VARCHAR(60) NOT NULL,
    location VARCHAR(80) NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_guestbook_status_created_at (status, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;