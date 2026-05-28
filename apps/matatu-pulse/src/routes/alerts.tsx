import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Bell, MessageCircle, Phone, Check, AlertTriangle, TrendingUp, Megaphone, MapPin, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { ROUTES } from "../lib/data";

// ─── Types ───────────────────────────────────────────────────────────────────

type Incident = {
  id: string; lat: number; lng: number;
  type: string; description: string;
  status: 'active' | 'resolved';
  reported_at: string; time_ago: string;
};

const INCIDENT_EMOJI: Record<string, string> = {
  accident: '🚗', congestion: '🚦', police: '🚔', flood: '🌊', roadworks: '🚧',
};

const INCIDENT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  accident:   { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200' },
  congestion: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  police:     { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200' },
  flood:      { bg: 'bg-cyan-50',   text: 'text-cyan-600',   border: 'border-cyan-200' },
  roadworks:  { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
};

function useIncidentsFeed() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await fetch('/api/traffic/incidents');
      const d = await r.json();
      setIncidents(d.incidents ?? []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    if (!id.startsWith('demo-')) {
      await fetch(`/api/traffic/incidents/${id}`, { method: 'DELETE' });
    }
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'resolved' } : i));
  };

  return { incidents, loading, reload: load, resolve };
}

const searchSchema = z.object({
  routeId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/alerts")({
  validateSearch: searchSchema,
  component: Alerts,
});

