import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouterProvider, createAppRouter } from "@/router";

const isoTimestamp = "2026-04-06T12:00:00.000Z";

const createSnapshotEnvelope = <T,>(data: T) => ({
  data,
  issues: [],
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: "ready" as const,
  },
});

const createMemoryReadResult = () => ({
  status: "ready" as const,
  rootPath: "/tmp/hermes",
  configPath: "/tmp/hermes/config.yaml",
  limits: {
    memory: {
      source: "default" as const,
      value: 2200,
    },
    user: {
      source: "default" as const,
      value: 1375,
    },
  },
  files: {
    memory: {
      scope: "memory" as const,
      label: "MEMORY.md",
      filePath: "/tmp/hermes/memories/MEMORY.md",
      exists: true,
      rawContent: "Memory body",
      preamble: "",
      entries: [],
      charCount: 11,
      limit: 2200,
      usageRatio: 0.005,
      usagePercentage: 1,
      pressureLevel: "healthy" as const,
    },
    user: {
      scope: "user" as const,
      label: "USER.md",
      filePath: "/tmp/hermes/memories/USER.md",
      exists: true,
      rawContent: "User body",
      preamble: "",
      entries: [],
      charCount: 9,
      limit: 1375,
      usageRatio: 0.0065,
      usagePercentage: 1,
      pressureLevel: "healthy" as const,
    },
  },
});

const keyFileSummary = {
  id: "agents-md",
  path: "/tmp/hermes/AGENTS.md",
  name: "AGENTS.md",
  scope: "hermes_root" as const,
  relativePath: "AGENTS.md",
  kind: "instruction" as const,
  fileSize: 18,
  lastModifiedMs: 1,
};

const skillLinkedFile = {
  id: "guide-md",
  kind: "reference" as const,
  relativePath: "guide.md",
  absolutePath: "/tmp/hermes/skills/demo-skill/guide.md",
};

const skillSummary = {
  id: "demo-skill",
  slug: "demo-skill",
  name: "Demo Skill",
  description: "Demo description",
  category: "workspace",
  skillPath: "/tmp/hermes/skills/demo-skill/SKILL.md",
  parseStatus: "valid" as const,
  linkedFiles: [skillLinkedFile],
};

const appMeta = {
  rootPath: "/tmp/hermes",
  rootKind: "default" as const,
  installStatus: "ready" as const,
  gatewayState: "running" as const,
  updateStatus: "up_to_date" as const,
  updateBehind: 0,
  connectedPlatformCount: 1,
};

const createFetchStub = (
  responses: Record<
    string,
    {
      body: unknown;
      status?: number;
    }
  >,
) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const path = `${url.pathname}${url.search}`;
    const response = responses[path];

    if (!response) {
      throw new Error(`Unexpected fetch for ${path}`);
    }

    return new Response(JSON.stringify(response.body), {
      headers: {
        "Content-Type": "application/json",
      },
      status: response.status ?? 200,
    });
  });

const renderRoute = async ({
  initialEntry,
  responses,
}: {
  initialEntry: string;
  responses: Parameters<typeof createFetchStub>[0];
}) => {
  vi.stubGlobal("fetch", createFetchStub(responses));
  vi.stubGlobal("scrollTo", vi.fn());

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 60_000,
      },
    },
  });
  const router = createAppRouter({
    history: createMemoryHistory({
      initialEntries: [initialEntry],
    }),
    queryClient,
  });

  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <AppRouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("selected preview routes", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads a deep-linked file preview before the files page renders", async () => {
    await renderRoute({
      initialEntry: "/files?file=agents-md",
      responses: {
        "/api/meta/app": {
          body: appMeta,
        },
        "/api/files": {
          body: createSnapshotEnvelope({
            keyFiles: {
              roots: {
                hermesRoot: "/tmp/hermes",
                workspaceRoot: "/tmp/workspace",
              },
              files: [keyFileSummary],
            },
            memory: createMemoryReadResult(),
          }),
        },
        "/api/files/agents-md": {
          body: createSnapshotEnvelope({
            file: keyFileSummary,
            content: "Alpha instructions",
          }),
        },
      },
    });

    expect(await screen.findByText("Key Files")).toBeTruthy();
    expect(screen.getByText("Alpha instructions")).toBeTruthy();
    expect(screen.queryByText("Loading the selected file preview.")).toBeNull();
    expect(screen.queryByText("This view could not be loaded")).toBeNull();
  });

  it("keeps an invalid file deep link as an inline preview error", async () => {
    await renderRoute({
      initialEntry: "/files?file=missing",
      responses: {
        "/api/meta/app": {
          body: appMeta,
        },
        "/api/files": {
          body: createSnapshotEnvelope({
            keyFiles: {
              roots: {
                hermesRoot: "/tmp/hermes",
                workspaceRoot: "/tmp/workspace",
              },
              files: [keyFileSummary],
            },
            memory: createMemoryReadResult(),
          }),
        },
        "/api/files/missing": {
          body: {
            error: "File not found for missing",
          },
          status: 404,
        },
      },
    });

    expect(await screen.findByText("Key Files")).toBeTruthy();
    expect(await screen.findByText("File not found for missing")).toBeTruthy();
    expect(screen.queryByText("This view could not be loaded")).toBeNull();
  });

  it("loads a deep-linked skill file preview before the skill page renders", async () => {
    await renderRoute({
      initialEntry: "/skills/demo-skill?file=guide-md",
      responses: {
        "/api/meta/app": {
          body: appMeta,
        },
        "/api/skills/demo-skill": {
          body: createSnapshotEnvelope({
            summary: skillSummary,
            rawContent: "Skill body",
            body: "Skill body",
            frontmatter: {},
          }),
        },
        "/api/skills/demo-skill/files/guide-md": {
          body: createSnapshotEnvelope({
            file: skillLinkedFile,
            content: "Guide body",
          }),
        },
      },
    });

    expect(await screen.findByText("Demo Skill")).toBeTruthy();
    expect(await screen.findByText("Guide body")).toBeTruthy();
    expect(screen.queryByText("Loading linked file preview.")).toBeNull();
    expect(screen.queryByText("This view could not be loaded")).toBeNull();
  });

  it("keeps an invalid skill file deep link as an inline preview error", async () => {
    await renderRoute({
      initialEntry: "/skills/demo-skill?file=missing-file",
      responses: {
        "/api/meta/app": {
          body: appMeta,
        },
        "/api/skills/demo-skill": {
          body: createSnapshotEnvelope({
            summary: skillSummary,
            rawContent: "Skill body",
            body: "Skill body",
            frontmatter: {},
          }),
        },
        "/api/skills/demo-skill/files/missing-file": {
          body: {
            error: "Linked skill file not found for demo-skill/missing-file",
          },
          status: 404,
        },
      },
    });

    expect(await screen.findByText("Demo Skill")).toBeTruthy();
    expect(
      await screen.findByText(
        "Linked skill file not found for demo-skill/missing-file",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("This view could not be loaded")).toBeNull();
  });
});
