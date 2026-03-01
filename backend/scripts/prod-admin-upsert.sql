-- Production one-time admin bootstrap SQL (MySQL)
-- 1) Generate bcrypt hash out-of-band and replace __BCRYPT_HASH__ below.
-- 2) Keep plaintext password out of repository and shell history when possible.

START TRANSACTION;

INSERT INTO users (username, email, password_hash, role, created_at)
VALUES ('shyl', 's13934738165@163.com', '__BCRYPT_HASH__', 'ADMIN', NOW())
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    role = 'ADMIN';

-- Optional cleanup for weak default admin account in production.
DELETE FROM users WHERE username = 'admin';

COMMIT;

