import { describe, expect, it } from "vitest";

import { createSectionMetadata } from "./create-section-metadata";

describe("createSectionMetadata", () => {
  it("creates route metadata with a Hermes Console title", () => {
    expect(
      createSectionMetadata("Sessions", "Recent Hermes activity."),
    ).toEqual({
      title: "Sessions · Hermes Console",
      description: "Recent Hermes activity.",
    });
  });
});
