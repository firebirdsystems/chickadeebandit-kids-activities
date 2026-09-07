import { describe, it, expect } from "vitest";
import {
  sessionKindMeta, daysUntilDate, upcomingSessions, pastSessions,
  sessionDayLabel, fmtTime, fmtTimeRange, sortedActivities, isoDay, searchableFields,
  buildCalendarEvents, CALENDAR_EXPORT_MAX_EVENTS,
} from "../src/logic.js";

const FROM = new Date(2026, 6, 12, 9, 0, 0); // Sunday July 12, 2026 local

describe("daysUntilDate", () => {
  it("counts calendar days", () => {
    expect(daysUntilDate("2026-07-12", FROM)).toBe(0);
    expect(daysUntilDate("2026-07-15", FROM)).toBe(3);
    expect(daysUntilDate("2026-07-10", FROM)).toBe(-2);
    expect(daysUntilDate("", FROM)).toBeNull();
  });
});

describe("upcomingSessions / pastSessions", () => {
  const sessions = [
    { id: "past", activity_id: "a1", session_date: "2026-07-10", start_time: "10:00" },
    { id: "later", activity_id: "a1", session_date: "2026-07-15", start_time: "17:30" },
    { id: "todayLate", activity_id: "a2", session_date: "2026-07-12", start_time: "18:00" },
    { id: "todayEarly", activity_id: "a1", session_date: "2026-07-12", start_time: "08:00" },
  ];
  it("sorts upcoming by date then time and drops past ones", () => {
    expect(upcomingSessions(sessions, FROM).map((s) => s.id)).toEqual(["todayEarly", "todayLate", "later"]);
  });
  it("filters by activity ids", () => {
    expect(upcomingSessions(sessions, FROM, new Set(["a2"])).map((s) => s.id)).toEqual(["todayLate"]);
  });
  it("past sessions come back newest first", () => {
    expect(pastSessions(sessions, FROM).map((s) => s.id)).toEqual(["past"]);
  });
});

describe("sessionDayLabel", () => {
  it("labels today/tomorrow/weekday/date", () => {
    expect(sessionDayLabel("2026-07-12", FROM)).toBe("Today");
    expect(sessionDayLabel("2026-07-13", FROM)).toBe("Tomorrow");
    expect(sessionDayLabel("2026-07-15", FROM)).toBe("Wednesday");
    expect(sessionDayLabel("2026-08-20", FROM)).toMatch(/Aug/);
  });
});

describe("time formatting", () => {
  it("formats 24h to 12h", () => {
    expect(fmtTime("17:30")).toBe("5:30 PM");
    expect(fmtTime("09:05")).toBe("9:05 AM");
    expect(fmtTime("00:15")).toBe("12:15 AM");
    expect(fmtTime("12:00")).toBe("12:00 PM");
    expect(fmtTime("")).toBe("");
    expect(fmtTime("25:00")).toBe("");
  });
  it("compacts same-half ranges", () => {
    expect(fmtTimeRange("17:30", "18:45")).toBe("5:30–6:45 PM");
    expect(fmtTimeRange("11:00", "13:00")).toBe("11:00 AM–1:00 PM");
    expect(fmtTimeRange("17:30", "")).toBe("5:30 PM");
    expect(fmtTimeRange("", "18:00")).toBe("");
  });
});

describe("sortedActivities", () => {
  it("drops archived and sorts by name", () => {
    const acts = [
      { id: "b", name: "Piano", archived: 0 },
      { id: "a", name: "Soccer", archived: 1 },
      { id: "c", name: "Chess", archived: 0 },
    ];
    expect(sortedActivities(acts).map((a) => a.id)).toEqual(["c", "b"]);
  });
});

describe("isoDay", () => {
  it("formats local YYYY-MM-DD", () => {
    expect(isoDay(new Date(2026, 6, 12))).toBe("2026-07-12");
  });
});

describe("sessionKindMeta", () => {
  it("falls back to event", () => expect(sessionKindMeta("bogus").value).toBe("event"));
});

describe("searchableFields", () => {
  it("matches on the coach and the venue, not just the activity name", () => {
    const fields = searchableFields({
      name: "Swimming", season: "spring", location: "Leisure centre",
      coach_name: "Coach Ruiz", coach_contact: "07700 900123", notes: "bring goggles",
    });
    expect(fields).toContain("Coach Ruiz");
    expect(fields).toContain("Leisure centre");
  });
});

