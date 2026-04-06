import path from "node:path";

import type {
  HermesAgentIdentity,
  InventoryInstallation,
  InventoryInstallationStatus,
  InventoryPathResolution,
  InventoryPresenceKey,
  InventoryPresenceMap,
} from "@hermes-console/runtime";

export type {
  HermesAgentIdentity,
  InventoryInstallation,
  InventoryInstallationStatus,
  InventoryPresenceKey,
  InventoryPresenceMap,
} from "@hermes-console/runtime";

export type InventoryFileSystem = {
  pathExists(targetPath: string): boolean;
  listDirectories(targetPath: string): string[];
};

const PRESENCE_PATHS: Record<InventoryPresenceKey, string> = {
  config: "config.yaml",
  memory: "memories",
  sessions: "sessions",
  cron: "cron",
  skills: "skills",
  stateDb: "state.db",
};

function buildPresenceMap(
  rootPath: string,
  fileSystem: InventoryFileSystem,
): InventoryPresenceMap {
  return {
    config: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.config)),
    memory: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.memory)),
    sessions: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.sessions)),
    cron: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.cron)),
    skills: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.skills)),
    stateDb: fileSystem.pathExists(path.join(rootPath, PRESENCE_PATHS.stateDb)),
  };
}

function hasAnyPresence(presence: InventoryPresenceMap) {
  return Object.values(presence).some(Boolean);
}

function createAgentIdentity({
  id,
  label,
  rootPath,
  source,
  fileSystem,
}: {
  id: string;
  label: string;
  rootPath: string;
  source: HermesAgentIdentity["source"];
  fileSystem: InventoryFileSystem;
}): HermesAgentIdentity {
  const presence = buildPresenceMap(rootPath, fileSystem);

  return {
    id,
    label,
    rootPath,
    source,
    presence,
    isAvailable: hasAnyPresence(presence),
  };
}

function deriveInstallationStatus({
  hermesRootExists,
  agents,
}: {
  hermesRootExists: boolean;
  agents: HermesAgentIdentity[];
}): InventoryInstallationStatus {
  if (!hermesRootExists) {
    return "missing";
  }

  if (agents.some((agent) => agent.isAvailable)) {
    return "ready";
  }

  return "partial";
}

export function discoverHermesInstallation({
  paths,
  fileSystem,
}: {
  paths: InventoryPathResolution;
  fileSystem: InventoryFileSystem;
}): InventoryInstallation {
  const hermesRootPath = paths.hermesRoot.path;
  const profilesRootPath = path.join(hermesRootPath, "profiles");
  const hermesRootExists = fileSystem.pathExists(hermesRootPath);
  const profilesRootExists = fileSystem.pathExists(profilesRootPath);

  const agents: HermesAgentIdentity[] = [
    createAgentIdentity({
      id: "default",
      label: "Default",
      rootPath: hermesRootPath,
      source: "root",
      fileSystem,
    }),
  ];

  const profileDirectoryNames = profilesRootExists
    ? fileSystem.listDirectories(profilesRootPath)
    : [];

  for (const profileName of profileDirectoryNames) {
    agents.push(
      createAgentIdentity({
        id: profileName,
        label: profileName,
        rootPath: path.join(profilesRootPath, profileName),
        source: "profile",
        fileSystem,
      }),
    );
  }

  return {
    paths,
    hermesRootExists,
    profilesRootPath,
    profilesRootExists,
    agents,
    availableAgentCount: agents.filter((agent) => agent.isAvailable).length,
    status: deriveInstallationStatus({ hermesRootExists, agents }),
  };
}
