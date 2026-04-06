import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RefreshButton } from "@/components/ui/refresh-button";

describe("RefreshButton", () => {
  it("refetches only the explicit query keys it is given", async () => {
    const queryClient = new QueryClient();
    const refetchQueriesSpy = vi
      .spyOn(queryClient, "refetchQueries")
      .mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={queryClient}>
        <RefreshButton
          loadedAt="2026-04-06T12:00:00.000Z"
          queryKeys={[["files"], ["file-content", "agents-md"]]}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(refetchQueriesSpy).toHaveBeenCalledTimes(2);
    });

    expect(refetchQueriesSpy).toHaveBeenNthCalledWith(1, {
      exact: true,
      queryKey: ["files"],
      type: "active",
    });
    expect(refetchQueriesSpy).toHaveBeenNthCalledWith(2, {
      exact: true,
      queryKey: ["file-content", "agents-md"],
      type: "active",
    });
  });
});
