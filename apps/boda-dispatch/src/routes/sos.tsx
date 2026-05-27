import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { sosEvents } from "@/lib/dispatch-data";

export const Route = createFileRoute("/sos")({
  head: () => ({ meta: [{ title: "SOS Alerts — BodaDispatch" }] }),
  component: SosPage,
});

function SosPage() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">SOS Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">History of all rider safety incidents.</p>
      </header>

      <div className="rounded-xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Time</th>
              <th className="text-left px-5 py-3 font-medium">Rider</th>
              <th className="text-left px-5 py-3 font-medium">Plate</th>
              <th className="text-left px-5 py-3 font-medium">Stage</th>
              <th className="text-center px-5 py-3 font-medium">Kin called</th>
              <th className="text-center px-5 py-3 font-medium">SMS sent</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sosEvents.map((e) => (
              <tr key={e.id} className={`border-t border-border ${e.resolved ? "text-muted-foreground" : "bg-status-sos/5"}`}>
                <td className="px-5 py-3">{e.time}</td>
                <td className="px-5 py-3">
                  <Link to="/riders/$id" params={{ id: e.riderId }} className={`hover:underline ${e.resolved ? "" : "font-semibold text-foreground"}`}>
                    {e.riderName}
                  </Link>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{e.plate}</td>
                <td className="px-5 py-3">{e.stage}</td>
                <td className="px-5 py-3 text-center">
                  {e.kinCalled ? <Check className="h-4 w-4 text-status-available inline" /> : <X className="h-4 w-4 text-muted-foreground inline" />}
                </td>
                <td className="px-5 py-3 text-center">
                  {e.smsSent ? <Check className="h-4 w-4 text-status-available inline" /> : <X className="h-4 w-4 text-muted-foreground inline" />}
                </td>
                <td className="px-5 py-3">
                  {e.resolved ? (
                    <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">Resolved</span>
                  ) : (
                    <span className="text-[10px] uppercase font-semibold px-2 py-1 rounded-full bg-status-sos text-white animate-pulse-dot">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
