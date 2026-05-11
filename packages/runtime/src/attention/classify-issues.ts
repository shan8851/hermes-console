import type { HermesQueryIssue } from '../hermes-query.js';
import type { AttentionDomain, AttentionItem, AttentionSeverity } from './types.js';

const OPTIONAL_MISSING_ISSUE_IDS = new Set([
  'runtime-channel-directory-missing',
  'runtime-gateway-state-missing',
  'runtime-update-cache-missing',
  'logs-directory-missing',
  'logs-sources-missing',
  'sessions-state-db-missing',
  'skills-root-missing'
]);

const OPTIONAL_MISSING_ID_PREFIXES = ['memory-missing:'];

const EXPECTED_STATE_DB_ISSUE_IDS = new Set(['sessions-sources-missing']);

const DOMAIN_PREFIXES: Array<{ domain: AttentionDomain; prefixes: string[] }> = [
  { domain: 'cron', prefixes: ['cron-'] },
  { domain: 'logs', prefixes: ['logs-'] },
  { domain: 'config', prefixes: ['config-', 'runtime-config-'] },
  { domain: 'skills', prefixes: ['skills-', 'skill-'] },
  { domain: 'memory', prefixes: ['memory-'] },
  { domain: 'sessions', prefixes: ['sessions-'] },
  { domain: 'files', prefixes: ['files-', 'key-files-', 'file-'] },
  { domain: 'gateway', prefixes: ['gateway-', 'runtime-gateway-'] }
];

const PATH_DOMAIN_PARTS: Array<{ domain: AttentionDomain; parts: string[] }> = [
  { domain: 'config', parts: ['config.yaml'] },
  { domain: 'logs', parts: ['/logs/', '\\logs\\', '.log'] },
  { domain: 'memory', parts: ['memory.md', 'user.md', '/memories/', '\\memories\\'] },
  { domain: 'skills', parts: ['/skills/', '\\skills\\', 'skill.md'] },
  { domain: 'sessions', parts: ['state.db', '/sessions/', '\\sessions\\'] },
  { domain: 'cron', parts: ['/cron/', '\\cron\\', 'jobs.json'] },
  { domain: 'gateway', parts: ['gateway_state.json'] }
];

const isOptionalMissingIssue = (issue: HermesQueryIssue): boolean =>
  issue.code === 'missing_path' &&
  (OPTIONAL_MISSING_ISSUE_IDS.has(issue.id) ||
    OPTIONAL_MISSING_ID_PREFIXES.some((prefix) => issue.id.startsWith(prefix)));

const resolveDomainFromId = (id: string): AttentionDomain | null => {
  const match = DOMAIN_PREFIXES.find(({ prefixes }) => prefixes.some((prefix) => id.startsWith(prefix)));
  return match?.domain ?? null;
};

const resolveDomainFromPath = (path: string | undefined): AttentionDomain | null => {
  if (!path) {
    return null;
  }

  const normalizedPath = path.toLowerCase();
  const match = PATH_DOMAIN_PARTS.find(({ parts }) => parts.some((part) => normalizedPath.includes(part)));
  return match?.domain ?? null;
};

export const resolveIssueAttentionDomain = (issue: HermesQueryIssue): AttentionDomain =>
  resolveDomainFromId(issue.id) ?? resolveDomainFromPath(issue.path) ?? 'runtime';

const resolveIssueAttentionSeverity = (issue: HermesQueryIssue, isOptionalSurface: boolean): AttentionSeverity => {
  if (isOptionalSurface || issue.code === 'scan_disabled') {
    return 'info';
  }

  if (issue.severity === 'error') {
    return issue.id.includes('hermes-root-missing') || issue.id === 'runtime-hermes-root-missing'
      ? 'critical'
      : 'warning';
  }

  if (issue.code === 'missing_dependency' || issue.code === 'parse_failed' || issue.code === 'unreadable_path') {
    return 'warning';
  }

  if (EXPECTED_STATE_DB_ISSUE_IDS.has(issue.id)) {
    return 'warning';
  }

  return issue.severity === 'warning' ? 'warning' : 'info';
};

export const isIssueAttentionActionable = (issue: HermesQueryIssue): boolean =>
  issue.code === 'missing_dependency' ||
  issue.code === 'parse_failed' ||
  issue.code === 'unreadable_path' ||
  issue.severity === 'error' ||
  EXPECTED_STATE_DB_ISSUE_IDS.has(issue.id) ||
  issue.id.includes('config');

export const classifyHermesQueryIssue = (issue: HermesQueryIssue): AttentionItem | null => {
  const isOptionalSurface = isOptionalMissingIssue(issue) || issue.code === 'scan_disabled';
  const severity = resolveIssueAttentionSeverity(issue, isOptionalSurface);

  if (isOptionalSurface) {
    return null;
  }

  if (severity === 'info' && !isIssueAttentionActionable(issue)) {
    return null;
  }

  return {
    id: `issue:${issue.id}`,
    severity,
    domain: resolveIssueAttentionDomain(issue),
    title: issue.summary,
    summary: issue.detail,
    ...(issue.path ? { evidence: issue.path } : {}),
    isActionable: isIssueAttentionActionable(issue),
    isOptionalSurface
  };
};
