import type { HermesQueryIssue } from "@hermes-console/runtime";
import type {
  DoctorSnapshotSummary,
  StatusEntry,
  StatusSnapshotSummary,
} from "@hermes-console/runtime";

const ANSI_ESCAPE_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*m`,
  "g",
);

export function readHermesBinaryPath(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env.HERMES_CONSOLE_HERMES_BIN || "hermes";
}

function parseStatusSymbol(symbol: string): StatusEntry["symbol"] {
  if (symbol === "✓") return "ok";
  if (symbol === "✗") return "error";
  if (symbol === "⚠") return "warn";
  return "unknown";
}

function parseStatusState(
  detail: string,
  symbol: StatusEntry["symbol"],
): StatusEntry["state"] {
  const normalized = detail.toLowerCase();
  if (normalized.includes("not logged in")) return "not_logged_in";
  if (normalized.includes("logged in")) return "logged_in";
  if (normalized.includes("not configured")) return "not_configured";
  if (normalized.includes("configured")) return "configured";
  if (normalized.includes("not running")) return "not_running";
  if (normalized.includes("running")) return "running";
  if (normalized.includes("not set") || normalized.includes("missing")) {
    return "missing";
  }
  if (symbol === "ok") return "present";
  if (symbol === "warn") return "warning";
  if (symbol === "error") return "missing";
  return "unknown";
}

function parseStatusEntry(line: string) {
  const match = line.match(/^\s{2}(.+?)\s{2,}(✓|✗|⚠)\s+(.*)$/);
  if (!match) {
    return null;
  }

  const name = match[1];
  const rawSymbol = match[2];
  const detail = match[3];

  if (!name || !rawSymbol || detail == null) {
    return null;
  }

  const symbol = parseStatusSymbol(rawSymbol);

  return {
    name: name.trim(),
    symbol,
    detail: detail.trim(),
    state: parseStatusState(detail.trim(), symbol),
  } satisfies StatusEntry;
}

function parseNamedNumberPair(detail: string) {
  const match = detail.match(/(\d+)\s+active,\s+(\d+)\s+total/i);
  return match
    ? { active: Number(match[1]), total: Number(match[2]) }
    : { active: null, total: null };
}

function createCommandIssue({
  command,
  error,
  hermesBin,
}: {
  command: string;
  error: unknown;
  hermesBin: string;
}): HermesQueryIssue {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return {
      id: `cli-${command}-missing-dependency`,
      code: "missing_dependency",
      severity: "warning",
      summary: `Hermes CLI command unavailable: ${command}`,
      detail:
        "The app could not find the Hermes CLI on PATH. File-backed runtime data still renders, but CLI diagnostics are degraded.",
      path: hermesBin,
    };
  }

  return {
    id: `cli-${command}-command-failed`,
    code: "command_failed",
    severity: "warning",
    summary: `Hermes CLI command failed: ${command}`,
    detail:
      "The Hermes CLI returned an error while collecting diagnostics. File-backed runtime data still renders, but CLI diagnostics are degraded.",
    path: hermesBin,
  };
}

async function runHermesCommand(args: string[]) {
  const command = args.join(" ");
  const hermesBin = readHermesBinaryPath();

  try {
    const { execFileSync } = await import("node:child_process");
    const output = execFileSync(hermesBin, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15000,
      cwd: process.env.HOME ?? "/",
      env: process.env,
    });

    return {
      output,
      issue: null,
    };
  } catch (error) {
    return {
      output: null,
      issue: createCommandIssue({ command, error, hermesBin }),
    };
  }
}

export function parseStatusOutput(rawContent: string | null): StatusSnapshotSummary {
  const snapshot: StatusSnapshotSummary = {
    capturedAt: rawContent ? new Date().toISOString() : null,
    apiKeys: [],
    authProviders: [],
    apiKeyProviders: [],
    messagingPlatforms: [],
    gatewayStatus: null,
    scheduledJobs: { active: null, total: null },
    sessions: { active: null },
  };

  if (!rawContent) {
    return snapshot;
  }

  let currentSection = "";
  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(ANSI_ESCAPE_PATTERN, "");
    const headingMatch = line.match(/^◆\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1]?.trim() ?? "";
      continue;
    }

    const entry = parseStatusEntry(line);
    if (entry) {
      if (currentSection === "API Keys") snapshot.apiKeys.push(entry);
      if (currentSection === "Auth Providers") snapshot.authProviders.push(entry);
      if (currentSection === "API-Key Providers") {
        snapshot.apiKeyProviders.push(entry);
      }
      if (currentSection === "Messaging Platforms") {
        snapshot.messagingPlatforms.push(entry);
      }
      continue;
    }

    const gatewayMatch =
      currentSection === "Gateway Service"
        ? line.match(/Status:\s+(✓|✗|⚠)\s+(.*)$/)
        : null;
    if (gatewayMatch) {
      const rawSymbol = gatewayMatch[1];
      const detail = gatewayMatch[2];

      if (!rawSymbol || detail == null) {
        continue;
      }

      const symbol = parseStatusSymbol(rawSymbol);
      snapshot.gatewayStatus = {
        name: "Gateway",
        symbol,
        detail: detail.trim(),
        state: parseStatusState(detail.trim(), symbol),
      };
    }

    if (currentSection === "Scheduled Jobs") {
      const jobsMatch = line.match(/^\s{2}Jobs:\s+(.*)$/);
      if (jobsMatch) {
        snapshot.scheduledJobs = parseNamedNumberPair(jobsMatch[1]?.trim() ?? "");
      }
    }

    if (currentSection === "Sessions") {
      const sessionsMatch = line.match(/^\s{2}Active:\s+(\d+)/);
      if (sessionsMatch) {
        snapshot.sessions.active = Number(sessionsMatch[1]);
      }
    }
  }

  return snapshot;
}

export function parseDoctorOutput(rawContent: string | null): DoctorSnapshotSummary {
  const snapshot: DoctorSnapshotSummary = {
    capturedAt: rawContent ? new Date().toISOString() : null,
    issueCount: 0,
    issues: [],
    toolWarnings: [],
    authProviders: [],
  };

  if (!rawContent) {
    return snapshot;
  }

  let currentSection = "";
  let collectingIssues = false;
  for (const rawLine of rawContent.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(ANSI_ESCAPE_PATTERN, "");
    const headingMatch = line.match(/^◆\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[1]?.trim() ?? "";
      collectingIssues = false;
      continue;
    }

    const issueCountMatch = line.match(/Found\s+(\d+)\s+issue\(s\)\s+to\s+address:/i);
    if (issueCountMatch) {
      snapshot.issueCount = Number(issueCountMatch[1] ?? "0");
      collectingIssues = true;
      continue;
    }

    if (collectingIssues) {
      const issueMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (issueMatch) {
        snapshot.issues.push(issueMatch[1]?.trim() ?? "");
        continue;
      }
      if (line.trim() && !line.includes("Tip:")) {
        collectingIssues = false;
      }
    }

    const entry = parseStatusEntry(line);
    if (entry && currentSection === "Auth Providers") {
      snapshot.authProviders.push(entry);
    }

    if (currentSection === "External Tools" && line.includes("⚠")) {
      snapshot.toolWarnings.push(line.trim().replace(/^⚠\s*/, ""));
    }
  }

  return snapshot;
}

export async function readHermesCliDiagnostics() {
  const [statusResult, doctorResult] = await Promise.all([
    runHermesCommand(["status"]),
    runHermesCommand(["doctor"]),
  ]);

  return {
    status: parseStatusOutput(statusResult.output),
    doctor: parseDoctorOutput(doctorResult.output),
    issues: [statusResult.issue, doctorResult.issue].filter(
      (issue): issue is HermesQueryIssue => Boolean(issue),
    ),
  };
}
