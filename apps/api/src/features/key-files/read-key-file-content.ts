import { nodeKeyFilesFileSystem } from "@/features/key-files/node-key-files-file-system";
import { readKeyFiles } from "@/features/key-files/read-key-files";
import type { KeyFileContentData } from "@hermes-console/runtime";

export function readKeyFileContent(fileId: string): KeyFileContentData | null {
  const result = readKeyFiles();
  const file = result.files.find((candidate) => candidate.id === fileId) ?? null;

  if (!file) {
    return null;
  }

  const content = nodeKeyFilesFileSystem.readTextFile(file.path);

  return {
    file,
    content,
  };
}
