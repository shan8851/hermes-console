import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app-shell/app-shell';
import { RouteError } from '@/components/route-error';
import { RoutePending } from '@/components/route-pending';
import {
  fileContentQueryOptions,
  configQueryOptions,
  cronDetailQueryOptions,
  cronQueryOptions,
  filesQueryOptions,
  inventoryQueryOptions,
  logsQueryOptions,
  memoryQueryOptions,
  overviewQueryOptions,
  sessionDetailQueryOptions,
  sessionsQueryOptions,
  skillDetailQueryOptions,
  skillLinkedFileContentQueryOptions,
  skillsQueryOptions,
  usageQueryOptions
} from '@/lib/api';
import { ConfigPage } from '@/routes/pages/config-page';
import { CronDetailPage } from '@/routes/pages/cron-detail-page';
import { CronPage } from '@/routes/pages/cron-page';
import { FilesPage } from '@/routes/pages/files-page';
import { HomePage } from '@/routes/pages/home-page';
import { LogsPage } from '@/routes/pages/logs-page';
import { MemoryPage } from '@/routes/pages/memory-page';
import { SessionDetailPage } from '@/routes/pages/session-detail-page';
import { SessionsPage } from '@/routes/pages/sessions-page';
import { SkillDetailPage } from '@/routes/pages/skill-detail-page';
import { SkillsPage } from '@/routes/pages/skills-page';
import { UsagePage } from '@/routes/pages/usage-page';
import { normalizeCronFilterSearch } from '@/features/cron/lib/cron-filters';
import { normalizeProfileScope } from '@/features/profile-scope/profile-scope';
import { z } from 'zod';

type RouterContext = {
  queryClient: QueryClient;
};

type FilesRouteLoaderData = {
  selectedFileError: string | null;
};

type SkillDetailRouteLoaderData = {
  selectedLinkedFileError: string | null;
};

const readPrefetchErrorMessage = ({ error, fallback }: { error: unknown; fallback: string }): string =>
  error instanceof Error ? error.message : fallback;

const prefetchSelectedFileContent = async ({
  fileId,
  queryClient
}: {
  fileId: string | null;
  queryClient: QueryClient;
}): Promise<FilesRouteLoaderData> => {
  if (fileId == null) {
    return {
      selectedFileError: null
    };
  }

  try {
    await queryClient.fetchQuery({
      ...fileContentQueryOptions({
        fileId
      }),
      retry: false
    });

    return {
      selectedFileError: null
    };
  } catch (error) {
    return {
      selectedFileError: readPrefetchErrorMessage({
        error,
        fallback: 'The selected file preview could not be loaded.'
      })
    };
  }
};

const prefetchSelectedSkillLinkedFile = async ({
  fileId,
  queryClient,
  skillId
}: {
  fileId: string | null;
  queryClient: QueryClient;
  skillId: string;
}): Promise<SkillDetailRouteLoaderData> => {
  if (fileId == null) {
    return {
      selectedLinkedFileError: null
    };
  }

  try {
    await queryClient.fetchQuery({
      ...skillLinkedFileContentQueryOptions({
        fileId,
        skillId
      }),
      retry: false
    });

    return {
      selectedLinkedFileError: null
    };
  } catch (error) {
    return {
      selectedLinkedFileError: readPrefetchErrorMessage({
        error,
        fallback: 'The selected linked skill file could not be loaded.'
      })
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
  pendingComponent: RoutePending
});

const profileSearchSchema = z.object({
  profile: z.string().optional()
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(overviewQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions()),
      context.queryClient.ensureQueryData(sessionsQueryOptions()),
      context.queryClient.ensureQueryData(cronQueryOptions()),
      context.queryClient.ensureQueryData(memoryQueryOptions())
    ]),
  component: () => {
    const search = indexRoute.useSearch();

    return <HomePage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const sessionsSearchSchema = z.object({
  q: z.string().optional(),
  profile: z.string().optional(),
  agent: z.string().optional()
});

const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  validateSearch: (search) => sessionsSearchSchema.parse(search),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(sessionsQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions())
    ]),
  component: () => {
    const search = sessionsRoute.useSearch();
    const profileScope = normalizeProfileScope(search.profile ?? search.agent);

    return <SessionsPage initialQuery={search.q ?? ''} profileScope={profileScope} />;
  }
});

const sessionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions/$agentId/$sessionId',
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      sessionDetailQueryOptions({
        agentId: params.agentId,
        sessionId: params.sessionId
      })
    ),
  component: () => {
    const params = sessionDetailRoute.useParams();

    return <SessionDetailPage agentId={params.agentId} sessionId={params.sessionId} />;
  }
});

const cronRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cron',
  validateSearch: (search) => normalizeCronFilterSearch(search as Record<string, unknown>),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(cronQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions())
    ]),
  component: () => {
    const search = cronRoute.useSearch();

    return <CronPage cronSearch={search} profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const cronDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cron/$agentId/$jobId',
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        cronDetailQueryOptions({
          agentId: params.agentId,
          jobId: params.jobId
        })
      ),
      context.queryClient.ensureQueryData(cronQueryOptions())
    ]),
  component: () => {
    const params = cronDetailRoute.useParams();

    return <CronDetailPage agentId={params.agentId} jobId={params.jobId} />;
  }
});

const usageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usage',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(usageQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions())
    ]),
  component: () => {
    const search = usageRoute.useSearch();

    return <UsagePage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logs',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) => context.queryClient.ensureQueryData(logsQueryOptions()),
  component: () => {
    const search = logsRoute.useSearch();

    return <LogsPage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/skills',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) => context.queryClient.ensureQueryData(skillsQueryOptions()),
  component: () => {
    const search = skillsRoute.useSearch();

    return <SkillsPage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const skillDetailSearchSchema = z.object({
  file: z.string().optional()
});

const skillDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/skills/$skillId',
  validateSearch: (search) => skillDetailSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    selectedFileId: search.file ?? null
  }),
  loader: async ({ context, deps, params }) => {
    const { skillId } = params;

    const [, loaderData] = await Promise.all([
      context.queryClient.ensureQueryData(
        skillDetailQueryOptions({
          skillId
        })
      ),
      prefetchSelectedSkillLinkedFile({
        fileId: deps.selectedFileId,
        queryClient: context.queryClient,
        skillId
      })
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
        skillId={params.skillId}
      />
    );
  }
});

const memoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/memory',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(memoryQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions())
    ]),
  component: () => {
    const search = memoryRoute.useSearch();

    return <MemoryPage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const filesSearchSchema = z.object({
  file: z.string().optional(),
  profile: z.string().optional()
});

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files',
  validateSearch: (search) => filesSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    selectedFileId: search.file ?? null
  }),
  loader: async ({ context, deps }) => {
    const [, loaderData] = await Promise.all([
      context.queryClient.ensureQueryData(filesQueryOptions()),
      prefetchSelectedFileContent({
        fileId: deps.selectedFileId,
        queryClient: context.queryClient
      })
    ]);

    return loaderData;
  },
  component: () => {
    const loaderData = filesRoute.useLoaderData();
    const search = filesRoute.useSearch();

    return (
      <FilesPage
        profileScope={normalizeProfileScope(search.profile)}
        selectedFileError={loaderData.selectedFileError}
        selectedFileId={search.file ?? null}
      />
    );
  }
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/config',
  validateSearch: (search) => profileSearchSchema.parse(search),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(configQueryOptions()),
      context.queryClient.ensureQueryData(inventoryQueryOptions())
    ]),
  component: () => {
    const search = configRoute.useSearch();

    return <ConfigPage profileScope={normalizeProfileScope(search.profile)} />;
  }
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  sessionsRoute,
  sessionDetailRoute,
  cronRoute,
  cronDetailRoute,
  logsRoute,
  usageRoute,
  skillsRoute,
  skillDetailRoute,
  memoryRoute,
  filesRoute,
  configRoute
]);

export const createAppRouter = ({ history, queryClient }: { history?: RouterHistory; queryClient: QueryClient }) =>
  createRouter({
    context: {
      queryClient
    },
    defaultPreload: 'intent',
    ...(history == null ? {} : { history }),
    routeTree
  });

export const AppRouterProvider = ({ router }: { router: ReturnType<typeof createAppRouter> }) => (
  <RouterProvider router={router} />
);
