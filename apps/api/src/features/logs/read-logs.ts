import fs from 'node:fs';
import path from 'node:path';

import { resolveInventoryPathConfigFromEnv } from '@/features/inventory/resolve-path-config';
import { readHermesSessionsResult } from '@/features/sessions/read-hermes-sessions';
import { readTailTextFileResult } from '@/lib/read-tail-text-file-result';
import { createMissingPathIssue, createUnreadablePathIssue } from '@/lib/query-issue-factories';
import { createReadResult, type ReadResult } from '@/lib/read-result';
import { createHermesLogEvent, parseHermesLogLine } from '@hermes-console/runtime';
import type {
  HermesLogDetail,
  HermesLogEvent,
  HermesLogEventGroup,
  HermesLogEventSummary,
  HermesLogFileSummary,
  HermesLogLine,
  HermesLogsIndex,
  HermesLogSessionLink,
  HermesQueryIssue
} from '@hermes-console/runtime';

const LOG_SUMMARY_ANALYSIS_LINES = 200;
const TOP_LOG_EVENTS_LIMIT = 25;

const LOG_FILE_NAMES = ['agent.log', 'errors.log', 'gateway.log'] as const;

type AnalyzedLogFile = {
  summary: HermesLogFileSummary;
  events: HermesLogEvent[];
};

function clampRequestedLines(value: number) {
  return Math.min(Math.max(1, value), 500);
}

function parseLogLines(rawContent: string): HermesLogLine[] {
  return rawContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const parsedLine = parseHermesLogLine(line);

      return {
        id: `${index}:${line.slice(0, 24)}`,
        lineNumber: index + 1,
        timestamp: parsedLine.timestamp,
        level: parsedLine.level,
        text: line
      };
    });
}

function createEventsForLines({
  lines,
  logId,
  logName
}: {
  lines: string[];
  logId: string;
  logName: string;
}): HermesLogEvent[] {
  return lines.flatMap((line, index) => {
    const event = createHermesLogEvent({
      lineNumber: index + 1,
      logId,
      logName,
      rawLine: line
    });

    return event ? [event] : [];
  });
}

function buildLogAnalysis(logPath: string): AnalyzedLogFile | null {
  const stat = fs.statSync(logPath);
  const tail = readTailTextFileResult(logPath, LOG_SUMMARY_ANALYSIS_LINES);

  if (tail.status !== 'ready') {
    return null;
  }

  const lines = parseLogLines(tail.content);
  const rawLines = tail.content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const logId = path.basename(logPath);
  const logName = path.basename(logPath);

  return {
    summary: {
      id: logId,
      name: logName,
      path: logPath,
      fileSize: stat.size,
      lastModifiedMs: stat.mtimeMs,
      analyzedLineCount: lines.length,
      errorLineCount: lines.filter((line) => line.level === 'error').length,
      warningLineCount: lines.filter((line) => line.level === 'warning').length,
      infoLineCount: lines.filter((line) => line.level === 'info').length,
      debugLineCount: lines.filter((line) => line.level === 'debug').length
    },
    events: createEventsForLines({
      lines: rawLines,
      logId,
      logName
    })
  };
}

function compareEventsByRecency(left: HermesLogEvent, right: HermesLogEvent): number {
  const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
  const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  if (left.logName !== right.logName) {
    return left.logName.localeCompare(right.logName);
  }

  return right.lineNumber - left.lineNumber;
}

function compareGroupRecency(left: HermesLogEventGroup, right: HermesLogEventGroup): number {
  const leftTime = left.latestTimestamp ? new Date(left.latestTimestamp).getTime() : 0;
  const rightTime = right.latestTimestamp ? new Date(right.latestTimestamp).getTime() : 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.errorCount + right.warningCount - (left.errorCount + left.warningCount);
}

