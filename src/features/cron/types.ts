export type CronAgentRef = {
  id: string;
  label: string;
  rootPath: string;
  source: "root" | "profile";
};

export type CronJobRecord = {
  id: string;
  jobId: string;
  name: string;
  agentId: string;
  agentLabel: string;
  agentRootPath: string;
  enabled: boolean;
  state: string | null;
  scheduleDisplay: string;
  createdAt: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  deliver: string | null;
  prompt: string;
  skills: string[];
  skill: string | null;
  scheduleKind: string | null;
  repeatCompleted: number | null;
  originChatName: string | null;
};

export type CronRunOutputState = "silent" | "contentful" | "missing";

export type CronRunOutputRecord = {
  id: string;
  jobId: string;
  fileName: string;
  path: string;
  createdAt: string | null;
  responsePreview: string;
  responseState: CronRunOutputState;
  rawContent: string;
};

export type HermesCronJobSummary = CronJobRecord & {
  summaryId: string;
  statusTone: "healthy" | "warning" | "error" | "muted";
  latestOutputState: CronRunOutputState;
  recentOutputCount: number;
};

export type HermesCronIndex = {
  jobs: HermesCronJobSummary[];
  agentCount: number;
  agentsWithCron: number;
};

export type HermesCronJobDetail = {
  job: HermesCronJobSummary;
  outputs: CronRunOutputRecord[];
  recentOutputCount: number;
  latestOutputState: CronRunOutputState;
  hasOutputs: boolean;
};
