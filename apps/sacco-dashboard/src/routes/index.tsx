import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Plus,
  MoreVertical,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/fleet/Breadcrumb";
import { StatusBadge } from "@/components/fleet/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  vehicles,
  vehicleStatus,
  formatDate,
  type VehicleType,
  type ComplianceStatus,
} from "@/lib/fleet-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleet Overview — FleetPulse" },
      {
        name: "description",
        content:
          "Monitor NTSA, insurance and PSV licence compliance across your SACCO fleet in real time.",
      },
    ],
  }),
  component: FleetOverview,
});

function FleetOverview() {
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [sortByStatus, setSortByStatus] = useState(true);
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const counts: Record<ComplianceStatus, number> = {
      Compliant: 0,
      Expiring: 0,
      Overdue: 0,
    };
    vehicles.forEach((v) => counts[vehicleStatus(v)]++);
    return { total: vehicles.length, ...counts };
  }, []);

  const rows = useMemo(() => {
    const order: Record<ComplianceStatus, number> = { Overdue: 0, Expiring: 1, Compliant: 2 };
    let list = vehicles.filter((v) => typeFilter === "all" || v.type === typeFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) => v.plate.toLowerCase().includes(q) || v.driverName.toLowerCase().includes(q),
      );
    }
    if (sortByStatus) {
      list = [...list].sort(
        (a, b) => order[vehicleStatus(a)] - order[vehicleStatus(b)],
      );
    }
    return list;
  }, [typeFilter, sortByStatus, query]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Breadcrumb items={[{ label: "Dashboard", to: "/" }, { label: "Fleet Overview" }]} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compliance status across all {stats.total} vehicles in your SACCO.
          </p>
        </div>
        <Link to="/add-vehicle">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Vehicles"
          value={stats.total}
          icon={Truck}
          accent="bg-navy/5 text-navy"
        />
        <StatCard
          label="Compliant"
          value={stats.Compliant}
          icon={CheckCircle2}
          accent="bg-success/10 text-success"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.Expiring}
          icon={AlertTriangle}
          accent="bg-primary/15 text-warning-foreground"
          sub="Within 14 days"
        />
        <StatCard
          label="Overdue"
          value={stats.Overdue}
          icon={XCircle}
          accent="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 flex flex-wrap gap-3 items-center justify-between border-b">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plate or driver…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as VehicleType | "all")}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vehicle types</SelectItem>
                <SelectItem value="matatu">Matatu</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="lorry">Lorry</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortByStatus((s) => !s)}
              className={cn(sortByStatus && "border-primary text-foreground")}
            >
              {sortByStatus ? "Sorted by status" : "Sort by status"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4 font-medium">Plate</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">NTSA Inspection</th>
                <th className="py-3 px-4 font-medium">Insurance</th>
                <th className="py-3 px-4 font-medium">PSV Licence</th>
                <th className="py-3 px-4 font-medium">Driver</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <VehicleRow key={v.plate} plate={v.plate} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted-foreground py-10">
                    No vehicles match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof Truck;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-3xl font-bold mt-2 tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function VehicleRow({ plate }: { plate: string }) {
  const navigate = useNavigate();
  const v = vehicles.find((x) => x.plate === plate)!;
  const status = vehicleStatus(v);

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => navigate({ to: "/vehicles/$plate", params: { plate: v.plate } })}
    >
      <td className="py-3 px-4 font-semibold tracking-wide">{v.plate}</td>
      <td className="py-3 px-4 capitalize text-muted-foreground">{v.type}</td>
      <td className="py-3 px-4">{formatDate(v.ntsaExpiry)}</td>
      <td className="py-3 px-4">{formatDate(v.insuranceExpiry)}</td>
      <td className="py-3 px-4">{formatDate(v.psvExpiry)}</td>
      <td className="py-3 px-4">{v.driverName}</td>
      <td className="py-3 px-4">
        <StatusBadge status={status} />
      </td>
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate({ to: "/vehicles/$plate", params: { plate: v.plate } })}
            >
              View details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success(`Reminder sent to ${v.driverName}`)}>
              Send reminder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success(`${v.plate} marked as renewed`)}>
              Mark as renewed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
