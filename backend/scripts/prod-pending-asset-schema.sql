-- Pending asset support for journey asset pool.
-- Compatible with MySQL 5.7+ (avoid ADD COLUMN IF NOT EXISTS).

SET @has_created_at_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(
    @has_created_at_col = 0,
    'ALTER TABLE footprint_photo ADD COLUMN created_at DATETIME NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE footprint_photo
SET created_at = NOW()
WHERE created_at IS NULL;

SET @created_at_nullable := (
    SELECT IFNULL(MAX(CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END), 0)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND COLUMN_NAME = 'created_at'
);
SET @sql := IF(
    @created_at_nullable = 1,
    'ALTER TABLE footprint_photo MODIFY COLUMN created_at DATETIME NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND INDEX_NAME = 'idx_fp_pending_created'
);
SET @sql := IF(
    @has_idx = 0,
    'CREATE INDEX idx_fp_pending_created ON footprint_photo(location_id, created_at, id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
