-- Kids' Activities — per-kid seasons with sessions and a gear checklist.
--
-- Access: all three tables are `adult_writable` (manifest.json) — kids can
-- open the app and see their own schedule and gear list, adults manage it.
-- Nothing here is per-member private; the whole household coordinates around
-- this schedule (carpool handles the rides; this app owns the season).
--
-- Plaintext columns (manifest db_plaintext_columns): `kind` (session enum),
-- `session_date` and `start_time` — the schedule sorts on (date, time) in SQL
-- and the AI export does too. Free text (names, locations, coach contact,
-- notes) stays encrypted and is only displayed.
CREATE TABLE IF NOT EXISTS app_kids_activities__activities (
  id            TEXT PRIMARY KEY,
  member_id     TEXT NOT NULL,                  -- the kid this activity belongs to
  name          TEXT NOT NULL,                  -- "U10 Soccer"
  season        TEXT NOT NULL DEFAULT '',       -- "Fall 2026"
  location      TEXT NOT NULL DEFAULT '',       -- default venue
  coach_name    TEXT NOT NULL DEFAULT '',
  coach_contact TEXT NOT NULL DEFAULT '',       -- phone/email (display only)
  notes         TEXT NOT NULL DEFAULT '',
  emoji         TEXT NOT NULL DEFAULT '⚽',
  archived      INTEGER NOT NULL DEFAULT 0,
  created_by    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_kids_activities__sessions (
  id           TEXT PRIMARY KEY,
  activity_id  TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'practice', -- practice|game|rehearsal|event
  session_date TEXT NOT NULL,                    -- ISO YYYY-MM-DD
  start_time   TEXT NOT NULL DEFAULT '',         -- "17:30" (24h, sorts lexically)
  end_time     TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',         -- overrides the activity default
  notes        TEXT NOT NULL DEFAULT '',
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES app_kids_activities__activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_kids_activities__gear (
  id          TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  name        TEXT NOT NULL,                     -- "Shin guards"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES app_kids_activities__activities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS app_kids_activities__sessions_when_idx
  ON app_kids_activities__sessions (session_date, start_time);

CREATE INDEX IF NOT EXISTS app_kids_activities__sessions_activity_idx
  ON app_kids_activities__sessions (activity_id, session_date);

CREATE INDEX IF NOT EXISTS app_kids_activities__gear_activity_idx
  ON app_kids_activities__gear (activity_id, sort_order);
