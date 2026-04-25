-- 0002_better_auth.sql
-- Better Auth v1.6.6 schema for the plugin set configured in
-- src/lib/auth.ts: base + magicLink + organization + sso.
--
-- Column-type conventions (match drizzle-sqlite):
--   TEXT for string/id, INTEGER for boolean (0/1) and unix-ms dates.
-- Table + column names are camelCase because Better Auth queries
-- them literally (not snake_cased by an adapter).

CREATE TABLE user (
  id             TEXT PRIMARY KEY NOT NULL,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  emailVerified  INTEGER NOT NULL DEFAULT 0,
  image          TEXT,
  createdAt      INTEGER NOT NULL,
  updatedAt      INTEGER NOT NULL
);
CREATE INDEX user_email_idx ON user(email);

CREATE TABLE session (
  id                   TEXT PRIMARY KEY NOT NULL,
  expiresAt            INTEGER NOT NULL,
  token                TEXT NOT NULL UNIQUE,
  createdAt            INTEGER NOT NULL,
  updatedAt            INTEGER NOT NULL,
  ipAddress            TEXT,
  userAgent            TEXT,
  userId               TEXT NOT NULL,
  activeOrganizationId TEXT,
  activeTeamId         TEXT,
  FOREIGN KEY(userId) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX session_userId_idx ON session(userId);
CREATE INDEX session_token_idx ON session(token);

CREATE TABLE account (
  id                       TEXT PRIMARY KEY NOT NULL,
  accountId                TEXT NOT NULL,
  providerId               TEXT NOT NULL,
  userId                   TEXT NOT NULL,
  accessToken              TEXT,
  refreshToken             TEXT,
  idToken                  TEXT,
  accessTokenExpiresAt     INTEGER,
  refreshTokenExpiresAt    INTEGER,
  scope                    TEXT,
  password                 TEXT,
  createdAt                INTEGER NOT NULL,
  updatedAt                INTEGER NOT NULL,
  FOREIGN KEY(userId) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX account_userId_idx ON account(userId);
CREATE INDEX account_providerId_idx ON account(accountId, providerId);

CREATE TABLE verification (
  id           TEXT PRIMARY KEY NOT NULL,
  identifier   TEXT NOT NULL,
  value        TEXT NOT NULL,
  expiresAt    INTEGER NOT NULL,
  createdAt    INTEGER NOT NULL,
  updatedAt    INTEGER NOT NULL
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE organization (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  logo       TEXT,
  metadata   TEXT,
  createdAt  INTEGER NOT NULL
);
CREATE INDEX organization_slug_idx ON organization(slug);

CREATE TABLE member (
  id              TEXT PRIMARY KEY NOT NULL,
  organizationId  TEXT NOT NULL,
  userId          TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  createdAt       INTEGER NOT NULL,
  FOREIGN KEY(organizationId) REFERENCES organization(id) ON DELETE CASCADE,
  FOREIGN KEY(userId)         REFERENCES user(id)         ON DELETE CASCADE
);
CREATE INDEX member_organizationId_idx ON member(organizationId);
CREATE INDEX member_userId_idx ON member(userId);

CREATE TABLE invitation (
  id              TEXT PRIMARY KEY NOT NULL,
  organizationId  TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            TEXT,
  teamId          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  expiresAt       INTEGER NOT NULL,
  createdAt       INTEGER NOT NULL,
  inviterId       TEXT NOT NULL,
  FOREIGN KEY(organizationId) REFERENCES organization(id) ON DELETE CASCADE,
  FOREIGN KEY(inviterId)      REFERENCES user(id)         ON DELETE CASCADE
);
CREATE INDEX invitation_organizationId_idx ON invitation(organizationId);
CREATE INDEX invitation_email_idx ON invitation(email);

-- Team tables are shipped even though the `teams` option is disabled
-- in src/lib/auth.ts, so enabling it later doesn't require a
-- migration chain. Migrations are append-only.
CREATE TABLE team (
  id              TEXT PRIMARY KEY NOT NULL,
  name            TEXT NOT NULL,
  organizationId  TEXT NOT NULL,
  createdAt       INTEGER NOT NULL,
  updatedAt       INTEGER,
  FOREIGN KEY(organizationId) REFERENCES organization(id) ON DELETE CASCADE
);
CREATE INDEX team_organizationId_idx ON team(organizationId);

CREATE TABLE teamMember (
  id         TEXT PRIMARY KEY NOT NULL,
  teamId     TEXT NOT NULL,
  userId     TEXT NOT NULL,
  createdAt  INTEGER,
  FOREIGN KEY(teamId) REFERENCES team(id) ON DELETE CASCADE,
  FOREIGN KEY(userId) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX teamMember_teamId_idx ON teamMember(teamId);
CREATE INDEX teamMember_userId_idx ON teamMember(userId);

CREATE TABLE ssoProvider (
  id              TEXT PRIMARY KEY NOT NULL,
  issuer          TEXT NOT NULL,
  oidcConfig      TEXT,
  samlConfig      TEXT,
  userId          TEXT,
  providerId      TEXT NOT NULL UNIQUE,
  organizationId  TEXT,
  domain          TEXT NOT NULL,
  domainVerified  INTEGER,
  FOREIGN KEY(userId) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX ssoProvider_providerId_idx ON ssoProvider(providerId);
