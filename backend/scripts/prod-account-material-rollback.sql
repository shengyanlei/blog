-- Soft rollback for account/material phase-1.
-- This script keeps new columns/tables to avoid destructive rollback.

START TRANSACTION;

UPDATE users
SET role = 'ADMIN'
WHERE LOWER(username) = 'shyl';

UPDATE users
SET role = 'USER'
WHERE LOWER(username) <> 'shyl';

-- Keep enabled column and permission table for forward compatibility.
-- Optionally clear explicit tab permissions.
DELETE FROM user_tab_permission;

COMMIT;
