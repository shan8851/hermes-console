import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/skills",
}));

import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  it("renders the primary navigation items", () => {
    render(<AppSidebar />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /skills/i })).toBeInTheDocument();
    expect(screen.getByText(/read-mostly, local-first/i)).toBeInTheDocument();
  });
});
