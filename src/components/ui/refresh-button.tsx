"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

function formatLoadedAt(isoTimestamp: string) {
  return new Date(isoTimestamp).toLocaleTimeString();
}

export function RefreshButton({ loadedAt }: { loadedAt: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-fg-faint">{formatLoadedAt(loadedAt)}</span>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-bg/40 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
      >
        <RotateCw className={["h-3 w-3", isPending ? "animate-spin" : ""].join(" ")} />
        <span>Refresh</span>
      </button>
    </div>
  );
}
