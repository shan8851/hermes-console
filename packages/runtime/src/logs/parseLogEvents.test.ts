import { describe, expect, it } from 'vitest';

import { createHermesLogEvent, parseHermesLogLine } from './parseLogEvents.js';

const expectedIsoTimestamp = new Date('2026-04-05T22:35:00.123').toISOString();

describe('parseHermesLogLine', () => {
  it('parses Hermes log timestamp, level, session, logger, component, and bounded message', () => {
    const parsed = parseHermesLogLine(`2026-04-05 22:35:00,123 ERROR [session-1] gateway.sessions: ${'x'.repeat(300)}`);

    expect(parsed).toEqual(
      expect.objectContaining({
        timestamp: expectedIsoTimestamp,
        level: 'error',
        rawLevel: 'ERROR',
        logger: 'gateway.sessions',
        component: 'gateway',
        sessionId: 'session-1',
        message: 'x'.repeat(280),
        messageOmittedCharCount: 20
      })
    );
  });

  it('normalizes warning and critical aliases', () => {
    expect(parseHermesLogLine('2026-04-05 22:35:00 WARN cron.runner: slow job').level).toBe('warning');
    expect(parseHermesLogLine('2026-04-05 22:35:00 CRITICAL tools.shell: command failed').level).toBe('error');
  });

  it('falls back to bounded raw-line parsing when the structured format is missing', () => {
    const parsed = parseHermesLogLine(`ERROR ${'private context '.repeat(200)}`);

    expect(parsed).toEqual(
      expect.objectContaining({
        timestamp: null,
        level: 'error',
        logger: null,
        component: null,
        sessionId: null,
        messageOmittedCharCount: expect.any(Number),
        rawLineOmittedCharCount: expect.any(Number)
      })
    );
    expect(parsed.message.length).toBe(280);
    expect(parsed.rawLine.length).toBe(2_000);
  });
});

describe('createHermesLogEvent', () => {
  it('creates warning/error events and ignores lower-severity lines', () => {
    expect(
      createHermesLogEvent({
        lineNumber: 4,
        logId: 'agent.log',
        logName: 'agent.log',
        rawLine: '2026-04-05 22:35:00 WARNING [session-1] agent.runner: needs review'
      })
    ).toEqual(
      expect.objectContaining({
        id: 'agent.log:4:WARNING',
        level: 'warning',
        sessionLink: null
      })
    );

    expect(
      createHermesLogEvent({
        lineNumber: 5,
        logId: 'agent.log',
        logName: 'agent.log',
        rawLine: '2026-04-05 22:36:00 INFO agent.runner: ok'
      })
    ).toBeNull();
  });
});
