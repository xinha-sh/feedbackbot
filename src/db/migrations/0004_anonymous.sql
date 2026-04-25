-- 0004_anonymous.sql
-- Better Auth anonymous plugin adds an `isAnonymous` flag to `user`.
-- Stored as INTEGER (0/1) per the rest of our drizzle-sqlite boolean
-- convention. Default 0 so existing rows treat as real users.

ALTER TABLE user ADD COLUMN isAnonymous INTEGER NOT NULL DEFAULT 0;
