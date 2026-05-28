import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Phone, MessageSquare, Gauge, Radio,
  Wallet, Headphones, CheckCircle2, AlertTriangle, MapPin, Users,
  Bus, Sparkles, ArrowDown, Mail, Twitter, Linkedin, Github, ExternalLink,
} from "lucide-react";

type LiveStats = { totalVehicles: number; totalRoutes: number; totalStages: number };

const FALLBACK: LiveStats = { totalVehicles: 8, totalRoutes: 8, totalStages: 20 };

function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>(FALLBACK);

  useEffect(() => {
    const saccoUrl  = import.meta.env.VITE_SACCO_API_URL as string | undefined;
    const matatuUrl = import.meta.env.VITE_MATATU_API_URL as string | undefined;
    if (!saccoUrl && !matatuUrl) return;

    Promise.allSettled([
      saccoUrl  ? fetch(`${saccoUrl}/api/stats/public`).then(r => r.json())  : Promise.reject(),
      matatuUrl ? fetch(`${matatuUrl}/api/stats/public`).then(r => r.json()) : Promise.reject(),
    ]).then(([saccoRes, matatuRes]) => {
      const saccoData  = saccoRes.status  === 'fulfilled' ? saccoRes.value  : null;
      const matatuData = matatuRes.status === 'fulfilled' ? matatuRes.value : null;

      setStats({
        totalVehicles: saccoData?.total_vehicles  || matatuData?.activeVehicles || FALLBACK.totalVehicles,
        totalRoutes:   FALLBACK.totalRoutes,
        totalStages:   FALLBACK.totalStages,
      });
    });
  }, []);

  return stats;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NairobiMove — Smarter movement for every Kenyan" },
      { name: "description", content: "Real-time matatu fares and SACCO fleet compliance — over SMS, USSD and web. Built on Africa's Talking APIs." },
      { property: "og:title", content: "NairobiMove — Smarter movement for every Kenyan" },
      { property: "og:description", content: "Real-time matatu fares and SACCO fleet compliance — over SMS, USSD and web." },
    ],
  }),
  component: Index,
});

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function Logo() {
  return (
    <a href="#" className="flex items-center gap-2 font-display font-bold text-xl">
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-green text-white">
        <span className="absolute inset-0 rounded-lg bg-amber/40 blur-md -z-10" />
        NM
      </span>
      <span>NairobiMove</span>
    </a>
  );
}

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-navy/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between text-white">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a href="#problem" className="hover:text-white transition">Why</a>
          <a href="#matatupulse" className="hover:text-white transition">Products</a>
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href={import.meta.env.VITE_MATATU_API_URL?.replace(':3004','') ?? 'https://matatu-pulse-production.up.railway.app'} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-sm font-semibold text-white hover:bg-green-2 transition">
            Open App <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function StatPill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 backdrop-blur px-4 py-2 text-sm text-white/90 ${className}`}>
      {children}
    </div>
  );
}

function UssdPhone() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px] float-slow">
      <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-tr from-green/30 via-amber/10 to-transparent blur-2xl" />
      <div className="relative rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-[#1b2434] to-[#0c1322] p-3 shadow-2xl">
        <div className="rounded-[1.6rem] bg-[#0a0f1a] p-5 font-mono text-[13px] leading-relaxed text-emerald-300 min-h-[380px]">
          <div className="text-white/40 text-xs mb-3">Dialed: <span className="text-white">*384#</span></div>
          <div className="text-white">NairobiMove</div>
          <div className="text-white/70">Smarter movement.</div>
          <div className="mt-3 text-white">Choose route:</div>
          <div className="mt-1 space-y-0.5 text-white/80">
            <div>1. CBD → Rongai</div>
            <div>2. CBD → Kasarani</div>
            <div>3. Westlands → Karen</div>
            <div>4. Eastleigh → CBD</div>
            <div>5. More routes</div>
          </div>
          <div className="mt-5 flex items-center justify-between text-white/40 text-xs">
            <span>Reply</span>
            <span className="text-emerald-400">|</span>
          </div>
        </div>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-white/15" />
      </div>
    </div>
  );
}

function FleetDashboard() {
  const rows = [
    { plate: "KDA 421X", route: "Rongai SACCO", status: "ok", label: "Compliant", due: "Renews in 92d" },
    { plate: "KCJ 089M", route: "Embassava", status: "warn", label: "NTSA due", due: "14 days" },
    { plate: "KBZ 712P", route: "Super Metro", status: "ok", label: "Compliant", due: "Renews in 41d" },
    { plate: "KDG 556T", route: "Forward Travelers", status: "bad", label: "Insurance expired", due: "Today" },
    { plate: "KCS 311A", route: "Rembo Shuttle", status: "ok", label: "Compliant", due: "Renews in 18d" },
  ];
  const dot = { ok: "bg-emerald-500", warn: "bg-amber", bad: "bg-rose-500" } as const;
  return (
    <div className="relative w-full max-w-[560px] mx-auto float-slower">
      <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-bl from-amber/25 via-green/15 to-transparent blur-2xl" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0c1322] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Gauge className="h-4 w-4 text-amber" />
            <span className="font-semibold">FleetPulse</span>
            <span className="text-white/30">/ Rongai SACCO</span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-white/5">
          {[
            { k: "Vehicles", v: "47", c: "text-white" },
            { k: "Compliant", v: "39", c: "text-emerald-400" },
            { k: "Action needed", v: "8", c: "text-amber" },
          ].map((s) => (
            <div key={s.k} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
              <div className="text-xs text-white/50">{s.k}</div>
              <div className={`text-2xl font-display font-bold ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/5">
          {rows.map((r) => (
            <div key={r.plate} className="flex items-center justify-between px-5 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${dot[r.status as keyof typeof dot]}`} />
                <div>
                  <div className="text-white font-medium">{r.plate}</div>
                  <div className="text-white/40 text-xs">{r.route}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/80">{r.label}</div>
                <div className="text-white/40 text-xs">{r.due}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function Index() {
  const ref = useReveal();
  const stats = useLiveStats();
  return (
    <div ref={ref} className="bg-navy text-white font-body overflow-x-hidden">
      <Nav />

      {/* HERO */}
      <section className="relative pt-32 pb-24 bg-kenyan-pattern overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-green/20 blur-3xl" />
          <div className="absolute top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-amber/10 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 reveal">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
                Live in Nairobi · Powered by Africa's Talking
              </div>
              <h1 className="font-display mt-6 text-5xl sm:text-6xl lg:text-[72px] leading-[1.02] font-bold tracking-tight">
                Every matatu. <br />
                Every SACCO. <br />
                <span className="text-green">Every route.</span> Connected.
              </h1>
              <p className="mt-7 text-lg text-white/70 max-w-xl leading-relaxed">
                NairobiMove brings real-time fares and fleet compliance to Kenya's transport ecosystem — via SMS, USSD, and the web.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={import.meta.env.VITE_MATATU_API_URL?.replace(':3004','') ?? 'https://matatu-pulse-production.up.railway.app'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3.5 text-base font-semibold hover:bg-green-2 transition shadow-lg shadow-green/20">
                  Open MatatuPulse <ExternalLink className="h-5 w-5" />
                </a>
                <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-base font-semibold hover:bg-white/5 transition">
                  See How It Works
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <StatPill><MapPin className="h-4 w-4 text-green" /> {stats.totalRoutes}+ matatu routes mapped</StatPill>
                <StatPill><Gauge className="h-4 w-4 text-amber" /> {stats.totalVehicles}+ vehicles tracked</StatPill>
                <StatPill><Phone className="h-4 w-4 text-white" /> Dial *384*3133# — no app needed</StatPill>
              </div>
            </div>

            <div className="lg:col-span-6 reveal">
              <div className="relative grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5"><UssdPhone /></div>
                <div className="col-span-7"><FleetDashboard /></div>
              </div>
            </div>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto px-6 mt-20 flex justify-center text-white/40 text-xs reveal">
          <a href="#problem" className="inline-flex items-center gap-2 hover:text-white/80 transition">
            Scroll <ArrowDown className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="relative py-28 bg-navy-2">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl reveal">
            <div className="text-amber font-mono text-sm uppercase tracking-widest mb-4">The everyday friction</div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Nairobi moves 4 million people a day.<br/>
              <span className="text-white/50">Most of them are flying blind.</span>
            </h2>
          </div>
          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-3xl">
            {[
              { icon: Users, accent: "text-green", who: "Commuters", line: "You don't know the fare until you're already on the matatu." },
              { icon: Bus, accent: "text-amber", who: "SACCO Owners", line: "NTSA fines hit because paper reminders get lost." },
            ].map((c, i) => (
              <div key={i} className="reveal group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 hover:border-white/20 transition">
                <c.icon className={`h-9 w-9 ${c.accent}`} />
                <div className="mt-6 text-sm uppercase tracking-widest text-white/50">{c.who}</div>
                <p className="mt-3 font-display text-2xl leading-snug">{c.line}</p>
                <div className="mt-8 inline-flex items-center gap-2 text-sm text-white/40">
                  <AlertTriangle className="h-4 w-4" /> Solved by NairobiMove
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MATATUPULSE */}
      <ModuleSection
        id="matatupulse"
        eyebrow="Module 01 · MatatuPulse"
        eyebrowColor="text-blue-accent"
        accentRing="ring-blue-accent/40"
        title="Know your fare before you board."
        body="Dial *384*3133# on any phone — feature phone or smartphone — and get accurate matatu fares, boarding stages, and route info in seconds. No app. No data. No guessing."
        bullets={[
          "Works on all Safaricom & Airtel numbers",
          "Real-time fare range (peak & off-peak)",
          "SMS confirmation sent to your phone",
          "Subscribe to route fare alerts",
        ]}
        cta={{ label: "Open MatatuPulse", href: import.meta.env.VITE_MATATU_API_URL?.replace(':3004','') ?? 'https://matatu-pulse-production.up.railway.app' }}
        visual={<UssdPhone />}
        flip={false}
      />

      {/* FLEETPULSE */}
      <ModuleSection
        id="fleetpulse"
        eyebrow="Module 02 · FleetPulse"
        eyebrowColor="text-amber"
        accentRing="ring-amber/40"
        title="Never miss an NTSA deadline again."
        body="FleetPulse monitors your entire fleet's compliance — NTSA inspection, insurance, and PSV licence — and sends automated SMS reminders before fines hit."
        bullets={[
          "30 / 14 / 7 / 1-day SMS reminders",
          "Drivers confirm via SMS reply",
          "Escalation voice call if no response",
          "Web dashboard for full fleet visibility",
        ]}
        cta={{ label: "Open FleetPulse", href: import.meta.env.VITE_SACCO_API_URL?.replace(':3001','') ?? 'https://sacco-production-1ad8.up.railway.app' }}
        visual={<FleetDashboard />}
        flip
        bg="bg-navy"
      />

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl reveal">
            <div className="text-green font-mono text-sm uppercase tracking-widest mb-4">How it works</div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Three steps. Thirty seconds.
            </h2>
            <p className="mt-5 text-white/60 text-lg">A live look at the MatatuPulse USSD journey — no app required.</p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 items-stretch relative">
            {[
              { n: "01", icon: Phone, title: "Dial *384#", body: "Pick up any phone and dial. Works offline of data networks." },
              { n: "02", icon: Radio, title: "Select your route", body: "Choose origin and destination from a clear USSD menu." },
              { n: "03", icon: MessageSquare, title: "Receive fare SMS", body: "Peak and off-peak fare lands in your inbox instantly." },
            ].map((s, i, arr) => (
              <div key={s.n} className="reveal relative rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                <div className="text-white/30 font-mono text-sm">{s.n}</div>
                <s.icon className="mt-4 h-10 w-10 text-green" />
                <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-white/60">{s.body}</p>
                {i < arr.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 text-amber flow-arrow">
                    <ArrowRight className="h-7 w-7" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-white/50 reveal">
            Takes less than 30 seconds. Works on any phone.
          </p>
        </div>
      </section>

      {/* AT */}
      <section className="relative py-28 bg-navy-2 bg-kenyan-pattern">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7 reveal">
              <div className="text-amber font-mono text-sm uppercase tracking-widest mb-4">Infrastructure</div>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
                Built on Africa's Talking.
              </h2>
              <p className="mt-5 text-white/60 text-lg max-w-xl">
                Four pan-African APIs that let us reach every Kenyan phone — smart or not.
              </p>
            </div>
            <div className="lg:col-span-5 reveal">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 inline-flex items-center gap-3">
                <div className="h-9 w-9 rounded-md bg-amber/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-amber" />
                </div>
                <div>
                  <div className="text-xs text-white/50">Powered by</div>
                  <div className="font-display font-semibold">Africa's Talking</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: MessageSquare, name: "SMS API", line: "Fare confirmations, incident alerts, and compliance reminders." },
              { icon: Radio, name: "USSD API", line: "The *384*3133# experience that runs on any handset." },
              { icon: Headphones, name: "Voice API", line: "Auto-escalation calls when SACCO drivers don't confirm." },
              { icon: Wallet, name: "Airtime API", line: "Instant airtime rewards for commuters who report incidents." },
            ].map((a) => (
              <div key={a.name} className="reveal rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-amber/40 hover:bg-white/[0.05] transition">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber/30 to-green/20 flex items-center justify-center">
                  <a.icon className="h-5 w-5 text-white" />
                </div>
                <div className="mt-5 font-display text-xl font-semibold">{a.name}</div>
                <p className="mt-2 text-sm text-white/55">{a.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl reveal">
            <div className="text-green font-mono text-sm uppercase tracking-widest mb-4">Pricing</div>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Free for every Kenyan. <br/>
              <span className="text-white/50">Powerful for every SACCO.</span>
            </h2>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-6 max-w-3xl">
            <PricingCard
              name="Commuter"
              price="Free"
              priceNote="Forever"
              icon={Users}
              features={[
                "Dial *384*3133# on any phone",
                "Real-time fare range (peak & off-peak)",
                "SMS fare confirmation",
                "Subscribe to route alerts",
              ]}
              cta="Open MatatuPulse"
              href={import.meta.env.VITE_MATATU_API_URL?.replace(':3004','') ?? 'https://matatu-pulse-production.up.railway.app'}
            />
            <PricingCard
              name="SACCO / Fleet"
              price="KES 500"
              priceNote="/month per 10 vehicles"
              icon={Gauge}
              popular
              features={[
                "FleetPulse web dashboard",
                "Automated compliance SMS reminders",
                "Voice escalation on no-response",
                "Driver confirmations & audit log",
              ]}
              cta="Open FleetPulse"
              href={import.meta.env.VITE_SACCO_API_URL?.replace(':3001','') ?? 'https://sacco-production-1ad8.up.railway.app'}
            />
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="relative py-20 bg-navy-2">
        <div className="max-w-5xl mx-auto px-6 reveal">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-green/15 via-amber/10 to-transparent p-10 sm:p-14 text-center">
            <h3 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              Smarter movement for every Kenyan.
            </h3>
            <p className="mt-4 text-white/70 max-w-xl mx-auto">
              Check fares, report incidents, and track your fleet — all without downloading a thing.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-green/40 bg-green/10 px-6 py-3 font-mono text-lg">
                <Phone className="h-5 w-5 text-green" /> Dial <span className="text-green font-bold">*384*3133#</span>
              </div>
              <a href={import.meta.env.VITE_MATATU_API_URL?.replace(':3004','') ?? 'https://matatu-pulse-production.up.railway.app'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 font-semibold hover:bg-green-2 transition">
                Open MatatuPulse <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-5">
              <Logo />
              <p className="mt-4 text-white/55 max-w-sm">
                Smarter movement for every Kenyan. Real-time transport intelligence over SMS, USSD and the web.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-amber" /> Built with Africa's Talking APIs
              </div>
            </div>
            <FooterCol title="Products" links={["MatatuPulse", "FleetPulse"]} />
            <FooterCol title="Account" links={["Register", "Dashboard", "Pricing"]} />
            <div className="md:col-span-2">
              <div className="text-xs uppercase tracking-widest text-white/40">Contact</div>
              <a href="mailto:hello@nairobimove.co.ke" className="mt-4 inline-flex items-center gap-2 text-white/80 hover:text-white">
                <Mail className="h-4 w-4" /> hello@nairobimove.co.ke
              </a>
              <div className="mt-5 flex gap-3 text-white/50">
                <a href="#" className="hover:text-white"><Twitter className="h-4 w-4" /></a>
                <a href="#" className="hover:text-white"><Linkedin className="h-4 w-4" /></a>
                <a href="#" className="hover:text-white"><Github className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <div>© {new Date().getFullYear()} NairobiMove. Made in Nairobi.</div>
            <div>Dial <span className="text-white/80 font-mono">*384*3133#</span> on any Kenyan number to try it now.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="md:col-span-2">
      <div className="text-xs uppercase tracking-widest text-white/40">{title}</div>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l}><a href="#" className="text-white/75 hover:text-white">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}

function ModuleSection({
  id, eyebrow, eyebrowColor, accentRing, title, body, bullets, visual, flip, bg = "bg-navy-2", cta,
}: {
  id: string; eyebrow: string; eyebrowColor: string; accentRing: string;
  title: string; body: string; bullets: string[]; visual: React.ReactNode; flip: boolean; bg?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <section id={id} className={`relative py-28 ${bg}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid lg:grid-cols-12 gap-16 items-center`}>
          <div className={`lg:col-span-6 reveal ${flip ? "lg:order-2" : ""}`}>
            <div className={`font-mono text-sm uppercase tracking-widest ${eyebrowColor}`}>{eyebrow}</div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.05]">
              {title}
            </h2>
            <p className="mt-6 text-lg text-white/65 max-w-xl leading-relaxed">{body}</p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-white/85">
                  <CheckCircle2 className="h-5 w-5 text-green mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {cta && (
              <a href={cta.href} target="_blank" rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/20 transition">
                {cta.label} <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className={`lg:col-span-6 reveal ${flip ? "lg:order-1" : ""}`}>
            <div className={`relative rounded-3xl p-6 sm:p-10 ring-1 ${accentRing} bg-gradient-to-br from-white/[0.04] to-transparent`}>
              {visual}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name, price, priceNote, icon: Icon, features, cta, href, popular,
}: {
  name: string; price: string; priceNote: string; icon: any; features: string[]; cta: string; href: string; popular?: boolean;
}) {
  return (
    <div className={`reveal relative rounded-2xl border p-8 flex flex-col ${popular ? "border-green/60 bg-gradient-to-b from-green/10 to-transparent" : "border-white/10 bg-white/[0.03]"}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Most Popular
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="font-display text-xl font-semibold">{name}</div>
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <div className="font-display text-4xl font-bold">{price}</div>
        <div className="text-white/50 text-sm">{priceNote}</div>
      </div>
      <ul className="mt-7 space-y-3 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-white/80">
            <CheckCircle2 className="h-4 w-4 text-green mt-0.5 shrink-0" /> <span>{f}</span>
          </li>
        ))}
      </ul>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className={`mt-8 inline-flex justify-center items-center gap-2 rounded-full px-5 py-3 font-semibold transition ${popular ? "bg-green hover:bg-green-2" : "bg-white text-navy hover:bg-white/90"}`}>
        {cta} <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
