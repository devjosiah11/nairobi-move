import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/fleet/Breadcrumb";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  vehicles,
  vehicleStatus,
  itemStatus,
  daysUntil,
  formatDate,
  smsForVehicle,
  type ComplianceStatus,
} from "@/lib/fleet-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vehicles/$plate")({
  head: ({ params }) => ({
    meta: [{ title: `${params.plate} — FleetPulse` }],
  }),
  loader: ({ params }) => {
    const v = vehicles.find((x) => x.plate === params.plate);
    if (!v) throw notFound();
    return { vehicle: v };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p className="text-muted-foreground">Vehicle not found.</p>
      <Link to="/" className="text-primary text-sm font-medium mt-2 inline-block">
        Back to fleet
      </Link>
    </div>
  ),
  component: VehicleDetail,
});

function VehicleDetail() {
  const { vehicle: v } = Route.useLoaderData();
  const status = vehicleStatus(v);
  const messages = smsForVehicle(v.plate);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <Breadcrumb
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Fleet", to: "/" },
          { label: v.plate },
        ]}
      />

      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to fleet
      </Link>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{v.plate}</h1>
        <span className="px-2.5 py-1 rounded-md bg-navy/5 text-navy text-xs font-medium uppercase tracking-wide">
          {v.type}
        </span>
        <StatusBadge status={status} />
        <div className="ml-auto text-right text-sm">
          <div className="text-muted-foreground">Driver</div>
          <div className="font-medium">{v.driverName}</div>
          <div className="text-xs text-muted-foreground">{v.driverPhone}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ComplianceCard
          title="NTSA Inspection"
          expiry={v.ntsaExpiry}
          lastRenewed={v.ntsaLastRenewed}
        />
        <ComplianceCard
          title="Insurance"
          expiry={v.insuranceExpiry}
          lastRenewed={v.insuranceLastRenewed}
        />
        <ComplianceCard
          title="PSV Licence"
          expiry={v.psvExpiry}
          lastRenewed={v.psvLastRenewed}
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
          Reminder Timeline
        </h2>
        <Timeline expiryDays={daysUntil(v.insuranceExpiry)} />
        <p className="text-xs text-muted-foreground mt-4">
          Based on the next expiring item: <strong>Insurance</strong> ({formatDate(v.insuranceExpiry)})
        </p>
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          SMS History
        </h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No messages sent for this vehicle yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    m.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1 flex items-center gap-2">
                    <span>{m.direction === "outbound" ? "FleetPulse →" : `← ${v.driverName}`}</span>
                    <span>•</span>
                    <span>{new Date(m.timestamp).toLocaleString("en-KE")}</span>
                  </div>
                  <div>{m.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceCard({
  title,
  expiry,
  lastRenewed,
}: {
  title: string;
  expiry: string;
  lastRenewed: string;
}) {
  const status = itemStatus(expiry);
  const days = daysUntil(expiry);
  const tone: Record<ComplianceStatus, string> = {
    Compliant: "text-success",
    Expiring: "text-warning-foreground",
    Overdue: "text-destructive",
  };
  return (
    <div className="bg-card rounded-xl border shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <StatusBadge status={status} />
      </div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Expires</div>
      <div className="text-lg font-semibold">{formatDate(expiry)}</div>
      <div className={cn("text-sm mt-1 font-medium", tone[status])}>
        {days >= 0 ? `${days} days remaining` : `${Math.abs(days)} days overdue`}
      </div>
      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
        Last renewed {formatDate(lastRenewed)}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-3"
        onClick={() => toast.success(`${title} marked as renewed`)}
      >
        <CheckCheck className="h-4 w-4" /> Mark renewed
      </Button>
    </div>
  );
}

function Timeline({ expiryDays }: { expiryDays: number }) {
  const steps = [
    { label: "30 days", at: 30 },
    { label: "14 days", at: 14 },
    { label: "7 days", at: 7 },
    { label: "1 day", at: 1 },
    { label: "Expiry", at: 0 },
  ];
  return (
    <div className="relative">
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
      <div className="relative flex justify-between">
        {steps.map((s) => {
          const sent = expiryDays <= s.at;
          const current =
            (expiryDays <= s.at && expiryDays > (steps[steps.indexOf(s) + 1]?.at ?? -Infinity));
          return (
            <div key={s.label} className="flex flex-col items-center text-center w-16">
              <div
                className={cn(
                  "h-8 w-8 rounded-full border-2 flex items-center justify-center bg-card",
                  sent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                  current && "ring-4 ring-primary/20",
                )}
              >
                {sent ? <CheckCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="text-xs mt-2 font-medium">{s.label}</div>
              <div className="text-[10px] text-muted-foreground">
                {sent ? "Sent" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
