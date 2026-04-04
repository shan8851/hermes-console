import type { Metadata } from "next";

import { formatAppTitle } from "@/lib/format-app-title";

export function createSectionMetadata(
  section: string,
  description: string,
): Metadata {
  return {
    title: formatAppTitle(section),
    description,
  };
}