describe("buildCalendarEvents", () => {
  const FROM = new Date(2026, 8, 7);          // 2026-09-07, local
  const TODAY = "2026-09-07";
  const acts = [
    { id: "a1", member_id: "kid-1", name: "U10 Soccer", location: "Miller Park", archived: 0 },
    { id: "a2", member_id: "kid-2", name: "Piano", location: "Ms. Lee's studio", archived: 0 },
    { id: "a3", member_id: "kid-3", name: "Old Season", location: "", archived: 1 },
  ];
  const build = (sessions, activities = acts) => buildCalendarEvents(activities, sessions, TODAY, FROM);

  it("emits a timed event the hub can parse", () => {
    const [ev] = build([
      { id: "s1", activity_id: "a1", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "18:45", location: "" },
    ]);
    expect(ev.start).toBe("2026-09-08T17:30");
    expect(ev.end).toBe("2026-09-08T18:45");
    expect(ev.all_day).toBe(false);
    expect(ev.id).toBe("s1");
    expect(ev.member_ids).toEqual(["kid-1"]);
  });

  it("falls back to the activity's venue when the session has none", () => {
    const [ev] = build([
      { id: "s1", activity_id: "a1", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "", location: "" },
    ]);
    expect(ev.location).toBe("Miller Park");
  });

  it("prefers the session's own venue when it overrides the default", () => {
    const [ev] = build([
      { id: "s1", activity_id: "a1", kind: "game", session_date: "2026-09-08", start_time: "09:00", end_time: "", location: "Riverside Field 2" },
    ]);
    expect(ev.location).toBe("Riverside Field 2");
  });

  it("labels a game and a rehearsal, but leaves a practice bare", () => {
    const titles = Object.fromEntries(build([
      { id: "s1", activity_id: "a1", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "", location: "" },
      { id: "s2", activity_id: "a1", kind: "game", session_date: "2026-09-09", start_time: "09:00", end_time: "", location: "" },
      { id: "s3", activity_id: "a2", kind: "rehearsal", session_date: "2026-09-10", start_time: "16:00", end_time: "", location: "" },
      { id: "s4", activity_id: "a2", kind: "event", session_date: "2026-09-11", start_time: "16:00", end_time: "", location: "" },
    ]).map((e) => [e.id, e.title]));
    expect(titles.s1).toBe("U10 Soccer");
    expect(titles.s2).toBe("U10 Soccer — Game");
    expect(titles.s3).toBe("Piano — Rehearsal");
    expect(titles.s4).toBe("Piano");
  });

  it("degrades a time-less session to an all-day entry with no T in start", () => {
    const [ev] = build([
      { id: "s1", activity_id: "a1", kind: "event", session_date: "2026-09-08", start_time: "", end_time: "", location: "" },
    ]);
    expect(ev.start).toBe("2026-09-08");
    expect(ev.end).toBe("2026-09-08");
    expect(ev.all_day).toBe(true);
  });

  it("drops past sessions and anything beyond the horizon", () => {
    const ids = build([
      { id: "past", activity_id: "a1", kind: "practice", session_date: "2026-09-06", start_time: "17:30", end_time: "", location: "" },
      { id: "today", activity_id: "a1", kind: "practice", session_date: TODAY, start_time: "17:30", end_time: "", location: "" },
      { id: "far", activity_id: "a1", kind: "practice", session_date: "2027-09-08", start_time: "17:30", end_time: "", location: "" },
    ]).map((e) => e.id);
    expect(ids).toEqual(["today"]);
  });

  it("skips a session whose activity is archived or missing", () => {
    expect(build([
      { id: "s1", activity_id: "a3", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "", location: "" },
      { id: "s2", activity_id: "gone", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "", location: "" },
    ])).toEqual([]);
  });

  it("never exports a note", () => {
    const [ev] = build([
      { id: "s1", activity_id: "a1", kind: "practice", session_date: "2026-09-08", start_time: "17:30", end_time: "", location: "", notes: "Mia is anxious about the coach" },
    ]);
    expect(JSON.stringify(ev)).not.toContain("anxious");
  });

  it("caps at the hub's own per-app ceiling, so no event is shipped to be dropped", () => {
    // agenda.ts MAX_CROSS_APP_EVENTS_PER_APP and calendar-feed.ts
    // MAX_FEED_EVENTS_PER_APP are both 100; exporting more just burns bytes.
    expect(CALENDAR_EXPORT_MAX_EVENTS).toBe(100);
  });

  it("caps the payload and keeps the soonest sessions", () => {
    const sessions = Array.from({ length: CALENDAR_EXPORT_MAX_EVENTS + 40 }, (_, i) => ({
      id: `s${i}`, activity_id: "a1", kind: "practice",
      // Two a day from 2026-09-08, so all 240 stay inside the 180-day horizon
      // and the cap, not the horizon, is what does the trimming.
      session_date: isoDay(new Date(2026, 8, 8 + Math.floor(i / 2))),
      start_time: i % 2 ? "17:30" : "09:00", end_time: "", location: "",
    }));
    const out = build(sessions);
    expect(out).toHaveLength(CALENDAR_EXPORT_MAX_EVENTS);
    expect(out[0].id).toBe("s0");
  });
});
