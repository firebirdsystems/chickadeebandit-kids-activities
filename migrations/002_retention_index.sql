-- retain_days sweep key for sessions (730 days, keyed on the session date so
-- the window runs from when the practice happened, not when it was entered).
CREATE INDEX IF NOT EXISTS app_kids_activities__sessions_retention_idx
  ON app_kids_activities__sessions (session_date, id);
