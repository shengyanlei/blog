# Automated DB Migrations

Deploy now auto-discovers and applies MySQL migrations from this directory.

Rules:

- Add every schema change as a new `.sql` file here.
- Use a sortable filename such as `V20260307_001__guestbook_schema.sql`.
- Never edit or rename a migration after it has been deployed.
- If a deployed migration needs follow-up work, add a new migration file.
- Keep migrations idempotent whenever practical.

Deploy behavior:

- `deploy/server/deploy_release.sh` scans `backend/scripts/migrations/*.sql`
- migrations are applied in filename order
- applied files are recorded in MySQL table `schema_migrations`
- already applied files are skipped
- if an applied file is changed later, deploy fails on checksum mismatch

The production workflow already sets `RUN_DB_MIGRATIONS=true`, so new migrations in this folder are applied automatically during deploy.
