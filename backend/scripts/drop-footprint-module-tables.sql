-- Drop obsolete footprint/travel tables after the footprint module is removed.
-- Safe to run repeatedly.
-- Note:
-- 1) `footprint_photo` is intentionally kept because article cover materials still use it.
-- 2) This script also removes the legacy `location_id` foreign key/column from `footprint_photo`.

START TRANSACTION;

SET @footprint_photo_location_fk := (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND COLUMN_NAME = 'location_id'
      AND REFERENCED_TABLE_NAME = 'footprint_location'
    LIMIT 1
);
SET @sql_drop_footprint_photo_location_fk := IF(
    @footprint_photo_location_fk IS NOT NULL,
    CONCAT('ALTER TABLE footprint_photo DROP FOREIGN KEY ', @footprint_photo_location_fk),
    'SELECT 1'
);
PREPARE stmt_drop_footprint_photo_location_fk FROM @sql_drop_footprint_photo_location_fk;
EXECUTE stmt_drop_footprint_photo_location_fk;
DEALLOCATE PREPARE stmt_drop_footprint_photo_location_fk;

SET @has_idx_fp_location := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND INDEX_NAME = 'idx_fp_location'
);
SET @sql_drop_idx_fp_location := IF(
    @has_idx_fp_location > 0,
    'DROP INDEX idx_fp_location ON footprint_photo',
    'SELECT 1'
);
PREPARE stmt_drop_idx_fp_location FROM @sql_drop_idx_fp_location;
EXECUTE stmt_drop_idx_fp_location;
DEALLOCATE PREPARE stmt_drop_idx_fp_location;

SET @has_footprint_photo_location_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_photo'
      AND COLUMN_NAME = 'location_id'
);
SET @sql_drop_footprint_photo_location_col := IF(
    @has_footprint_photo_location_col > 0,
    'ALTER TABLE footprint_photo DROP COLUMN location_id',
    'SELECT 1'
);
PREPARE stmt_drop_footprint_photo_location_col FROM @sql_drop_footprint_photo_location_col;
EXECUTE stmt_drop_footprint_photo_location_col;
DEALLOCATE PREPARE stmt_drop_footprint_photo_location_col;

DROP TABLE IF EXISTS travel_plan_task;
DROP TABLE IF EXISTS travel_plan;
DROP TABLE IF EXISTS travel_journey;
DROP TABLE IF EXISTS footprint_location;

-- Optional cleanup if you no longer need historical migration audit rows.
-- DROP TABLE IF EXISTS article_cover_legacy_archive;

COMMIT;
