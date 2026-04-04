import { SessionsBrowser } from "@/features/sessions/components/sessions-browser";
import { readHermesSessions } from "@/features/sessions/read-hermes-sessions";
import { createSectionMetadata } from "@/lib/create-section-metadata";

export const metadata = createSectionMetadata(
  "Sessions",
  "Recent Hermes activity and session history.",
);

export default function SessionsPage() {
  const index = readHermesSessions();

  return <SessionsBrowser sessions={index.sessions} />;
}
