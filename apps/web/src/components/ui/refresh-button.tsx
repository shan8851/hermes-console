import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useState } from "react";

function formatLoadedAt(isoTimestamp: string | null | undefined) {
  if (!isoTimestamp) {
    return "Not loaded";
  }

  return new Date(isoTimestamp).toLocaleTimeString();
}

export function RefreshButton({
  loadedAt,
  queryKeys,
}: {
  loadedAt: string | null | undefined;
  queryKeys: QueryKey[];
}) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.refetchQueries({
            exact: true,
            queryKey,
            type: "active",
          }),
        ),
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-fg-faint">{formatLoadedAt(loadedAt)}</span>
      <button
        type="button"
        onClick={() => {
          void handleRefresh();
        }}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-bg/40 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
      >
        <RotateCw className={["h-3 w-3", isRefreshing ? "animate-spin" : ""].join(" ")} />
        <span>Refresh</span>
      </button>
    </div>
  );
}
