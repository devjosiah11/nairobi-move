import { Bell } from "lucide-react";
import { vehicles, vehicleStatus } from "@/lib/fleet-data";

export function Topbar() {
  const alerts = vehicles.filter((v) => vehicleStatus(v) !== "Compliant").length;

  return (
    <header className="h-16 shrink-0 border-b bg-card flex items-center justify-between px-6">
      <div>
        <div className="text-xs text-muted-foreground">SACCO</div>
        <div className="text-sm font-semibold text-foreground">Rongai Express SACCO</div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-muted transition-colors" aria-label="Notifications">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alerts > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {alerts}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2.5 pl-4 border-l">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">James Macharia</div>
            <div className="text-xs text-muted-foreground">Owner</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-navy-foreground text-sm font-semibold">
            JM
          </div>
        </div>
      </div>
    </header>
  );
}
