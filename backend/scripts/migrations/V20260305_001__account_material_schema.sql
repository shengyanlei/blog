-- Account permission + article cover material schema migration (MySQL 5.7+)
-- Safe to run repeatedly.

START TRANSACTION;

ALTER TABLE users
    MODIFY COLUMN role VARCHAR(20) NOT NULL;

SET @has_users_enabled_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'enabled'
);
SET @sql_users_enabled_col := IF(
    @has_users_enabled_col = 0,
    'ALTER TABLE users ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1',
    'SELECT 1'
);
PREPARE stmt_users_enabled_col FROM @sql_users_enabled_col;
EXECUTE stmt_users_enabled_col;
DEALLOCATE PREPARE stmt_users_enabled_col;

UPDATE users
SET role = CASE
    WHEN LOWER(username) = 'shyl' THEN 'OWNER'
    ELSE 'MEMBER'
END;

UPDATE users
SET enabled = 1
WHERE enabled IS NULL;

CREATE TABLE IF NOT EXISTS user_tab_permission (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    tab_code VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_tab_permission (user_id, tab_code),
    KEY idx_user_tab_permission_user_id (user_id),
    CONSTRAINT fk_user_tab_permission_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

SET @has_articles_cover_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'articles'
      AND COLUMN_NAME = 'cover_photo_id'
);
SET @sql_articles_cover_col := IF(
    @has_articles_cover_col = 0,
    'ALTER TABLE articles ADD COLUMN cover_photo_id BIGINT NULL',
    'SELECT 1'
);
PREPARE stmt_articles_cover_col FROM @sql_articles_cover_col;
EXECUTE stmt_articles_cover_col;
DEALLOCATE PREPARE stmt_articles_cover_col;

SET @has_cover_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'articles'
      AND INDEX_NAME = 'idx_articles_cover_photo'
);
SET @sql_cover_idx := IF(
    @has_cover_idx = 0,
    'CREATE INDEX idx_articles_cover_photo ON articles(cover_photo_id)',
    'SELECT 1'
);
PREPARE stmt_cover_idx FROM @sql_cover_idx;
EXECUTE stmt_cover_idx;
DEALLOCATE PREPARE stmt_cover_idx;

SET @has_cover_fk := (
    SELECT COUNT(*)
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_articles_cover_photo'
      AND TABLE_NAME = 'articles'
);
SET @sql_cover_fk := IF(
    @has_cover_fk = 0,
    'ALTER TABLE articles ADD CONSTRAINT fk_articles_cover_photo FOREIGN KEY (cover_photo_id) REFERENCES footprint_photo(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt_cover_fk FROM @sql_cover_fk;
EXECUTE stmt_cover_fk;
DEALLOCATE PREPARE stmt_cover_fk;

SET @has_fp_source_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND COLUMN_NAME = 'source_type'
);
SET @sql_fp_source_col := IF(
    @has_fp_source_col = 0,
    'ALTER TABLE footprint_photo ADD COLUMN source_type VARCHAR(30) NOT NULL DEFAULT ''PHOTO_WALL''',
    'SELECT 1'
);
PREPARE stmt_fp_source_col FROM @sql_fp_source_col;
EXECUTE stmt_fp_source_col;
DEALLOCATE PREPARE stmt_fp_source_col;

UPDATE footprint_photo
SET source_type = 'PHOTO_WALL'
WHERE source_type IS NULL OR source_type = '';

SET @has_fp_source_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND INDEX_NAME = 'idx_fp_source_type_created_at'
);
SET @sql_fp_source_idx := IF(
    @has_fp_source_idx = 0,
    'CREATE INDEX idx_fp_source_type_created_at ON footprint_photo(source_type, created_at, id)',
    'SELECT 1'
);
PREPARE stmt_fp_source_idx FROM @sql_fp_source_idx;
EXECUTE stmt_fp_source_idx;
DEALLOCATE PREPARE stmt_fp_source_idx;

CREATE TABLE IF NOT EXISTS article_cover_legacy_archive (
    id BIGINT NOT NULL AUTO_INCREMENT,
    article_id BIGINT NOT NULL,
    article_title VARCHAR(255) NULL,
    article_slug VARCHAR(255) NULL,
    legacy_cover_photo_id BIGINT NOT NULL,
    legacy_cover_url VARCHAR(1024) NULL,
    legacy_source_type VARCHAR(30) NOT NULL,
    archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archive_batch VARCHAR(64) NOT NULL,
    archive_reason VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_article_cover_legacy_article (article_id),
    KEY idx_article_cover_legacy_batch (archive_batch)
);

SET @archive_batch := DATE_FORMAT(NOW(), 'cover-reset-%Y%m%d%H%i%s');
SET @legacy_cover_count := (
    SELECT COUNT(*)
    FROM articles a
    JOIN footprint_photo fp ON fp.id = a.cover_photo_id
    WHERE a.cover_photo_id IS NOT NULL
      AND fp.source_type = 'PHOTO_WALL'
);

INSERT INTO article_cover_legacy_archive (
    article_id,
    article_title,
    article_slug,
    legacy_cover_photo_id,
    legacy_cover_url,
    legacy_source_type,
    archived_at,
    archive_batch,
    archive_reason
)
SELECT
    a.id,
    a.title,
    a.slug,
    fp.id,
    fp.url,
    fp.source_type,
    NOW(),
    @archive_batch,
    'reset-to-cover-material'
FROM articles a
JOIN footprint_photo fp ON fp.id = a.cover_photo_id
WHERE a.cover_photo_id IS NOT NULL
  AND fp.source_type = 'PHOTO_WALL';
SET @archived_count := ROW_COUNT();

UPDATE articles a
JOIN footprint_photo fp ON fp.id = a.cover_photo_id
SET a.cover_photo_id = NULL
WHERE fp.source_type = 'PHOTO_WALL';
SET @cleared_count := ROW_COUNT();

DELETE p
FROM user_tab_permission p
JOIN users u ON u.id = p.user_id
WHERE LOWER(u.username) = 'shyl';

INSERT INTO user_tab_permission (user_id, tab_code, created_at)
SELECT u.id, t.tab_code, NOW()
FROM users u
JOIN (
    SELECT 'DASHBOARD' AS tab_code
    UNION ALL SELECT 'ARTICLES'
    UNION ALL SELECT 'WRITE'
    UNION ALL SELECT 'UPLOAD'
    UNION ALL SELECT 'COMMENTS'
    UNION ALL SELECT 'TAGS'
    UNION ALL SELECT 'CATEGORIES'
    UNION ALL SELECT 'COVER_MATERIALS'
    UNION ALL SELECT 'SETTINGS'
    UNION ALL SELECT 'ACCOUNTS'
) t
WHERE LOWER(u.username) = 'shyl';

SELECT
    @archive_batch AS archive_batch,
    @legacy_cover_count AS expected_legacy_rows,
    @archived_count AS archived_rows,
    @cleared_count AS cleared_rows;

SELECT COUNT(*) AS remaining_photo_wall_cover_refs
FROM articles a
JOIN footprint_photo fp ON fp.id = a.cover_photo_id
WHERE fp.source_type = 'PHOTO_WALL';

COMMIT;
