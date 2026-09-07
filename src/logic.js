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

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * Coach, location and season all count — an activity is looked up as
 * "who is Mia's Tuesday coach" or "what's at the leisure centre", not
 * by the activity's own name.
 */
export function searchableFields(item) {
  return [item.name, item.season, item.location, item.coach_name, item.coach_contact, item.notes];
}

/**
 * How far ahead the `calendar_events` export reaches, and how many events it
 * may carry. The export is ONE store blob under `max_store_bytes`, and a
 * household with three kids in two activities each can accumulate several
 * hundred sessions a year — so this is bounded on both axes rather than
 * shipping the whole table and hoping. Past sessions are excluded outright:
 * the hub's calendar already has its own history, and a season that ended in
 * March is not something anyone subscribes to a feed to see.
 *
 * The event cap matches the hub's own per-app ceiling on both consuming paths
 * — MAX_CROSS_APP_EVENTS_PER_APP (agenda.ts) and MAX_FEED_EVENTS_PER_APP
 * (calendar-feed.ts) are both 100 — so anything past it is decrypted, parsed
 * and then dropped by the hub. Because the payload is sorted by start before
 * the slice, the cap keeps the SOONEST sessions, which are the ones a calendar
 * is read for.
 */
export const CALENDAR_EXPORT_HORIZON_DAYS = 180;
export const CALENDAR_EXPORT_MAX_EVENTS = 100;

/**
 * Build the `calendar_events` payload from upcoming sessions.
 *
 * Shape matches what the hub's cross-app aggregation consumes — see
 * `normalizeExportedEvent` in packages/hub/src/cloudflare/calendar-feed.ts.
 * A session with no `start_time` becomes an all-day entry: the hub derives
 * `allDay` from the absence of a `T` in `start`, so a date-only session
 * degrades on its own rather than being dropped.
 *
 * `notes` is deliberately NOT exported. This payload reaches the household's
 * ICS feed, which external calendar services fetch, and a note is free text a
 * parent wrote for the household. Location is exported because telling you
 * where to go is what a calendar entry is FOR.
 */
export function buildCalendarEvents(activities, sessions, todayIso, from = new Date()) {
  const byId = new Map(activities.filter((a) => !Number(a.archived)).map((a) => [a.id, a]));
  const horizon = isoDay(new Date(atMidnight(from).getTime() + CALENDAR_EXPORT_HORIZON_DAYS * 86400000));
  return sessions
    .filter((s) => s.session_date >= todayIso && s.session_date <= horizon)
    .map((s) => {
      // Sessions load without a join, so one belonging to an archived
      // activity has no entry here — skip it rather than titling it "Event".
      const act = byId.get(s.activity_id);
      if (!act) return null;
      const start = s.start_time ? `${s.session_date}T${s.start_time}` : s.session_date;
      const end = s.start_time && s.end_time ? `${s.session_date}T${s.end_time}` : start;
      // A standing practice needs no label; a game or a rehearsal is the thing
      // the household reschedules around, so it says so on the calendar.
      // "event" is skipped too — "Piano — Event" tells a reader nothing.
      const kind = s.kind === "game" || s.kind === "rehearsal" ? sessionKindMeta(s.kind).label : "";
      return {
        id: s.id,
        title: kind ? `${act.name} — ${kind}` : act.name,
        description: sessionKindMeta(s.kind).label,
        location: s.location || act.location || "",
        start,
        end,
        all_day: !s.start_time,
        member_ids: act.member_id ? [act.member_id] : [],
        source_label: "Activities",
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, CALENDAR_EXPORT_MAX_EVENTS);
}
