import type { ComplianceStatus } from "@/lib/fleet-data";
import { cn } from "@/lib/utils";

const styles: Record<ComplianceStatus, string> = {
  Compliant: "bg-success/15 text-success border border-success/25",
  Expiring: "bg-warning/20 text-warning-foreground border border-warning/40",
  Overdue: "bg-destructive/15 text-destructive border border-destructive/30",
};

const labels: Record<ComplianceStatus, string> = {
  Compliant: "Compliant",
  Expiring: "Expiring Soon",
  Overdue: "Overdue",
};

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
          status === "Compliant" && "bg-success",
          status === "Expiring" && "bg-warning",
          status === "Overdue" && "bg-destructive",
        )}
      />
      {labels[status]}
    </span>
  );
}
