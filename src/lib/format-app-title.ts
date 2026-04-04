export function formatAppTitle(section?: string) {
  if (!section) {
    return "Hermes Console";
  }

  return `${section} · Hermes Console`;
}
