import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";
import { SESSION_KINDS } from "../src/logic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));
const page = readFileSync(join(__dirname, "../src/index.html"), "utf-8");

const item = manifest.shareable?.activity;

/**
 * A share link is an anonymous read that skips row policies, so the declared
 * columns are the whole public surface. The share panel tells the adult what
 * stays in the household; these hold the manifest to that sentence.
 */
describe("shareable.activity", () => {
  it("anchors on the activities table by id", () => {
    expect(item.table).toBe("activities");
    expect(item.id_column ?? "id").toBe("id");
    expect(item.title_column).toBe("name");
  });

  it("projects the season and usual location, and not the coach or notes", () => {
    expect(item.columns.map((c) => c.column)).toEqual(["season", "location"]);
  });

  it("lists the gear by name and nothing else", () => {
    expect(item.aggregates).toHaveLength(1);
    const [agg] = item.aggregates;
    expect(agg.table).toBe("gear");
    expect(agg.fk_column).toBe("activity_id");
    expect(agg.op).toBe("list");
    expect(agg.value_column).toBe("name");
  });

  it("shows each session's kind, date, time and place, and not its notes", () => {
    expect(item.feed.table).toBe("sessions");
    expect(item.feed.fk_column).toBe("activity_id");
    expect(item.feed.columns.map((c) => c.column))
      .toEqual(["kind", "session_date", "start_time", "end_time", "location"]);
  });

  // The page is for grandparents or another family: the schedule, not who the
  // child is, how to reach the coach, or what the household wrote down.
  it("never names the child, the coach's details, notes or the author", () => {
    const json = JSON.stringify(item);
    for (const col of ["coach_name", "coach_contact", "notes", "member_id", "created_by"]) {
      expect(json).not.toContain(col);
    }
  });

  it("relabels every session kind the app can write", () => {
    const kind = item.feed.columns.find((c) => c.column === "kind");
    expect(kind.value_labels).toEqual(Object.fromEntries(SESSION_KINDS.map((k) => [k.value, k.label])));
  });

  // The feed sorts in SQL; a ciphertext column there orders by the encrypted
  // bytes. session_date is declared plaintext, so the order is by day.
  // Newest first, because the hub keeps the first max_items rows: sessions are
  // retained for 730 days, a year-round activity passes 200 inside that, and
  // oldest-first would drop the upcoming sessions, the ones a reader came for.
  it("orders the schedule by day on a plaintext column, newest first", () => {
    expect(item.feed.order_column).toBe("session_date");
    expect(item.feed.order).toBe("newest");
    expect(manifest.db_plaintext_columns).toContain("session_date");
  });

  it("is read-only and is the item type the page mints", () => {
    expect(item.submit).toBeUndefined();
    expect(item.files).toBeUndefined();
    expect(item.visible_where).toBeUndefined();
    expect(Object.keys(manifest.shareable)).toEqual(["activity"]);
    expect(page).toMatch(/itemType:\s*"activity"/);
  });

  it("tells the sharer what stays in the household", () => {
    const scope = page.match(/scopeHtml:\s*\(\)\s*=>\s*"([^"]+)"/)?.[1] ?? "";
    const kept = scope.split("stay in the household")[0].split(".").pop();
    for (const phrase of ["child", "coach", "notes"]) {
      expect(kept).toContain(phrase);
    }
  });
});
