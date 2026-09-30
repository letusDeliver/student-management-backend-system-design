-- One-time setup: creates the app's least-privilege role and its database.
-- Run as a superuser (e.g. your macOS user on Homebrew Postgres):
--   psql -d postgres -f db/setup.sql
-- CREATE DATABASE cannot run inside a transaction block, so run this file as-is.

CREATE ROLE sms_app WITH LOGIN PASSWORD 'change-me';

-- OWNER matters on Postgres 15+: only the owner can create tables in the public schema.
CREATE DATABASE sms_dev OWNER sms_app;
