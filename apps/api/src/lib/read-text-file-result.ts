import fs from "node:fs";

export type TextFileReadResult =
  | {
      status: "ready";
      content: string;
    }
  | {
      status: "missing";
      content: null;
    }
  | {
      status: "unreadable";
      content: null;
      detail: string;
    };

export function readTextFileResult(targetPath: string): TextFileReadResult {
  try {
    if (!fs.existsSync(targetPath)) {
      return {
        status: "missing",
        content: null,
      };
    }

    return {
      status: "ready",
      content: fs.readFileSync(targetPath, "utf8"),
    };
  } catch (error) {
    return {
      status: "unreadable",
      content: null,
      detail:
        error instanceof Error
          ? error.message
          : "Hermes Console could not read the requested text file.",
    };
  }
}
