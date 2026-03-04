-- Pending asset support for journey asset pool.
-- Safe to run on MySQL 8+.

ALTER TABLE footprint_photo
    ADD COLUMN IF NOT EXISTS created_at DATETIME NULL;

UPDATE footprint_photo
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE footprint_photo
    MODIFY COLUMN created_at DATETIME NOT NULL;

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
