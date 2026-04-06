import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { SkillFileViewer } from "@/features/skills/components/skill-file-viewer";
import {
  skillDetailQueryOptions,
  skillLinkedFileContentQueryOptions,
} from "@/lib/api";

export const SkillDetailPage = ({
  selectedLinkedFileError,
  selectedFileId,
  skillId,
}: {
  selectedLinkedFileError: string | null;
  selectedFileId: string | null;
  skillId: string;
}) => {
  const query = useSuspenseQuery(skillDetailQueryOptions({ skillId }));
  const selectedLinkedFileQuery = useQuery({
    ...skillLinkedFileContentQueryOptions({
      fileId: selectedFileId ?? "",
      skillId,
    }),
    enabled: selectedFileId != null,
    refetchOnMount: false,
    retry: false,
  });
  const effectiveSelectedLinkedFileError =
    selectedLinkedFileQuery.data == null
      ? selectedLinkedFileQuery.error?.message ?? selectedLinkedFileError
      : null;

  return (
    <SkillFileViewer
      detail={query.data.data}
      detailIssues={query.data.issues}
      detailStatus={query.data.meta.dataStatus}
      selectedFileId={selectedFileId}
      selectedLinkedFile={selectedLinkedFileQuery.data ?? null}
      selectedLinkedFileError={effectiveSelectedLinkedFileError}
    />
  );
};
