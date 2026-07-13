import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));

describe("manifest.json", () => {
  it("has required string fields", () => {
    for (const field of ["id", "name", "version", "description", "entrypoint", "runtime", "icon"]) {
      expect(manifest[field], `missing field: ${field}`).toBeTruthy();
    }
  });
  it("entrypoint/runtime/storage are standard", () => {
    expect(manifest.entrypoint).toBe("index.html");
    expect(manifest.runtime).toBe("static");
    expect(manifest.storage).toBe("db");
  });
  it("version follows semver", () => expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/));
  it("has a nav label", () => expect(manifest.nav?.label).toBeTruthy());

  it("all tables are adult_writable (kids read their schedule, adults manage)", () => {
    for (const table of ["activities", "sessions", "gear"]) {
      expect(manifest.row_policies?.[table]?.kind, table).toBe("adult_writable");
    }
  });

  it("SQL-sorted schedule columns are declared plaintext", () => {
    for (const col of ["kind", "session_date", "start_time"]) {
      expect(manifest.db_plaintext_columns, col).toContain(col);
    }
  });

  it("ai exports match the query files", () => {
    expect(manifest.ai_access?.db_exports?.sort()).toEqual(["activities", "upcoming_sessions"]);
  });
});
