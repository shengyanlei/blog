-- Production SQL: address fields for footprint location (China V1, global-ready)

ALTER TABLE footprint_location
    ADD COLUMN IF NOT EXISTS country VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS address_detail VARCHAR(255) NULL;

UPDATE footprint_location
SET country = '中国'
WHERE country IS NULL OR country = '';

ALTER TABLE footprint_location
    MODIFY COLUMN country VARCHAR(64) NOT NULL;

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

