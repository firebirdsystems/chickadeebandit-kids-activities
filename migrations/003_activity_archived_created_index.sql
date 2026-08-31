-- activities filters archived = 0 and orders by created_at under LIMIT 100, and
-- the table had no index at all. `archived` is an INTEGER flag (never encrypted)
-- so the filter is seekable, and created_at then supplies the ordering.
CREATE INDEX IF NOT EXISTS app_kids_activities__activities_archived_created_idx
  ON app_kids_activities__activities(archived, created_at);
