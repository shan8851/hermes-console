export type AppRoute = {
  href: string;
  label: string;
  description: string;
};

export const appRoutes: AppRoute[] = [
  {
    href: "/",
    label: "Overview",
    description: "Snapshot of setup health, activity, and key signals.",
  },
  {
    href: "/sessions",
    label: "Sessions",
    description: "Recent Hermes activity and session history.",
  },
  {
    href: "/cron",
    label: "Cron",
    description: "Scheduled jobs, timing, and recent run state.",
  },
  {
    href: "/skills",
    label: "Skills",
    description: "Installed skills and linked capabilities.",
  },
  {
    href: "/memory",
    label: "Memory",
    description: "USER and MEMORY surfaces with usage indicators.",
  },
  {
    href: "/setup",
    label: "Setup",
    description: "Inventory, paths, providers, and environment posture.",
  },
  {
    href: "/files",
    label: "Files",
    description: "High-signal context files shaping Hermes behaviour.",
  },
];
