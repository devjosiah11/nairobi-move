import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ArrowLeft, AlertTriangle, Star } from "lucide-react";
import { riders, smsThreadFor, tripsFor, initials, statusLabel } from "@/lib/dispatch-data";

export const Route = createFileRoute("/riders/$id")({
  head: ({ params }) => {
    const r = riders.find((x) => x.id === params.id);
    return { meta: [{ title: r ? `${r.name} — BodaDispatch` : "Rider" }] };
  },
  component: RiderProfile,
  notFoundComponent: () => (
    <div className="p-8"><p>Rider not found.</p><Link to="/" className="text-primary underline">Back</Link></div>
  ),
});

function RiderProfile() {
  const { id } = Route.useParams();
  const rider = riders.find((r) => r.id === id);
  if (!rider) throw notFound();
  const sms = smsThreadFor(rider.id);
  const history = tripsFor(rider.id);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const statusColor =
    rider.status === "available" ? "bg-status-available" :
    rider.status === "ontrip" ? "bg-status-ontrip" :
    rider.status === "sos" ? "bg-status-sos" : "bg-status-offline";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Live Board
      </Link>

      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className={`h-20 w-20 rounded-full grid place-items-center text-2xl font-bold text-white ${statusColor}`}>
            {initials(rider.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{rider.name}</h1>
              <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full text-white ${statusColor}`}>
                {statusLabel(rider.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
              <Info label="Phone" value={rider.phone} />
              <Info label="Plate" value={rider.plate} mono />
              <Info label="Stage" value={rider.stage} />
              <Info label="Registered" value={rider.registeredAt} />
            </div>
          </div>
          <a href={`tel:${rider.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Trips" value={rider.totalTrips.toLocaleString()} />
        <Stat label="Trips Today" value={rider.tripsToday.toString()} />
        <Stat label="Airtime Earned" value={`KES ${rider.totalAirtime.toLocaleString()}`} />
        <Stat label="Rating" value={
          <span className="flex items-center gap-1">
            {rider.rating.toFixed(1)}
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </span>
        } />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-xl bg-card border border-border">
          <header className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Trip history</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Time</th>
                  <th className="text-left px-5 py-2.5 font-medium">Pickup</th>
                  <th className="text-left px-5 py-2.5 font-medium">Drop-off</th>
                  <th className="text-left px-5 py-2.5 font-medium">Status</th>
                  <th className="text-right px-5 py-2.5 font-medium">Airtime</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-5 py-3">{t.time}</td>
                    <td className="px-5 py-3">{t.pickup}</td>
                    <td className="px-5 py-3">{t.dropoff}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${
                        t.status === "Completed"
                          ? "bg-status-available/15 text-status-available"
                          : "bg-muted text-muted-foreground"
                      }`}>{t.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">KES {t.airtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border flex flex-col">
          <header className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">SMS thread</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{rider.phone}</p>
          </header>
          <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto bg-muted/30">
            {sms.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "in" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.direction === "in"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                }`}>
                  <div>{m.body}</div>
                  <div className={`text-[10px] mt-0.5 ${m.direction === "in" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl bg-card border border-border p-5">
        <h2 className="font-semibold mb-3">Emergency contact</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm">{rider.kinName} <span className="text-muted-foreground">· Next of kin</span></div>
            <div className="text-xs text-muted-foreground">{rider.kinPhone}</div>
          </div>
          <a href={`tel:${rider.kinPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-status-sos text-white text-sm font-medium">
            <Phone className="h-3.5 w-3.5" /> Call Now
          </a>
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Danger zone</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Suspend or remove this rider from the dispatch system.</p>
          </div>
          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)} className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm font-medium">
              Suspend / Remove
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmRemove(false)} className="h-9 px-3 rounded-md bg-secondary text-secondary-foreground text-sm border border-border">Cancel</button>
              <button className="h-9 px-3 rounded-md bg-destructive text-destructive-foreground text-sm font-medium">Confirm remove</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
