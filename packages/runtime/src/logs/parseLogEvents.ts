import type { HermesLogEvent, HermesLogLevel } from './types.js';

const LOG_LINE_PATTERN =
  /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:,(\d{3}))?\s+([A-Z]+)(?:\s+\[([^\]]+)\])?\s+(\S+):\s?(.*)$/;

const RAW_LEVEL_PATTERN = /\b(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL)\b/i;

const COMPONENT_PREFIXES = [
  { component: 'gateway', prefixes: ['gateway'] },
  { component: 'agent', prefixes: ['agent', 'run_agent', 'model_tools', 'batch_runner'] },
  { component: 'tools', prefixes: ['tools'] },
  { component: 'cli', prefixes: ['hermes_cli', 'cli'] },
  { component: 'cron', prefixes: ['cron'] }
] as const;

const MAX_EVENT_MESSAGE_CHARS = 280;
const MAX_EVENT_RAW_LINE_CHARS = 2_000;

export type ParsedHermesLogLine = {
  timestamp: string | null;
  level: HermesLogLevel;
  rawLevel: string | null;
  logger: string | null;
  component: string | null;
  sessionId: string | null;
  message: string;
  messageOmittedCharCount: number;
  rawLine: string;
  rawLineOmittedCharCount: number;
};

const boundText = (
  value: string,
  maxLength: number
): {
  text: string;
  omittedCharCount: number;
} => {
  if (value.length <= maxLength) {
    return {
      text: value,
      omittedCharCount: 0
    };
  }

  return {
    text: value.slice(0, maxLength),
    omittedCharCount: value.length - maxLength
  };
};

const normalizeRawLevel = (rawLevel: string | null): HermesLogLevel => {
  const normalizedLevel = rawLevel?.toUpperCase();

  if (normalizedLevel === 'ERROR' || normalizedLevel === 'CRITICAL') {
    return 'error';
  }

  if (normalizedLevel === 'WARN' || normalizedLevel === 'WARNING') {
    return 'warning';
  }

  if (normalizedLevel === 'INFO') {
    return 'info';
  }

  if (normalizedLevel === 'DEBUG') {
    return 'debug';
  }

  return 'other';
};

const parseTimestamp = ({ date, milliseconds, time }: { date: string; milliseconds: string | null; time: string }) => {
  const parsedDate = new Date(`${date}T${time}.${milliseconds ?? '000'}`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const resolveKnownComponent = (logger: string): string | null => {
  const knownComponent = COMPONENT_PREFIXES.find(({ prefixes }) =>
    prefixes.some((prefix) => logger === prefix || logger.startsWith(`${prefix}.`))
  );

  if (knownComponent) {
    return knownComponent.component;
  }

  return logger.split('.')[0] ?? null;
};

export const parseHermesLogLine = (rawLine: string): ParsedHermesLogLine => {
  const formattedMatch = rawLine.match(LOG_LINE_PATTERN);
  const rawLineBounds = boundText(rawLine, MAX_EVENT_RAW_LINE_CHARS);

  if (formattedMatch) {
    const [, date, time, milliseconds, rawLevel, sessionId, logger, rawMessage] = formattedMatch;
    const messageBounds = boundText(rawMessage ?? '', MAX_EVENT_MESSAGE_CHARS);
    const resolvedLogger = logger ?? null;

    return {
      timestamp: date && time ? parseTimestamp({ date, milliseconds: milliseconds ?? null, time }) : null,
      level: normalizeRawLevel(rawLevel ?? null),
      rawLevel: rawLevel ?? null,
      logger: resolvedLogger,
      component: resolvedLogger ? resolveKnownComponent(resolvedLogger) : null,
      sessionId: sessionId ?? null,
      message: messageBounds.text,
      messageOmittedCharCount: messageBounds.omittedCharCount,
      rawLine: rawLineBounds.text,
      rawLineOmittedCharCount: rawLineBounds.omittedCharCount
    };
  }

  const rawLevel = rawLine.match(RAW_LEVEL_PATTERN)?.[1] ?? null;
  const messageBounds = boundText(rawLine, MAX_EVENT_MESSAGE_CHARS);

  return {
    timestamp: null,
    level: normalizeRawLevel(rawLevel),
    rawLevel,
    logger: null,
    component: null,
    sessionId: null,
    message: messageBounds.text,
    messageOmittedCharCount: messageBounds.omittedCharCount,
    rawLine: rawLineBounds.text,
    rawLineOmittedCharCount: rawLineBounds.omittedCharCount
  };
};

export const createHermesLogEvent = ({
  lineNumber,
  logId,
  logName,
  rawLine
}: {
  lineNumber: number;
  logId: string;
  logName: string;
  rawLine: string;
}): HermesLogEvent | null => {
  const parsedLine = parseHermesLogLine(rawLine);

  if (parsedLine.level !== 'error' && parsedLine.level !== 'warning') {
    return null;
  }

  return {
    id: `${logId}:${lineNumber}:${parsedLine.rawLevel ?? parsedLine.level}`,
    logId,
    logName,
    lineNumber,
    timestamp: parsedLine.timestamp,
    level: parsedLine.level,
    rawLevel: parsedLine.rawLevel,
    logger: parsedLine.logger,
    component: parsedLine.component,
    sessionId: parsedLine.sessionId,
    message: parsedLine.message,
    messageOmittedCharCount: parsedLine.messageOmittedCharCount,
    rawLine: parsedLine.rawLine,
    rawLineOmittedCharCount: parsedLine.rawLineOmittedCharCount,
    sessionLink: null
  };
};
