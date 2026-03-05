-- Expand article content capacity for large Notion imports.
-- MySQL InnoDB, utf8mb4.

ALTER TABLE articles
    MODIFY COLUMN content LONGTEXT NOT NULL;

