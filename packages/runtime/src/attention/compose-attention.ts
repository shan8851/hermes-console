import type { HermesQueryIssue } from '../hermes-query.js';
import type { HermesLogFileSummary } from '../logs/types.js';
import type { MemoryPressureLevel } from '../memory/types.js';
import type { DoctorSnapshotSummary, GatewaySummary, UpdateStatusSummary } from '../runtime-overview/types.js';
import type { SkillSummary } from '../skills/types.js';
import { classifyHermesQueryIssue } from './classify-issues.js';
import type { AttentionDomain, AttentionItem, AttentionSeverity } from './types.js';

const ATTENTION_SEVERITY_RANK: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2
};

const ATTENTION_DOMAIN_RANK: Record<AttentionDomain, number> = {
  runtime: 0,
  gateway: 1,
  cron: 2,
  logs: 3,
  config: 4,
  memory: 5,
  sessions: 6,
  skills: 7,
  files: 8
};

type ConfigAttentionFile = {
  agentId: string;
  agentLabel: string;
  path: string;
  readStatus?: 'ready' | 'missing' | 'unreadable';
  readDetail?: string | null;
};

type CronAttentionJob = {
  summaryId: string;
  jobId: string;
  name: string;
  agentId: string;
  agentLabel: string;
  attentionLevel: 'healthy' | 'warning' | 'critical' | 'muted';
  overdue: boolean;
  failureStreak: number;
  lastStatus: string | null;
  lastError: string | null;
  lastDeliveryError: string | null;
};

const formatCount = (value: number, singular: string, plural = `${singular}s`): string =>
  `${value} ${value === 1 ? singular : plural}`;

const trimEvidence = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed;
};

const buildCronSummaryParts = (job: CronAttentionJob): string[] =>
  [
    job.overdue ? 'overdue' : null,
    job.failureStreak > 0 ? `${job.failureStreak} failed run${job.failureStreak === 1 ? '' : 's'} in a row` : null,
    job.lastDeliveryError ? 'delivery failed' : null,
    job.lastStatus ? `last status ${job.lastStatus}` : null
  ].filter((part): part is string => part != null);

const createCronAttentionItems = (jobs: CronAttentionJob[]): AttentionItem[] =>
  jobs
    .filter((job) => job.attentionLevel === 'warning' || job.attentionLevel === 'critical')
    .map((job) => {
      const summaryParts = buildCronSummaryParts(job);
      const evidence = trimEvidence(job.lastDeliveryError ?? job.lastError);

      return {
        id: `cron:${job.summaryId}`,
        severity: job.attentionLevel === 'critical' ? 'critical' : 'warning',
        domain: 'cron',
        title: `${job.name} needs a cron check`,
        summary:
          summaryParts.length > 0
            ? `${job.agentLabel}: ${summaryParts.join(' · ')}.`
            : `${job.agentLabel}: recent cron signals need review.`,
        ...(evidence ? { evidence } : {}),
        href: `/cron/${encodeURIComponent(job.agentId)}/${encodeURIComponent(job.jobId)}`,
        profileId: job.agentId,
        profileLabel: job.agentLabel,
        isActionable: true,
        isOptionalSurface: false
      };
    });

const createGatewayAttentionItem = (gateway: GatewaySummary): AttentionItem | null => {
  if (gateway.state === 'running') {
    return null;
  }

  return {
    id: 'gateway:state',
    severity: 'critical',
    domain: 'gateway',
    title: 'Gateway is not running',
    summary: 'Connected messaging surfaces may not receive or deliver Hermes activity until the gateway is running.',
    ...(gateway.updatedAt ? { evidence: `Last gateway snapshot: ${gateway.updatedAt}` } : {}),
    isActionable: true,
    isOptionalSurface: false
  };
};

const createUpdateAttentionItem = (update: UpdateStatusSummary): AttentionItem | null => {
  if (update.status !== 'behind' || (update.behind ?? 0) <= 0) {
    return null;
  }

  return {
    id: 'runtime:update-behind',
    severity: 'warning',
    domain: 'runtime',
    title: `Hermes is ${update.behind} commit${update.behind === 1 ? '' : 's'} behind`,
    summary: 'The local Hermes installation is behind the tracked upstream.',
    ...(update.checkedAt ? { evidence: `Last update check: ${update.checkedAt}` } : {}),
    isActionable: true,
    isOptionalSurface: false
  };
};

const createDoctorAttentionItems = (doctor: DoctorSnapshotSummary): AttentionItem[] =>
  doctor.issues.map((issue, index) => {
    const normalizedIssue = issue.toLowerCase();
    const severity =
      normalizedIssue.includes('vulnerability') ||
      normalizedIssue.includes('security') ||
      normalizedIssue.includes('missing') ||
      normalizedIssue.includes('failed')
        ? 'warning'
        : 'info';

    return {
      id: `runtime:doctor:${index}`,
      severity,
      domain: 'runtime',
      title: issue,
      summary: 'Reported by Hermes diagnostics.',
      isActionable: severity !== 'info',
      isOptionalSurface: false
    };
  });

