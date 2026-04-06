import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell/app-shell";
import { RouteError } from "@/components/route-error";
import { RoutePending } from "@/components/route-pending";
import {
  fileContentQueryOptions,
  cronDetailQueryOptions,
  cronQueryOptions,
  filesQueryOptions,
  inventoryQueryOptions,
  memoryQueryOptions,
  overviewQueryOptions,
  sessionsQueryOptions,
  skillDetailQueryOptions,
  skillLinkedFileContentQueryOptions,
  skillsQueryOptions,
  usageQueryOptions,
} from "@/lib/api";
import { CronDetailPage } from "@/routes/pages/cron-detail-page";
import { CronPage } from "@/routes/pages/cron-page";
import { FilesPage } from "@/routes/pages/files-page";
import { HomePage } from "@/routes/pages/home-page";
import { MemoryPage } from "@/routes/pages/memory-page";
import { SessionsPage } from "@/routes/pages/sessions-page";
import { SkillDetailPage } from "@/routes/pages/skill-detail-page";
import { SkillsPage } from "@/routes/pages/skills-page";
import { UsagePage } from "@/routes/pages/usage-page";
import { z } from "zod";

type RouterContext = {
  queryClient: QueryClient;
};

type FilesRouteLoaderData = {
  selectedFileError: string | null;
};

type SkillDetailRouteLoaderData = {
  selectedLinkedFileError: string | null;
};

const readPrefetchErrorMessage = ({
  error,
  fallback,
}: {
  error: unknown;
  fallback: string;
}): string => (error instanceof Error ? error.message : fallback);

const prefetchSelectedFileContent = async ({
  fileId,
  queryClient,
}: {
  fileId: string | null;
  queryClient: QueryClient;
}): Promise<FilesRouteLoaderData> => {
  if (fileId == null) {
    return {
      selectedFileError: null,
    };
  }

  try {
    await queryClient.fetchQuery({
      ...fileContentQueryOptions({
        fileId,
      }),
      retry: false,
    });

    return {
      selectedFileError: null,
    };
  } catch (error) {
    return {
      selectedFileError: readPrefetchErrorMessage({
        error,
        fallback: "The selected file preview could not be loaded.",
      }),
    };
  }
};

const prefetchSelectedSkillLinkedFile = async ({
  fileId,
  queryClient,
  skillId,
}: {
  fileId: string | null;
  queryClient: QueryClient;
  skillId: string;
}): Promise<SkillDetailRouteLoaderData> => {
  if (fileId == null) {
    return {
      selectedLinkedFileError: null,
    };
  }

  try {
    await queryClient.fetchQuery({
      ...skillLinkedFileContentQueryOptions({
        fileId,
        skillId,
      }),
      retry: false,
    });

    return {
      selectedLinkedFileError: null,
    };
  } catch (error) {
    return {
      selectedLinkedFileError: readPrefetchErrorMessage({
        error,
        fallback: "The selected linked skill file could not be loaded.",
      }),
    };
  }
};

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  errorComponent: RouteError,
  pendingComponent: RoutePending,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(overviewQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions()),
    ]),
  component: HomePage,
});

const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sessions",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sessionsQueryOptions()),
  component: SessionsPage,
});

const cronRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cron",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(cronQueryOptions()),
  component: CronPage,
});

const cronDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cron/$agentId/$jobId",
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      cronDetailQueryOptions({
        agentId: params.agentId,
        jobId: params.jobId,
      }),
    ),
  component: () => {
    const params = cronDetailRoute.useParams();

    return (
      <CronDetailPage agentId={params.agentId} jobId={params.jobId} />
    );
  },
});

const usageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/usage",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(usageQueryOptions()),
  component: UsagePage,
});

const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(skillsQueryOptions()),
  component: SkillsPage,
});

const skillDetailSearchSchema = z.object({
  file: z.string().optional(),
});

const skillDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills/$skillId",
  validateSearch: (search) => skillDetailSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    selectedFileId: search.file ?? null,
  }),
  loader: async ({ context, deps, params }) => {
    const skillId = decodeURIComponent(params.skillId);

    const [, loaderData] = await Promise.all([
      context.queryClient.ensureQueryData(
        skillDetailQueryOptions({
          skillId,
        }),
      ),
      prefetchSelectedSkillLinkedFile({
        fileId: deps.selectedFileId,
        queryClient: context.queryClient,
        skillId,
      }),
    ]);

    return loaderData;
  },
  component: () => {
    const loaderData = skillDetailRoute.useLoaderData();
    const params = skillDetailRoute.useParams();
    const search = skillDetailRoute.useSearch();

    return (
      <SkillDetailPage
        selectedLinkedFileError={loaderData.selectedLinkedFileError}
        selectedFileId={search.file ?? null}
        skillId={decodeURIComponent(params.skillId)}
      />
    );
  },
});

const memoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/memory",
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(memoryQueryOptions()),
  component: MemoryPage,
});

const filesSearchSchema = z.object({
  file: z.string().optional(),
});

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/files",
  validateSearch: (search) => filesSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    selectedFileId: search.file ?? null,
  }),
  loader: async ({ context, deps }) => {
    const [, loaderData] = await Promise.all([
      context.queryClient.ensureQueryData(filesQueryOptions()),
      prefetchSelectedFileContent({
        fileId: deps.selectedFileId,
        queryClient: context.queryClient,
      }),
    ]);

    return loaderData;
  },
  component: () => {
    const loaderData = filesRoute.useLoaderData();
    const search = filesRoute.useSearch();

    return (
      <FilesPage
        selectedFileError={loaderData.selectedFileError}
        selectedFileId={search.file ?? null}
      />
    );
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  cronRoute,
  cronDetailRoute,
  usageRoute,
  skillsRoute,
  skillDetailRoute,
  memoryRoute,
  filesRoute,
]);

export const createAppRouter = ({
  history,
  queryClient,
}: {
  history?: RouterHistory;
  queryClient: QueryClient;
}) =>
  createRouter({
    context: {
      queryClient,
    },
    defaultPreload: "intent",
    ...(history == null ? {} : { history }),
    routeTree,
  });

export const AppRouterProvider = ({
  router,
}: {
  router: ReturnType<typeof createAppRouter>;
}) => <RouterProvider router={router} />;
