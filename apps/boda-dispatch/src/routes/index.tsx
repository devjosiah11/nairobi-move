import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Phone, BellRing } from "lucide-react";
import { riders, STAGES, type RiderStatus } from "@/lib/dispatch-data";
import { RiderCard } from "@/components/RiderCard";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Live Rider Board — BodaDispatch" }] }),
  component: LiveBoard,
});

const STATUS_OPTIONS: { value: RiderStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available" },
  { value: "ontrip", label: "On Trip" },
  { value: "offline", label: "Offline" },
  { value: "sos", label: "SOS" },
];

function LiveBoard() {
  const [stage, setStage] = useState<string>("all");
  const [status, setStatus] = useState<RiderStatus | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = riders.filter((r) => {
      if (stage !== "all" && r.stage !== stage) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!r.name.toLowerCase().includes(needle) && !r.plate.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
    // SOS first
    return [...list].sort((a, b) => (a.status === "sos" ? -1 : 0) - (b.status === "sos" ? -1 : 0));
  }, [stage, status, q]);

  const sosRider = riders.find((r) => r.status === "sos");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Rider Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view of all registered boda riders across Nairobi.
          </p>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-available animate-pulse-dot" />
          Live · updated just now
        </div>
      </header>

      {sosRider && (
        <div className="rounded-xl bg-status-sos text-white p-4 flex flex-wrap items-center justify-between gap-3 animate-sos-border">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 animate-pulse-dot" />
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-90">Active SOS</div>
              <div className="font-semibold">
                {sosRider.name} · {sosRider.stage} · {sosRider.plate}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${sosRider.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white text-status-sos text-sm font-semibold">
              <Phone className="h-3.5 w-3.5" /> Call Now
            </a>
            <a href={`tel:${sosRider.kinPhone.replace(/\s/g, "")}`} className="inline-flex items-center h-9 px-3 rounded-md bg-white/15 hover:bg-white/25 text-white text-sm font-medium border border-white/30">
              Notify Kin
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or plate..."
            className="w-full h-10 pl-9 pr-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-10 px-3 rounded-md bg-background border border-border text-sm">
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as RiderStatus | "all")} className="h-10 px-3 rounded-md bg-background border border-border text-sm">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="text-xs text-muted-foreground ml-auto">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {riders.length}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((r) => <RiderCard key={r.id} rider={r} />)}
      </div>
    </div>
  );
}
