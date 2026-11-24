-- Read-only login used by the API in environments that split
-- ingest (read/write) from serving (read-only). The password below
-- is a documented local-development default, not a production secret.
-- Change it (or better, use a secrets manager) before any real deploy.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fda_app_readonly') THEN
    CREATE ROLE fda_app_readonly LOGIN PASSWORD 'fda_app_readonly';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO fda_app_readonly',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO fda_app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fda_app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO fda_app_readonly;
