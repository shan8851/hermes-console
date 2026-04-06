import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppTopbar } from "@/components/app-shell/app-topbar";

describe("AppTopbar", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "app meta unavailable",
          }),
          {
            status: 500,
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

  it("renders a non-blocking fallback when app meta cannot be loaded", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppTopbar />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("runtime metadata unavailable")).toBeTruthy();
    });
  });
});
