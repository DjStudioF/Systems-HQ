import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./export";
import { parseBackupFile, summarizeBackup } from "./restore";

describe("csvCell", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });
  it("neutralises spreadsheet formula injection", () => {
    for (const bad of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\t=x", "\r=1"]) {
      expect(csvCell(bad).startsWith("'")).toBe(true);
    }
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
  });
});

describe("toCsv", () => {
  it("emits a header and one line per row, CRLF-separated", () => {
    const csv = toCsv(
      [
        { a: "1", b: "x" },
        { a: "2", b: "y,z" },
      ],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    );
    expect(csv).toBe('A,B\r\n1,x\r\n2,"y,z"');
  });
});

const VALID = {
  version: 1,
  app: "systems-hq",
  exported_at: "2026-10-26T00:00:00.000Z",
  user_id: "75294275-83b5-4346-9950-a404a6e11c22",
  profile: null,
  goals: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "G",
      why: "",
      mode: "focus",
      start_date: "2026-10-01",
      deadline: null,
      outcome_notes: "",
      lifecycle: "archived",
      sort_order: 0,
      created_at: "2026-10-01T00:00:00Z",
    },
  ],
  modules: [],
  logs: [],
  weekly_reviews: [],
};

describe("parseBackupFile", () => {
  it("accepts a valid backup", () => {
    const r = parseBackupFile(JSON.stringify(VALID));
    expect(r.ok).toBe(true);
  });
  it("rejects invalid JSON and wrong shapes", () => {
    expect(parseBackupFile("not json").ok).toBe(false);
    expect(parseBackupFile('{"version":2}').ok).toBe(false);
    expect(
      parseBackupFile(JSON.stringify({ ...VALID, goals: [{ ...VALID.goals[0], mode: "weird" }] }))
        .ok,
    ).toBe(false);
    expect(
      parseBackupFile(
        JSON.stringify({ ...VALID, goals: [{ ...VALID.goals[0], deadline: "10/01" }] }),
      ).ok,
    ).toBe(false);
  });
});

describe("summarizeBackup", () => {
  it("counts entities, archived records and account match", () => {
    const r = parseBackupFile(JSON.stringify(VALID));
    if (!r.ok) throw new Error("unreachable");
    const p = summarizeBackup(r.backup, VALID.user_id);
    expect(p).toMatchObject({
      goals: 1,
      archivedGoals: 1,
      modules: 0,
      logs: 0,
      reviews: 0,
      sameAccount: true,
    });
    expect(summarizeBackup(r.backup, "00000000-0000-4000-8000-000000000000").sameAccount).toBe(
      false,
    );
  });
});