function createEventGroups(
  events: HermesLogEvent[],
  resolveGroup: (event: HermesLogEvent) => string
): HermesLogEventGroup[] {
  const groups = events.reduce((groupMap, event) => {
    const label = resolveGroup(event);
    const current = groupMap.get(label) ?? {
      id: label,
      label,
      errorCount: 0,
      warningCount: 0,
      latestTimestamp: null
    };
    const eventTime = event.timestamp ? new Date(event.timestamp).getTime() : 0;
    const latestTime = current.latestTimestamp ? new Date(current.latestTimestamp).getTime() : 0;

    groupMap.set(label, {
      ...current,
      errorCount: current.errorCount + (event.level === 'error' ? 1 : 0),
      warningCount: current.warningCount + (event.level === 'warning' ? 1 : 0),
      latestTimestamp: eventTime > latestTime ? event.timestamp : current.latestTimestamp
    });

    return groupMap;
  }, new Map<string, HermesLogEventGroup>());

  return [...groups.values()].sort(compareGroupRecency);
}

function createEmptyLogEventSummary(): HermesLogEventSummary {
  return {
    analyzedLineCount: 0,
    recentErrorCount: 0,
    recentWarningCount: 0,
    topEvents: [],
    componentGroups: [],
    fileGroups: []
  };
}

function resolveSessionLinks(events: HermesLogEvent[]): Map<string, HermesLogSessionLink> {
  const eventSessionIds = [...new Set(events.flatMap((event) => (event.sessionId ? [event.sessionId] : [])))];

  if (eventSessionIds.length === 0) {
    return new Map();
  }

  const sessions = readHermesSessionsResult().data.sessions;
  const sessionIds = new Set(eventSessionIds);
  const linksBySessionId = sessions
    .filter((session) => sessionIds.has(session.sessionId))
    .reduce((linkMap, session) => {
      const current = linkMap.get(session.sessionId) ?? [];

      linkMap.set(session.sessionId, [
        ...current,
        {
          agentId: session.agentId,
          sessionId: session.sessionId,
          href: `/sessions/${encodeURIComponent(session.agentId)}/${encodeURIComponent(session.sessionId)}`
        }
      ]);

      return linkMap;
    }, new Map<string, HermesLogSessionLink[]>());

  return [...linksBySessionId.entries()].reduce((linkMap, [sessionId, links]) => {
    if (links.length === 1 && links[0]) {
      linkMap.set(sessionId, links[0]);
    }

    return linkMap;
  }, new Map<string, HermesLogSessionLink>());
}

function createLogEventSummary({
  analyzedLineCount,
  events
}: {
  analyzedLineCount: number;
  events: HermesLogEvent[];
}): HermesLogEventSummary {
  const sortedEvents = [...events].sort(compareEventsByRecency);
  const topEvents = sortedEvents.slice(0, TOP_LOG_EVENTS_LIMIT);
  const sessionLinks = resolveSessionLinks(topEvents);
  const linkedTopEvents = topEvents.map((event) => ({
    ...event,
    sessionLink: event.sessionId ? (sessionLinks.get(event.sessionId) ?? null) : null
  }));

  return {
    analyzedLineCount,
    recentErrorCount: events.filter((event) => event.level === 'error').length,
    recentWarningCount: events.filter((event) => event.level === 'warning').length,
    topEvents: linkedTopEvents,
    componentGroups: createEventGroups(events, (event) => event.component ?? 'unknown'),
    fileGroups: createEventGroups(events, (event) => event.logName)
  };
}

function createLogsDirectoryIssue(logsRoot: string, installationExists: boolean): HermesQueryIssue {
  return createMissingPathIssue({
    id: 'logs-directory-missing',
    summary: 'No Hermes logs directory found',
    detail: 'Hermes Console did not find the expected logs directory under the configured Hermes root.',
    path: logsRoot,
    severity: installationExists ? 'warning' : 'error'
  });
}

