-- AI read export: the schedule ordered by (date, time).
-- session_date / start_time / kind are declared in db_plaintext_columns so the
-- ORDER BY works in SQL. The caller filters past dates client-side.
SELECT
  id,
  activity_id,
  kind,
  session_date,
  start_time,
  end_time,
  location,
  notes
FROM app_kids_activities__sessions
ORDER BY session_date, start_time
LIMIT 300
