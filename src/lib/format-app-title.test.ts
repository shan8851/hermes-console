import { describe, expect, it } from "vitest";

import { formatAppTitle } from "./format-app-title";

describe("formatAppTitle", () => {
  it("returns the base app title when no section is provided", () => {
    expect(formatAppTitle()).toBe("Hermes Console");
  });

  it("prefixes the section when one is provided", () => {
    expect(formatAppTitle("Overview")).toBe("Overview · Hermes Console");
  });
});
