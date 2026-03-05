-- Production one-time owner bootstrap SQL (MySQL)
-- 1) Generate bcrypt hash out-of-band and replace __BCRYPT_HASH__ below.
-- 2) Keep plaintext password out of repository and shell history when possible.

START TRANSACTION;

INSERT INTO users (username, email, password_hash, role, enabled, created_at)
VALUES ('shyl', 's13934738165@163.com', '__BCRYPT_HASH__', 'OWNER', 1, NOW())
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    role = 'OWNER',
    enabled = 1;

-- Ensure owner has full tab permissions.
DELETE p
FROM user_tab_permission p
JOIN users u ON u.id = p.user_id
WHERE u.username = 'shyl';

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
    UNION ALL SELECT 'FOOTPRINTS'
    UNION ALL SELECT 'MATERIALS'
    UNION ALL SELECT 'COVER_MATERIALS'
    UNION ALL SELECT 'SETTINGS'
    UNION ALL SELECT 'ACCOUNTS'
) t
WHERE u.username = 'shyl';

-- Optional cleanup for weak default admin account in production.
DELETE FROM users WHERE username = 'admin';

COMMIT;

-- Verification example:
-- MYSQL_PWD='Blog@2026' mysql -h127.0.0.1 -P3306 -uroot blog_db -e "
-- SELECT username, role, enabled, CHAR_LENGTH(password_hash) AS hash_len
-- FROM users WHERE username='shyl';
-- SELECT p.tab_code FROM user_tab_permission p
-- JOIN users u ON u.id = p.user_id
-- WHERE u.username='shyl'
-- ORDER BY p.tab_code;


UPDATE users
SET enabled = b'1'
WHERE username IN ('shyl', 'admin');

