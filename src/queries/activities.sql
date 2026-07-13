-- AI read export: active activities (id ↔ name/kid mapping for sessions).
-- adult_writable reads are open, so no member_id is required.
SELECT
  id,
  member_id,
  name,
  season,
  location,
  coach_name
FROM app_kids_activities__activities
WHERE archived = 0
ORDER BY created_at
LIMIT 100
