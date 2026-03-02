-- Production SQL: create journey table and link footprint locations

CREATE TABLE IF NOT EXISTS travel_journey (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    summary VARCHAR(1000) NULL,
    content TEXT NULL,
    tags VARCHAR(255) NULL,
    companions VARCHAR(255) NULL,
    budget_min DECIMAL(10,2) NULL,
    budget_max DECIMAL(10,2) NULL,
    cover_url VARCHAR(255) NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @has_col := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND COLUMN_NAME = 'journey_id'
);
SET @sql := IF(@has_col = 0,
    'ALTER TABLE footprint_location ADD COLUMN journey_id BIGINT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND INDEX_NAME = 'idx_fp_journey'
);
SET @sql := IF(@has_idx = 0,
    'CREATE INDEX idx_fp_journey ON footprint_location (journey_id)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'footprint_location'
      AND CONSTRAINT_NAME = 'fk_fp_journey'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql := IF(@has_fk = 0,
    'ALTER TABLE footprint_location ADD CONSTRAINT fk_fp_journey FOREIGN KEY (journey_id) REFERENCES travel_journey(id) ON DELETE SET NULL',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
