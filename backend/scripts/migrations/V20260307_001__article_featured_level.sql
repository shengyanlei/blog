-- Article featured-level schema migration (MySQL 5.7+)
-- Safe to run repeatedly.

START TRANSACTION;

SET @has_featured_level_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'articles'
      AND COLUMN_NAME = 'featured_level'
);
SET @sql_featured_level_col := IF(
    @has_featured_level_col = 0,
    'ALTER TABLE articles ADD COLUMN featured_level TINYINT NOT NULL DEFAULT 0 AFTER status',
    'SELECT 1'
);
PREPARE stmt_featured_level_col FROM @sql_featured_level_col;
EXECUTE stmt_featured_level_col;
DEALLOCATE PREPARE stmt_featured_level_col;

UPDATE articles
SET featured_level = 0
WHERE featured_level IS NULL;

SET @has_featured_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'articles'
      AND INDEX_NAME = 'idx_articles_status_featured_published_at'
);
SET @sql_featured_idx := IF(
    @has_featured_idx = 0,
    'CREATE INDEX idx_articles_status_featured_published_at ON articles(status, featured_level, published_at, id)',
    'SELECT 1'
);
PREPARE stmt_featured_idx FROM @sql_featured_idx;
EXECUTE stmt_featured_idx;
DEALLOCATE PREPARE stmt_featured_idx;

SET @has_category_published_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'articles'
      AND INDEX_NAME = 'idx_articles_status_category_published_at'
);
SET @sql_category_published_idx := IF(
    @has_category_published_idx = 0,
    'CREATE INDEX idx_articles_status_category_published_at ON articles(status, category_id, published_at, id)',
    'SELECT 1'
);
PREPARE stmt_category_published_idx FROM @sql_category_published_idx;
EXECUTE stmt_category_published_idx;
DEALLOCATE PREPARE stmt_category_published_idx;

COMMIT;
