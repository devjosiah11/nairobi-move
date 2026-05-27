import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/fleet/Breadcrumb";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Button } from "@/components/ui/button";
import { vehicles, vehicleStatus, formatDate } from "@/lib/fleet-data";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Compliance Report — FleetPulse" }] }),
  component: ReportPage,
});

const chartData = [
  { month: "Dec", Compliant: 6, Expiring: 1, Overdue: 1 },
  { month: "Jan", Compliant: 5, Expiring: 2, Overdue: 1 },
  { month: "Feb", Compliant: 6, Expiring: 2, Overdue: 0 },
  { month: "Mar", Compliant: 7, Expiring: 1, Overdue: 0 },
  { month: "Apr", Compliant: 5, Expiring: 2, Overdue: 1 },
  { month: "May", Compliant: 4, Expiring: 2, Overdue: 2 },
];

function ReportPage() {
  const totals = {
    Compliant: vehicles.filter((v) => vehicleStatus(v) === "Compliant").length,
    Expiring: vehicles.filter((v) => vehicleStatus(v) === "Expiring").length,
    Overdue: vehicles.filter((v) => vehicleStatus(v) === "Overdue").length,
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <Breadcrumb items={[{ label: "Dashboard", to: "/" }, { label: "Compliance Report" }]} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rongai Express SACCO · {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => toast.success("PDF export queued")}
          >
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Summary label="Compliant" value={totals.Compliant} tone="text-success" />
        <Summary label="Expiring soon" value={totals.Expiring} tone="text-warning-foreground" />
        <Summary label="Overdue" value={totals.Overdue} tone="text-destructive" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Compliance trend (last 6 months)
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Compliant" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expiring" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Overdue" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Vehicle-by-vehicle summary
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
              <th className="py-3 px-4 font-medium">Plate</th>
              <th className="py-3 px-4 font-medium">Type</th>
              <th className="py-3 px-4 font-medium">NTSA</th>
              <th className="py-3 px-4 font-medium">Insurance</th>
              <th className="py-3 px-4 font-medium">PSV</th>
              <th className="py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.plate} className="border-b last:border-0">
                <td className="py-3 px-4 font-semibold">{v.plate}</td>
                <td className="py-3 px-4 capitalize text-muted-foreground">{v.type}</td>
                <td className="py-3 px-4">{formatDate(v.ntsaExpiry)}</td>
                <td className="py-3 px-4">{formatDate(v.insuranceExpiry)}</td>
                <td className="py-3 px-4">{formatDate(v.psvExpiry)}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={vehicleStatus(v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-2 tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
