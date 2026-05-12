import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogsBrowser } from '@/features/logs/components/logs-browser';
import type { HermesLogEventSummary, HermesLogFileSummary } from '@hermes-console/runtime';

const isoTimestamp = '2026-04-05T22:35:00.000Z';

const createSnapshotEnvelope = <T,>(data: T) => ({
  data,
  issues: [],
  meta: {
    capturedAt: isoTimestamp,
    dataStatus: 'ready' as const
  }
});

const logFile: HermesLogFileSummary = {
  id: 'agent.log',
  name: 'agent.log',
  path: '/tmp/hermes/logs/agent.log',
  fileSize: 1024,
  lastModifiedMs: 1_775_343_300_000,
  analyzedLineCount: 1,
  errorLineCount: 1,
  warningLineCount: 0,
  infoLineCount: 0,
  debugLineCount: 0
};

const eventSummary: HermesLogEventSummary = {
  analyzedLineCount: 1,
  recentErrorCount: 1,
  recentWarningCount: 0,
  topEvents: [
    {
      id: 'agent.log:1:ERROR',
      logId: 'agent.log',
      logName: 'agent.log',
      lineNumber: 1,
      timestamp: isoTimestamp,
      level: 'error',
      rawLevel: 'ERROR',
      logger: 'gateway.sessions',
      component: 'gateway',
      sessionId: 'session-1',
      message: 'Session failed',
      messageOmittedCharCount: 0,
      rawLine: '2026-04-05 22:35:00 ERROR [session-1] gateway.sessions: Session failed',
      rawLineOmittedCharCount: 0,
      sessionLink: {
        agentId: 'default',
        sessionId: 'session-1',
        href: '/sessions/default/session-1'
      }
    }
  ],
  componentGroups: [
    {
      id: 'gateway',
      label: 'gateway',
      errorCount: 1,
      warningCount: 0,
      latestTimestamp: isoTimestamp
    }
  ],
  fileGroups: [
    {
      id: 'agent.log',
      label: 'agent.log',
      errorCount: 1,
      warningCount: 0,
      latestTimestamp: isoTimestamp
    }
  ]
};

const renderLogsBrowser = async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify(
            createSnapshotEnvelope({
              file: logFile,
              requestedLines: 50,
              returnedLines: 1,
              lines: [
                {
                  id: '0:2026-04-05 22:35:00 ERR',
                  lineNumber: 1,
                  timestamp: isoTimestamp,
                  level: 'error',
                  text: '2026-04-05 22:35:00 ERROR [session-1] gateway.sessions: Loaded detail line'
                }
              ]
            })
          ),
          {
            headers: {
              'Content-Type': 'application/json'
            },
            status: 200
          }
        )
    )
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
  const rootRoute = createRootRoute({
    component: Outlet
  });
  const logsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <LogsBrowser eventSummary={eventSummary} loadedAt={isoTimestamp} logs={[logFile]} refreshQueryKeys={[]} />
    )
  });
  const sessionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sessions/$agentId/$sessionId',
    component: () => <div>Session route</div>
  });
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: ['/']
    }),
    routeTree: rootRoute.addChildren([logsRoute, sessionRoute])
  });

  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

describe('LogsBrowser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows event summaries before raw logs and expands raw context on request', async () => {
    await renderLogsBrowser();

    expect(await screen.findByText('Recent warnings and errors')).toBeTruthy();
    expect(screen.getByText('Session failed')).toBeTruthy();
    expect(screen.queryByText(eventSummary.topEvents[0]?.rawLine ?? '')).toBeNull();
    expect(screen.getByRole('link', { name: 'session session-1' }).getAttribute('href')).toBe(
      '/sessions/default/session-1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show raw' }));

    expect(screen.getByText(eventSummary.topEvents[0]?.rawLine ?? '')).toBeTruthy();
    expect(await screen.findByText('Filter the currently loaded tail window by level or text.')).toBeTruthy();
  });
});
