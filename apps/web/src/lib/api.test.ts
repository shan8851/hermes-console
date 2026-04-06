import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { filesQueryOptions } from "@/lib/api";

describe("API response validation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              invalid: true,
            },
            issues: [],
            meta: {
              capturedAt: new Date().toISOString(),
              dataStatus: "ready",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects malformed snapshot payloads instead of casting them through", async () => {
    const queryClient = new QueryClient();

    await expect(queryClient.fetchQuery(filesQueryOptions())).rejects.toThrow();
  });
});