export function readHermesLogsResult(): ReadResult<HermesLogsIndex> {
  const hermesRoot = resolveInventoryPathConfigFromEnv().hermesRoot.path;
  const logsRoot = path.join(hermesRoot, 'logs');
  const hermesRootExists = fs.existsSync(hermesRoot);
  const issues: HermesQueryIssue[] = [];

  if (!hermesRootExists) {
    issues.push(
      createMissingPathIssue({
        id: 'logs-hermes-root-missing',
        summary: 'Hermes root not found',
        detail: 'Log files could not be inspected because the configured Hermes root does not exist.',
        path: hermesRoot,
        severity: 'error'
      })
    );
  }

  if (!fs.existsSync(logsRoot)) {
    issues.push(createLogsDirectoryIssue(logsRoot, hermesRootExists));

    return createReadResult({
      data: {
        logs: [],
        eventSummary: createEmptyLogEventSummary()
      },
      issues
    });
  }

  const logPaths = fs
    .readdirSync(logsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.log'))
    .map((entry) => path.join(logsRoot, entry.name))
    .sort((left, right) => {
      const leftPriority = LOG_FILE_NAMES.indexOf(path.basename(left) as (typeof LOG_FILE_NAMES)[number]);
      const rightPriority = LOG_FILE_NAMES.indexOf(path.basename(right) as (typeof LOG_FILE_NAMES)[number]);

      if (leftPriority !== -1 || rightPriority !== -1) {
        return (
          (leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority) -
          (rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority)
        );
      }

      return left.localeCompare(right);
    });

  const logs = logPaths.flatMap((logPath) => {
    try {
      const analysis = buildLogAnalysis(logPath);

      if (!analysis) {
        issues.push(
          createUnreadablePathIssue({
            id: `logs-summary-unreadable:${logPath}`,
            summary: 'Log summary could not be read',
            detail: 'Hermes Console could not inspect this log file for summary metadata.',
            path: logPath
          })
        );

        return [];
      }

      return [analysis];
    } catch (error) {
      issues.push(
        createUnreadablePathIssue({
          id: `logs-summary-unreadable:${logPath}`,
          summary: 'Log summary could not be read',
          detail: error instanceof Error ? error.message : 'Hermes Console could not inspect this log file.',
          path: logPath
        })
      );

      return [];
    }
  });

  return createReadResult({
    data: {
      logs: logs.map((log) => log.summary),
      eventSummary: createLogEventSummary({
        analyzedLineCount: logs.reduce((sum, log) => sum + log.summary.analyzedLineCount, 0),
        events: logs.flatMap((log) => log.events)
      })
    },
    issues
  });
}

export function readHermesLogDetailResult({
  lines,
  logId
}: {
  lines: number;
  logId: string;
}): ReadResult<HermesLogDetail> | null {
  const index = readHermesLogsResult();
  const selectedLog = index.data.logs.find((log) => log.id === logId);

  if (!selectedLog) {
    return null;
  }

  const requestedLines = clampRequestedLines(lines);
  const tail = readTailTextFileResult(selectedLog.path, requestedLines);

  if (tail.status === 'missing') {
    return createReadResult({
      data: {
        file: selectedLog,
        requestedLines,
        returnedLines: 0,
        lines: []
      },
      issues: [
        ...index.issues,
        createMissingPathIssue({
          id: `logs-detail-missing:${selectedLog.path}`,
          summary: 'Log file not found',
          detail: 'The requested log file was not present when Hermes Console tried to read it.',
          path: selectedLog.path
        })
      ]
    });
  }

  if (tail.status === 'unreadable') {
    return createReadResult({
      data: {
        file: selectedLog,
        requestedLines,
        returnedLines: 0,
        lines: []
      },
      issues: [
        ...index.issues,
        createUnreadablePathIssue({
          id: `logs-detail-unreadable:${selectedLog.path}`,
          summary: 'Log file could not be read',
          detail: tail.detail,
          path: selectedLog.path
        })
      ]
    });
  }

  const parsedLines = parseLogLines(tail.content);

  return createReadResult({
    data: {
      file: selectedLog,
      requestedLines,
      returnedLines: parsedLines.length,
      lines: parsedLines
    },
    issues: index.issues
  });
}
