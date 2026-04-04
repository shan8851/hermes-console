import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InventorySummaryGrid } from "./inventory-summary-grid";

describe("InventorySummaryGrid", () => {
  it("renders summary labels and values", () => {
    render(
      <InventorySummaryGrid
        items={[
          { label: "status", value: "ready" },
          { label: "agents", value: "2 of 2", tone: "muted" },
        ]}
      />,
    );

    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });
});
