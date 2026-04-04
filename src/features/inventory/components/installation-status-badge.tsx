import type { InventoryInstallationStatus } from "@/features/inventory/discover-installation";

const statusClasses: Record<InventoryInstallationStatus, string> = {
  ready: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  partial: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  missing: "border-rose-500/25 bg-rose-500/10 text-rose-300",
};

export function InstallationStatusBadge({
  status,
}: {
  status: InventoryInstallationStatus;
}) {
  return (
    <span
      className={[
        "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em]",
        statusClasses[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}
