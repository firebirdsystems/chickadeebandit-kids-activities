import { describe, it, expect } from "vitest";
import {
  sessionKindMeta, daysUntilDate, upcomingSessions, pastSessions,
  sessionDayLabel, fmtTime, fmtTimeRange, sortedActivities, isoDay,
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