function Alerts() {
  const { routeId } = Route.useSearch();
  const [phone, setPhone] = useState("0712 345 678");
  const [route, setRoute] = useState(routeId ?? ROUTES[0].id);
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [peakAlert, setPeakAlert] = useState(true);
  const [disruption, setDisruption] = useState(true);
  const [strike, setStrike] = useState(false);
  const [activated, setActivated] = useState(false);

  const selected = ROUTES.find((r) => r.id === route)!;

  const Toggle = ({
    on,
    onChange,
    icon: Icon,
    title,
    sub,
    color,
  }: {
    on: boolean;
    onChange: (v: boolean) => void;
    icon: typeof Bell;
    title: string;
    sub: string;
    color: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full flex items-center gap-3 bg-white border rounded-2xl p-4 hover:border-primary transition text-left"
    >
      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          on ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );

  if (activated) {
    const maskedPhone = phone.replace(/(\d{3})\s?(\d{3})\s?(\d{3})/, "07XX XXX $3");
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500 grid place-items-center shadow-lg">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold">You're all set!</h1>
          <p className="mt-2 text-muted-foreground">
            You'll receive {channel === "sms" ? "SMS" : "WhatsApp"} alerts on{" "}
            <span className="font-bold text-foreground">{maskedPhone}</span> for{" "}
            <span className="font-bold text-foreground">
              {selected.from} → {selected.to}
            </span>
            .
          </p>
          <button
            onClick={() => setActivated(false)}
            className="mt-8 h-12 px-6 rounded-xl border-2 border-primary text-primary font-bold"
          >
            Edit alerts
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="text-xs uppercase tracking-wider text-white/70">
            Fare alerts
          </div>
          <h1 className="text-2xl font-extrabold">Stay one step ahead</h1>
          <p className="text-white/85 text-sm mt-1">
            Get notified about peak fare spikes, route disruptions and strikes.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setActivated(true);
        }}
        className="max-w-3xl mx-auto px-4 py-5 space-y-4"
      >
        <div className="bg-white border rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                className="w-full h-12 pl-10 pr-3 rounded-xl bg-muted/40 border focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                placeholder="07XX XXX XXX"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Your regular route
            </label>
            <div className="flex items-center gap-2">
              <RouteBadge number={selected.number} color={selected.badgeColor} />
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="flex-1 h-12 px-3 rounded-xl bg-muted/40 border focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    Route {r.number} — {r.from} → {r.to}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Delivery channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { k: "sms", l: "SMS", icon: MessageCircle },
                  { k: "whatsapp", l: "WhatsApp", icon: MessageCircle },
                ] as const
              ).map((c) => {
                const active = channel === c.k;
                return (
                  <button
                    key={c.k}
                    type="button"
                    onClick={() => setChannel(c.k)}
                    className={`h-12 rounded-xl font-bold text-sm border-2 flex items-center justify-center gap-2 transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-white text-foreground"
                    }`}
                  >
                    <c.icon className="w-4 h-4" />
                    {c.l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Alert types
          </div>
          <Toggle
            on={peakAlert}
            onChange={setPeakAlert}
            icon={TrendingUp}
            title="Peak fare spike"
            sub="Notify when fares jump above usual peak."
            color="bg-destructive/10 text-destructive"
          />
          <Toggle
            on={disruption}
            onChange={setDisruption}
            icon={AlertTriangle}
            title="Route disruption"
            sub="Roadworks, accidents and traffic detours."
            color="bg-secondary/40 text-amber-700"
          />
          <Toggle
            on={strike}
            onChange={setStrike}
            icon={Megaphone}
            title="SACCO strike notice"
            sub="Heads-up if your SACCO is going off-road."
            color="bg-primary/10 text-primary"
          />
        </div>

        <button
          type="submit"
          className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-extrabold text-base shadow-lg hover:bg-primary/90 transition flex items-center justify-center gap-2"
        >
          <Bell className="w-5 h-5" />
          Activate Alerts
        </button>
      </form>

      <IncidentsFeed />
    </AppLayout>
  );
}

// ─── Incidents Feed ───────────────────────────────────────────────────────────

function IncidentsFeed() {
  const { incidents, loading, reload, resolve } = useIncidentsFeed();
  const active   = incidents.filter(i => i.status === 'active');
  const resolved = incidents.filter(i => i.status === 'resolved');

  return (
    <div className="max-w-3xl mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live incidents</div>
          <h2 className="text-lg font-extrabold">Community reports</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/map"
            className="h-9 px-3 rounded-xl border border-border text-xs font-bold flex items-center gap-1.5 hover:bg-muted/50 transition"
          >
            <MapPin className="w-3.5 h-3.5" /> View on map
          </Link>
          <button
            onClick={reload}
            className="h-9 w-9 rounded-xl border border-border grid place-items-center hover:bg-muted/50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!loading && incidents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No incidents reported yet. Be the first to report from the map.</p>
        </div>
      )}

      {!loading && active.length > 0 && (
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-500 px-1">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Active — {active.length} report{active.length !== 1 ? 's' : ''}
          </div>
          {active.map(i => <IncidentCard key={i.id} incident={i} onResolve={resolve} />)}
        </div>
      )}

      {!loading && resolved.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Resolved — {resolved.length}
          </div>
          {resolved.map(i => <IncidentCard key={i.id} incident={i} onResolve={resolve} />)}
        </div>
      )}
    </div>
  );
}

function IncidentCard({ incident, onResolve }: { incident: Incident; onResolve: (id: string) => void }) {
  const emoji  = INCIDENT_EMOJI[incident.type] ?? '⚠️';
  const colors = INCIDENT_COLOR[incident.type] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  const isResolved = incident.status === 'resolved';

  return (
    <div className={`rounded-2xl border p-4 flex gap-3 transition ${
      isResolved ? 'bg-gray-50 border-gray-200 opacity-60' : `${colors.bg} ${colors.border}`
    }`}>
      <div className="text-2xl leading-none mt-0.5">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wide capitalize ${isResolved ? 'text-muted-foreground' : colors.text}`}>
            {incident.type}
          </span>
          {isResolved ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Active
            </span>
          )}
        </div>
        <p className="text-sm mt-0.5 leading-snug line-clamp-2">{incident.description || '(No description)'}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" /> {incident.time_ago}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
          </span>
        </div>
      </div>
      {!isResolved && (
        <button
          onClick={() => onResolve(incident.id)}
          className="shrink-0 self-start h-8 px-3 rounded-lg border border-current text-xs font-bold transition hover:opacity-70"
          style={{ color: 'inherit' }}
        >
          Resolve
        </button>
      )}
    </div>
  );
}
