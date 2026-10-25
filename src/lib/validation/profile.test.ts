import { describe, expect, it } from "vitest";
import { profileUpdateSchema } from "./profile";
import { resolveTheme } from "@/lib/theme";

describe("profileUpdateSchema", () => {
  it("rejects whitespace-only motto", () => {
    expect(profileUpdateSchema.safeParse({ motto: "   " }).success).toBe(false);
  });
  it("rejects invalid timezone", () => {
    expect(profileUpdateSchema.safeParse({ timezone: "Nowhere/City" }).success).toBe(false);
  });
  it("threshold must be within (0, 1]", () => {
    expect(profileUpdateSchema.safeParse({ consistency_threshold: 0 }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ consistency_threshold: 1.01 }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ consistency_threshold: 0.8 }).success).toBe(true);
  });
  it("blank display name becomes null", () => {
    expect(profileUpdateSchema.parse({ display_name: "  " }).display_name).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("follows system only when set to system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
