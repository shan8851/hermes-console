import { PlaceholderPage } from "@/components/placeholders/placeholder-page";

export default function Home() {
  return (
    <PlaceholderPage
      eyebrow="Overview"
      title="See the Hermes setup before you poke at it"
      description="The overview page will become the calm landing surface for setup health, recent activity, scheduler state, and quick links into deeper pages. For now, this shell proves the product posture and navigation model."
      bullets={[
        "Signal strip for agents, sessions, cron, skills, and memory.",
        "Recent activity panel for fast orientation.",
        "Compact setup snapshot with root paths and platform posture.",
      ]}
    />
  );
}