const createMemoryAttentionItem = (memoryPressure: MemoryPressureLevel): AttentionItem | null => {
  if (memoryPressure !== 'near_limit' && memoryPressure !== 'at_limit') {
    return null;
  }

  return {
    id: 'memory:pressure',
    severity: memoryPressure === 'at_limit' ? 'critical' : 'warning',
    domain: 'memory',
    title: `Memory pressure is ${memoryPressure.replace(/_/g, ' ')}`,
    summary: 'At least one Hermes memory file is close to its configured limit.',
    href: '/memory',
    isActionable: true,
    isOptionalSurface: false
  };
};

const createLogAttentionItem = (logs: HermesLogFileSummary[]): AttentionItem | null => {
  const errorLineCount = logs.reduce((sum, log) => sum + log.errorLineCount, 0);
  const warningLineCount = logs.reduce((sum, log) => sum + log.warningLineCount, 0);

  if (errorLineCount === 0 && warningLineCount === 0) {
    return null;
  }

  return {
    id: 'logs:tail-errors',
    severity: errorLineCount > 0 ? 'warning' : 'info',
    domain: 'logs',
    title: errorLineCount > 0 ? 'Recent log errors found' : 'Recent log warnings found',
    summary:
      errorLineCount > 0
        ? `${formatCount(errorLineCount, 'error line')} found in analyzed log tails.`
        : `${formatCount(warningLineCount, 'warning line')} found in analyzed log tails.`,
    href: '/logs',
    isActionable: errorLineCount > 0,
    isOptionalSurface: false
  };
};

const createConfigAttentionItems = (files: ConfigAttentionFile[]): AttentionItem[] =>
  files.flatMap((file) => {
    if (file.readStatus !== 'unreadable') {
      return [];
    }

    return [
      {
        id: `config:unreadable:${file.agentId}`,
        severity: 'warning',
        domain: 'config',
        title: `${file.agentLabel} config is unreadable`,
        summary: file.readDetail ?? 'Hermes Console could not read config.yaml under this profile root.',
        evidence: file.path,
        href: '/config',
        profileId: file.agentId,
        profileLabel: file.agentLabel,
        isActionable: true,
        isOptionalSurface: false
      } satisfies AttentionItem
    ];
  });

const createSkillsAttentionItem = (skills: SkillSummary[]): AttentionItem | null => {
  const malformedSkills = skills.filter((skill) => skill.parseStatus === 'malformed');

  if (malformedSkills.length === 0) {
    return null;
  }

  return {
    id: 'skills:malformed',
    severity: 'warning',
    domain: 'skills',
    title: `${formatCount(malformedSkills.length, 'skill')} with malformed metadata`,
    summary: 'One or more SKILL.md files are missing required frontmatter.',
    evidence: malformedSkills
      .slice(0, 3)
      .map((skill) => skill.name)
      .join(', '),
    href: '/skills',
    isActionable: true,
    isOptionalSurface: false
  };
};

const dedupeAttentionItems = (items: AttentionItem[]): AttentionItem[] => {
  const seenIds = new Set<string>();

  return items.filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }

    seenIds.add(item.id);
    return true;
  });
};

export const sortAttentionItems = (items: AttentionItem[]): AttentionItem[] =>
  [...items].sort((left, right) => {
    const severityCompare = ATTENTION_SEVERITY_RANK[left.severity] - ATTENTION_SEVERITY_RANK[right.severity];

    if (severityCompare !== 0) {
      return severityCompare;
    }

    const domainCompare = ATTENTION_DOMAIN_RANK[left.domain] - ATTENTION_DOMAIN_RANK[right.domain];

    if (domainCompare !== 0) {
      return domainCompare;
    }

    if (left.isActionable !== right.isActionable) {
      return left.isActionable ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });

export const composeAttentionItems = ({
  configFiles = [],
  cronJobs = [],
  doctor,
  gateway,
  logs = [],
  memoryPressure,
  queryIssues = [],
  skills = [],
  update
}: {
  configFiles?: ConfigAttentionFile[];
  cronJobs?: CronAttentionJob[];
  doctor: DoctorSnapshotSummary;
  gateway: GatewaySummary;
  logs?: HermesLogFileSummary[];
  memoryPressure: MemoryPressureLevel;
  queryIssues?: HermesQueryIssue[];
  skills?: SkillSummary[];
  update: UpdateStatusSummary;
}): AttentionItem[] =>
  sortAttentionItems(
    dedupeAttentionItems(
      [
        createGatewayAttentionItem(gateway),
        createUpdateAttentionItem(update),
        ...createDoctorAttentionItems(doctor),
        ...createCronAttentionItems(cronJobs),
        createMemoryAttentionItem(memoryPressure),
        createLogAttentionItem(logs),
        ...createConfigAttentionItems(configFiles),
        createSkillsAttentionItem(skills),
        ...queryIssues.map(classifyHermesQueryIssue)
      ].filter((item): item is AttentionItem => item != null)
    )
  );
