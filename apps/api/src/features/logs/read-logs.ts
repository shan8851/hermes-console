import fs from 'node:fs';
import path from 'node:path';

import { resolveInventoryPathConfigFromEnv } from '@/features/inventory/resolve-path-config';
import { readTailTextFileResult } from '@/lib/read-tail-text-file-result';
import { createMissingPathIssue, createUnreadablePathIssue } from '@/lib/query-issue-factories';
import { createReadResult, type ReadResult } from '@/lib/read-result';
import type {
  HermesLogDetail,
  HermesLogFileSummary,
  HermesLogLevel,
  HermesLogLine,
  HermesLogsIndex,
  HermesQueryIssue
} from '@hermes-console/runtime';

const LOG_SUMMARY_ANALYSIS_LINES = 200;

const LOG_FILE_NAMES = ['agent.log', 'errors.log', 'gateway.log'] as const;

const LOG_LEVEL_PATTERN = /\b(ERROR|WARN(?:ING)?|INFO|DEBUG)\b/i;
const LOG_TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:,\d{3})?)/;

function clampRequestedLines(value: number) {
  return Math.min(Math.max(1, value), 500);
}

function resolveLogLevel(text: string): HermesLogLevel {
  const match = text.match(LOG_LEVEL_PATTERN);
  const level = match?.[1]?.toLowerCase();

  if (level === 'error') {
    return 'error';
  }

  if (level === 'warn' || level === 'warning') {
    return 'warning';
  }

  if (level === 'info') {
    return 'info';
  }

  if (level === 'debug') {
    return 'debug';
  }

  return 'other';
}

function parseLogTimestamp(text: string) {
  const rawTimestamp = text.match(LOG_TIMESTAMP_PATTERN)?.[1];

  if (!rawTimestamp) {
    return null;
  }

  const parsed = new Date(rawTimestamp.replace(' ', 'T').replace(',', '.'));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseLogLines(rawContent: string): HermesLogLine[] {
  return rawContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => ({
      id: `${index}:${line.slice(0, 24)}`,
      lineNumber: index + 1,
      timestamp: parseLogTimestamp(line),
      level: resolveLogLevel(line),
      text: line
    }));
}

function buildLogSummary(logPath: string): HermesLogFileSummary | null {
  const stat = fs.statSync(logPath);
  const tail = readTailTextFileResult(logPath, LOG_SUMMARY_ANALYSIS_LINES);

  if (tail.status !== 'ready') {
    return null;
  }

  const lines = parseLogLines(tail.content);

  return {
    id: path.basename(logPath),
    name: path.basename(logPath),
    path: logPath,
    fileSize: stat.size,
    lastModifiedMs: stat.mtimeMs,
    analyzedLineCount: lines.length,
    errorLineCount: lines.filter((line) => line.level === 'error').length,
    warningLineCount: lines.filter((line) => line.level === 'warning').length,
    infoLineCount: lines.filter((line) => line.level === 'info').length,
    debugLineCount: lines.filter((line) => line.level === 'debug').length
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
        logs: []
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
      const summary = buildLogSummary(logPath);

      if (!summary) {
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

      return [summary];
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
      logs
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
