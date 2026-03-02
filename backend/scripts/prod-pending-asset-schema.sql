-- Pending asset support for journey asset pool.
-- Safe to run on MySQL 8+.

ALTER TABLE footprint_photo
    ADD COLUMN IF NOT EXISTS created_at DATETIME NULL;

UPDATE footprint_photo
SET created_at = NOW()
WHERE created_at IS NULL;

ALTER TABLE footprint_photo
    MODIFY COLUMN created_at DATETIME NOT NULL;

CREATE INDEX idx_fp_pending_created ON footprint_photo(location_id, created_at, id);
