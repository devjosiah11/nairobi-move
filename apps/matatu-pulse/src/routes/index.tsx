import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowDownUp, Search, Phone, ChevronRight } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { ALL_STAGE_NAMES, POPULAR_ROUTES } from "../lib/data";

export const Route = createFileRoute("/")({
  component: Index,
});

function StageInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const id = label.toLowerCase();
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return ALL_STAGE_NAMES.slice(0, 8);
    return ALL_STAGE_NAMES.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [value]);

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 px-4 rounded-xl bg-white text-foreground placeholder:text-muted-foreground/70 border border-border focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium shadow-sm"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg max-h-64 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-muted text-sm border-b last:border-b-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Index() {
  const [from, setFrom] = useState("CBD");
  const [to, setTo] = useState("");
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const search = (f?: string, t?: string) => {
    const ff = (f ?? from).trim();
    const tt = (t ?? to).trim();
    if (!ff || !tt) return;
    navigate({ to: "/results", search: { from: ff, to: tt } });
  };

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-blue-700" />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay matatu-stripe" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-secondary/40 blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 pt-10 pb-28 md:pt-16 md:pb-36 text-primary-foreground">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
            Live Nairobi fares
          </span>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Where are you headed?
          </h1>
          <p className="mt-3 text-white/85 text-base md:text-lg max-w-xl">
            Get accurate Nairobi matatu fares and routes instantly — before you even step out.
          </p>
        </div>
      </section>

      {/* Search card overlapping hero */}
      <div className="max-w-3xl mx-auto px-4 -mt-20 md:-mt-24 relative z-10" ref={ref}>
        <div className="bg-white rounded-3xl shadow-xl border p-4 md:p-6">
          <div className="space-y-3">
            <StageInput
              label="From"
              value={from}
              onChange={setFrom}
              placeholder="Origin stage e.g. CBD"
            />
            <div className="flex justify-center -my-1">
              <button
                onClick={swap}
                aria-label="Swap origin and destination"
                className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground border border-amber-300 shadow-md grid place-items-center hover:rotate-180 transition-transform duration-300"
              >
                <ArrowDownUp className="w-4 h-4" />
              </button>
            </div>
            <StageInput
              label="To"
              value={to}
              onChange={setTo}
              placeholder="Destination stage e.g. Rongai"
            />
          </div>
          <button
            onClick={() => search()}
            className="mt-5 w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-md hover:bg-primary/90 transition flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            Find Routes
          </button>
        </div>

        {/* Popular routes */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Popular routes
          </h2>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {POPULAR_ROUTES.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setFrom(r.from);
                  setTo(r.to);
                  search(r.from, r.to);
                }}
                className="shrink-0 px-4 h-11 rounded-full bg-white border border-border hover:border-primary hover:bg-primary/5 text-sm font-semibold flex items-center gap-2 shadow-sm"
              >
                {r.label}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* USSD banner */}
        <Link
          to="/alerts"
          className="mt-6 mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-amber-200 p-4"
        >
          <div className="h-11 w-11 rounded-xl bg-secondary text-secondary-foreground grid place-items-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">No smartphone?</div>
            <div className="text-sm text-foreground/80">
              Dial <span className="font-mono font-bold">*384#</span> free on any phone
            </div>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
}
