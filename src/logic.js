/**
 * Pure business logic for the Kids' Activities app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

export const SESSION_KINDS = [
  { value: "practice",  label: "Practice",  icon: "🏃" },
  { value: "game",      label: "Game",      icon: "🏆" },
  { value: "rehearsal", label: "Rehearsal", icon: "🎭" },
  { value: "event",     label: "Event",     icon: "📅" },
];

const KIND_BY_VALUE = new Map(SESSION_KINDS.map((k) => [k.value, k]));

export function sessionKindMeta(v) {
  return KIND_BY_VALUE.get(v) ?? { value: "event", label: "Event", icon: "📅" };
}

function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Local YYYY-MM-DD for a Date. */
export function isoDay(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from `from` until an ISO date (negative = past). Null when invalid. */
export function daysUntilDate(iso, from = new Date()) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((atMidnight(d) - atMidnight(from)) / 86400000);
}

/**
 * Sessions on/after today, decorated with `_days`, sorted by (date, time).
 * Pass `activityIds` (a Set) to restrict to certain activities; null = all.
 */
export function upcomingSessions(sessions, from = new Date(), activityIds = null) {
  return sessions
    .filter((s) => (activityIds ? activityIds.has(s.activity_id) : true))
    .map((s) => ({ ...s, _days: daysUntilDate(s.session_date, from) }))
    .filter((s) => s._days != null && s._days >= 0)
    .sort((a, b) =>
      String(a.session_date).localeCompare(String(b.session_date))
      || String(a.start_time).localeCompare(String(b.start_time)));
}

/** Past sessions, newest first (for a short history view). */
export function pastSessions(sessions, from = new Date(), activityIds = null) {
  return sessions
    .filter((s) => (activityIds ? activityIds.has(s.activity_id) : true))
    .map((s) => ({ ...s, _days: daysUntilDate(s.session_date, from) }))
    .filter((s) => s._days != null && s._days < 0)
    .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)));
}

/** "Today" / "Tomorrow" / "Sat" (within a week) / "Jul 26". */
export function sessionDayLabel(iso, from = new Date()) {
  const days = daysUntilDate(iso, from);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (days != null && days > 1 && days < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(d);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
}

/** "5:30 PM" from "17:30"; empty for blank/garbage. */
export function fmtTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
  if (!m) return "";
  const h = Number(m[1]);
  const min = m[2];
  if (h > 23 || Number(min) > 59) return "";
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${am ? "AM" : "PM"}`;
}

/** Time range label: "5:30–6:45 PM" (or just start when no end). */
export function fmtTimeRange(start, end) {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (!s) return "";
  if (!e) return s;
  const sameHalf = s.slice(-2) === e.slice(-2);
  return sameHalf ? `${s.slice(0, -3)}–${e}` : `${s}–${e}`;
}

/** Active (non-archived) activities, one kid's first, then by name. */
export function sortedActivities(activities) {
  return activities
    .filter((a) => !Number(a.archived))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
