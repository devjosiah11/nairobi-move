import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bike, Bus, ArrowRight, ShieldCheck, MessageSquare, Coins } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NairobiMove — Join Kenya's Transport Platform" },
      {
        name: "description",
        content:
          "Boda boda riders and SACCO fleet owners — register with NairobiMove to get SMS bookings, NTSA alerts and airtime rewards.",
      },
      { property: "og:title", content: "NairobiMove — Join Kenya's Transport Platform" },
      {
        property: "og:description",
        content: "Register your boda or SACCO fleet in under 2 minutes.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <AppShell>
      <section className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">
          Join NairobiMove — <span className="text-primary">Kenya's Transport Platform</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Get bookings via SMS, stay compliant with NTSA alerts, and earn airtime rewards.
        </p>
      </section>

      <div className="flex justify-center gap-4 mb-7 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1"><MessageSquare className="size-3.5 text-primary" /> SMS bookings</div>
        <div className="flex items-center gap-1"><ShieldCheck className="size-3.5 text-primary" /> SOS</div>
        <div className="flex items-center gap-1"><Coins className="size-3.5 text-primary" /> Airtime</div>
      </div>

      <div className="space-y-4">
        <RoleCard
          to="/rider"
          icon={<Bike className="size-7" />}
          title="I'm a Boda Rider"
          desc="Get passenger bookings via SMS, earn airtime, activate SOS protection."
        />
        <RoleCard
          to="/fleet"
          icon={<Bus className="size-7" />}
          title="I manage a SACCO or Fleet"
          desc="Track NTSA, insurance and PSV licence expiry for your entire fleet."
        />
      </div>

      <div className="mt-8 text-center">
        <Link to="/verify" className="text-sm font-medium text-primary underline underline-offset-4">
          Verify a registered rider →
        </Link>
      </div>
    </AppShell>
  );
}

function RoleCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border-2 border-border bg-card p-5 active:scale-[0.99] active:border-primary transition-all hover:border-primary/60"
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 size-14 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base">
        Get Started <ArrowRight className="size-4" />
      </div>
    </Link>
  );
}
