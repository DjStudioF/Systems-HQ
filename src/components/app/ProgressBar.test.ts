import { describe, expect, it } from "vitest";
import { textBar } from "./ProgressBar";

describe("textBar", () => {
  it("uses floor of five segments", () => {
    expect(textBar(0.6)).toBe("▰▰▰▱▱");
    expect(textBar(1)).toBe("▰▰▰▰▰");
    expect(textBar(0.99)).toBe("▰▰▰▰▱");
    expect(textBar(1.4)).toBe("▰▰▰▰▰");
    expect(textBar(-1)).toBe("▱▱▱▱▱");
  });
});
