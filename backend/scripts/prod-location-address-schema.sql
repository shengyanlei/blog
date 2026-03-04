-- Production SQL: address fields for footprint location (China V1, global-ready)
-- Compatible with MySQL 5.7+ (avoid ADD COLUMN IF NOT EXISTS).

SET @has_country_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND COLUMN_NAME = 'country'
);
SET @sql := IF(
    @has_country_col = 0,
    'ALTER TABLE footprint_location ADD COLUMN country VARCHAR(64) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_address_detail_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND COLUMN_NAME = 'address_detail'
);
SET @sql := IF(
    @has_address_detail_col = 0,
    'ALTER TABLE footprint_location ADD COLUMN address_detail VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE footprint_location
SET country = '中国'
WHERE country IS NULL OR country = '';

SET @country_nullable := (
    SELECT IFNULL(MAX(CASE WHEN IS_NULLABLE = 'YES' THEN 1 ELSE 0 END), 0)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND COLUMN_NAME = 'country'
);
SET @sql := IF(
    @country_nullable = 1,
    'ALTER TABLE footprint_location MODIFY COLUMN country VARCHAR(64) NOT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND INDEX_NAME = 'idx_fp_country_province_city'
);
SET @sql := IF(
    @has_idx = 0,
    'CREATE INDEX idx_fp_country_province_city ON footprint_location (country, province, city)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND INDEX_NAME = 'idx_fp_address_detail'
);
SET @sql := IF(
    @has_idx = 0,
    'CREATE INDEX idx_fp_address_detail ON footprint_location (address_detail)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
