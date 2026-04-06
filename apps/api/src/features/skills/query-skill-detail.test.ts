import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  readSkillDocumentDetailQuery,
  readSkillLinkedFileContentQuery,
} from "@/features/skills/query-skill-detail";

const previousHermesRoot = process.env.HERMES_CONSOLE_HERMES_DIR;

const createSkillsRoot = () => {
  const hermesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-console-skills-"));
  const skillRoot = path.join(hermesRoot, "skills", "workspace", "demo-skill");
  fs.mkdirSync(path.join(skillRoot, "references"), { recursive: true });
  fs.writeFileSync(
    path.join(skillRoot, "SKILL.md"),
    ["---", "name: Demo Skill", "description: Demo description", "---", "", "Skill body"].join(
      "\n",
    ),
  );
  fs.writeFileSync(
    path.join(skillRoot, "references", "notes.md"),
    "linked content",
  );
  return hermesRoot;
};

describe("skill detail queries", () => {
  afterEach(() => {
    if (previousHermesRoot == null) {
      delete process.env.HERMES_CONSOLE_HERMES_DIR;
    } else {
      process.env.HERMES_CONSOLE_HERMES_DIR = previousHermesRoot;
    }
  });

  it("returns null for an invalid skill id instead of falling back", () => {
    process.env.HERMES_CONSOLE_HERMES_DIR = createSkillsRoot();

    expect(
      readSkillDocumentDetailQuery({
        skillId: "missing-skill",
      }),
    ).toBeNull();
  });

  it("returns null for an invalid linked file id instead of falling back", () => {
    process.env.HERMES_CONSOLE_HERMES_DIR = createSkillsRoot();

    expect(
      readSkillLinkedFileContentQuery({
        skillId: "workspace/demo-skill",
        fileId: "references/missing.md",
      }),
    ).toBeNull();
  });
});
