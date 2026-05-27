import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Phone, Share2, Check, Clock } from "lucide-react";
import { AppLayout, RouteBadge } from "../components/AppLayout";
import { ROUTES, type Route as MatatuRoute } from "../lib/data";

export const Route = createFileRoute("/route/$id")({
  loader: ({ params }) => {
    const r = ROUTES.find((x) => x.id === params.id);
    if (!r) throw notFound();
    return r;
  },
  component: RouteDetail,
});

function RouteDetail() {
  const r = Route.useLoaderData() as MatatuRoute;
  const [confirms, setConfirms] = useState(3);
  const [confirmed, setConfirmed] = useState(false);

  const share = async () => {
    const text = `Route ${r.number}: ${r.from} → ${r.to} on MatatuPulse`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url: window.location.href });
      } catch {}
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${window.location.href}`);
    }
  };

  return (
    <AppLayout>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-700 text-primary-foreground">
        <div className="absolute inset-0 matatu-stripe opacity-10" />
        <div className="relative max-w-3xl mx-auto px-4 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-white/80 text-sm font-medium hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <RouteBadge number={r.number} color={r.badgeColor} size="lg" />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-white/70">
                Route {r.number}
              </div>
              <h1 className="text-2xl font-extrabold leading-tight truncate">
                {r.from} → {r.to}
              </h1>
              <div className="text-white/85 text-sm">{r.sacco}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Fare table */}
        <section className="bg-white border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b font-bold text-sm uppercase tracking-wider text-muted-foreground">
            Fare table
          </div>
          <div className="grid grid-cols-3 divide-x">
            {[
              { l: "Off-peak", v: r.fareOffPeak, c: "text-emerald-700" },
              { l: "Peak", v: r.farePeak, c: "text-destructive" },
              { l: "Weekend", v: r.fareWeekend, c: "text-primary" },
            ].map((f) => (
              <div key={f.l} className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {f.l}
                </div>
                <div className={`mt-1 font-extrabold ${f.c}`}>
                  KES {f.v[0]}–{f.v[1]}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stops */}
        <section className="bg-white border rounded-2xl p-4">
          <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Stops along the way
          </div>
          <ol className="relative ml-2">
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-secondary to-primary" />
            {r.stops.map((s, i) => (
              <li
                key={s.name + i}
                className="relative pl-6 py-2.5 flex items-center justify-between gap-3"
              >
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 ${
                    i === 0
                      ? "bg-primary border-primary"
                      : i === r.stops.length - 1
                        ? "bg-secondary border-amber-500"
                        : "bg-white border-primary"
                  }`}
                />
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.km} km
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Hours & contact */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white border rounded-2xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              First matatu
            </div>
            <div className="mt-1 font-extrabold text-lg flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" />
              {r.firstMatatu}
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Last matatu
            </div>
            <div className="mt-1 font-extrabold text-lg flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" />
              {r.lastMatatu}
            </div>
          </div>
        </section>

        <a
          href={`tel:${r.saccoPhone.replace(/\s/g, "")}`}
          className="flex items-center gap-3 bg-white border rounded-2xl p-4 hover:bg-muted transition"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">SACCO contact</div>
            <div className="font-bold">{r.saccoPhone}</div>
          </div>
          <div className="text-xs font-semibold text-primary">Call</div>
        </a>

        {/* Crowdsourced fare */}
        <section className="bg-gradient-to-br from-secondary/20 to-secondary/5 border border-amber-200 rounded-2xl p-4">
          <div className="text-sm">
            <span className="font-extrabold">{confirms} commuters</span>{" "}
            confirmed this fare in the last hour.
          </div>
          <button
            onClick={() => {
              if (confirmed) return;
              setConfirms((c) => c + 1);
              setConfirmed(true);
            }}
            disabled={confirmed}
            className={`mt-3 w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
              confirmed
                ? "bg-emerald-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmed ? "Thanks for confirming!" : "Confirm current fare"}
          </button>
        </section>

        <button
          onClick={share}
          className="w-full h-12 rounded-xl border-2 border-primary text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/5"
        >
          <Share2 className="w-4 h-4" />
          Share this route
        </button>
      </div>
    </AppLayout>
  );
}
