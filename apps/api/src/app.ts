import { readFileSync } from 'node:fs';

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { ServerConfig } from '@/config';
import { readHermesCronDetail } from '@/features/cron/read-cron-detail';
import { readHermesCronQuery } from '@/features/cron/query-cron';
import { readHermesInventoryQuery } from '@/features/inventory/query-inventory';
import { readKeyFileContentQuery, readKeyFilesDataQuery } from '@/features/key-files/query-key-files';
import { readHermesLogDetailQuery, readHermesLogsQuery } from '@/features/logs/query-logs';
import { readHermesMemoryQuery } from '@/features/memory/query-memory';
import { readHermesCliDiagnostics, readHermesVersionSummary } from '@/features/runtime-overview/hermes-cli-diagnostics';
import { readRuntimeOverviewQuery } from '@/features/runtime-overview/query-runtime-overview';
import { readShellStatusQuery } from '@/features/runtime-overview/query-shell-status';
import { readHermesSessionsQuery } from '@/features/sessions/query-sessions';
import { readSkillDocumentDetailQuery, readSkillLinkedFileContentQuery } from '@/features/skills/query-skill-detail';
import { readHermesSkillsQuery } from '@/features/skills/query-skills';
import { readHermesUsageQuery } from '@/features/usage/query-usage';
import { createLiveSnapshotEnvelope } from '@/lib/http-envelope';
import { registerStaticSite } from '@/static-site';
import type { AppMeta, DiagnosticsResponse } from '@hermes-console/runtime';

const notFound = (message: string): never => {
  throw new HTTPException(404, { message });
};

const logUnexpectedServerError = (error: unknown): void => {
  console.error('[hermes-console] unexpected server error', error);
};

const appPackageSchema = z.object({
  version: z.string()
});

const logDetailLinesSchema = z.coerce.number().int().min(1).max(500).catch(50);

const readAppVersion = (): string | undefined => {
  try {
    const packageContent = readFileSync(new URL('../../../package.json', import.meta.url), 'utf8');
    const parsedPackage = appPackageSchema.parse(JSON.parse(packageContent) as unknown);

    return parsedPackage.version;
  } catch {
    return undefined;
  }
};

const appVersion = readAppVersion();

const createAppMeta = (): AppMeta => {
  const shellStatus = readShellStatusQuery();
  const hermesVersion = readHermesVersionSummary();

  return {
    connectedPlatforms: shellStatus.data.connectedPlatforms,
    connectedPlatformCount: shellStatus.data.connectedPlatformCount,
    gatewayState: shellStatus.data.gatewayState,
    hermesBuildDate: hermesVersion.buildDate,
    hermesVersion: hermesVersion.version,
    installStatus: shellStatus.data.installStatus,
    rootKind: shellStatus.data.rootKind,
    rootPath: shellStatus.data.rootPath,
    updateCheckedAt: shellStatus.data.updateCheckedAt,
    updateBehind: shellStatus.data.updateBehind,
    updateStatus: shellStatus.data.updateStatus,
    version: appVersion
  };
};

const createLiveDiagnosticsResponse = async (): Promise<DiagnosticsResponse> => {
  const diagnostics = await readHermesCliDiagnostics();
  const capturedAt = diagnostics.status.capturedAt ?? diagnostics.doctor.capturedAt ?? null;

  return {
    data: {
      doctor: diagnostics.doctor,
      status: diagnostics.status
    },
    issues: diagnostics.issues,
    meta: {
      capturedAt,
      dataStatus:
        capturedAt == null && diagnostics.issues.length > 0
          ? 'missing'
          : diagnostics.issues.length > 0
            ? 'partial'
            : 'ready'
    }
  };
};

export const createApp = ({ config }: { config: ServerConfig }) => {
  const app = new Hono();

  app.onError((error, context) => {
    if (error instanceof HTTPException) {
      return context.json(
        {
          error: error.message
        },
        error.status
      );
    }

    logUnexpectedServerError(error);

    return context.json(
      {
        error: 'Unexpected server error'
      },
      500
    );
  });

  app.get('/api/health', (context) =>
    context.json({
      ok: true
    })
  );

  app.get('/api/meta/app', (context) => context.json(createAppMeta()));

  app.get('/api/runtime/overview', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readRuntimeOverviewQuery()
      })
    )
  );

  app.get('/api/runtime/diagnostics', async (context) => context.json(await createLiveDiagnosticsResponse()));

  app.get('/api/inventory', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesInventoryQuery()
      })
    )
  );

  app.get('/api/memory', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesMemoryQuery()
      })
    )
  );

  app.get('/api/files', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readKeyFilesDataQuery()
      })
    )
  );

  app.get('/api/files/:fileId', (context) => {
    const fileContent = readKeyFileContentQuery({
      fileId: context.req.param('fileId')
    });

    if (fileContent == null) {
      return notFound(`File not found for ${context.req.param('fileId')}`);
    }

    return context.json(
      createLiveSnapshotEnvelope({
        result: fileContent
      })
    );
  });

  app.get('/api/skills', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesSkillsQuery()
      })
    )
  );

  app.get('/api/skills/:skillId', (context) => {
    const skillDetail = readSkillDocumentDetailQuery({
      skillId: context.req.param('skillId')
    });

    if (skillDetail == null) {
      return notFound(`Skill not found for ${context.req.param('skillId')}`);
    }

    return context.json(
      createLiveSnapshotEnvelope({
        result: skillDetail
      })
    );
  });

  app.get('/api/skills/:skillId/files/:fileId', (context) => {
    const linkedFile = readSkillLinkedFileContentQuery({
      fileId: context.req.param('fileId'),
      skillId: context.req.param('skillId')
    });

    if (linkedFile == null) {
      return notFound(`Linked skill file not found for ${context.req.param('skillId')}/${context.req.param('fileId')}`);
    }

    return context.json(
      createLiveSnapshotEnvelope({
        result: linkedFile
      })
    );
  });

  app.get('/api/sessions', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesSessionsQuery()
      })
    )
  );

  app.get('/api/logs', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesLogsQuery()
      })
    )
  );

  app.get('/api/logs/:logId', (context) => {
    const detailResult = readHermesLogDetailQuery({
      logId: context.req.param('logId'),
      lines: logDetailLinesSchema.parse(context.req.query('lines'))
    });

    if (detailResult == null) {
      return notFound(`Log detail not found for ${context.req.param('logId')}`);
    }

    return context.json(createLiveSnapshotEnvelope({ result: detailResult }));
  });

  app.get('/api/cron', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesCronQuery()
      })
    )
  );

  app.get('/api/cron/:agentId/:jobId', (context) => {
    const detailResult = readHermesCronDetail({
      agentId: context.req.param('agentId'),
      jobId: context.req.param('jobId')
    });

    if (detailResult == null) {
      return notFound(`Cron detail not found for ${context.req.param('agentId')}/${context.req.param('jobId')}`);
    }

    return context.json(
      createLiveSnapshotEnvelope({
        result: {
          data: detailResult.data,
          capturedAt: new Date().toISOString(),
          status: detailResult.issues.length > 0 ? 'partial' : 'ready',
          issues: detailResult.issues
        }
      })
    );
  });

  app.get('/api/usage', (context) =>
    context.json(
      createLiveSnapshotEnvelope({
        result: readHermesUsageQuery()
      })
    )
  );

  registerStaticSite({
    app,
    webDistDir: config.webDistDir
  });

  return app;
};
