import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Breadcrumb } from "@/components/fleet/Breadcrumb";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smsLog, type SmsMessage } from "@/lib/fleet-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sms")({
  head: () => ({ meta: [{ title: "SMS Log — FleetPulse" }] }),
  component: SmsLogPage,
});

const typeStyles: Record<SmsMessage["type"], string> = {
  reminder: "bg-primary/15 text-warning-foreground border-primary/30",
  confirmation: "bg-success/15 text-success border-success/30",
  escalation: "bg-destructive/15 text-destructive border-destructive/30",
};

function SmsLogPage() {
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<SmsMessage["type"] | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    return smsLog
      .filter((m) => (plate ? m.plate.toLowerCase().includes(plate.toLowerCase()) : true))
      .filter((m) => (type === "all" ? true : m.type === type))
      .filter((m) => (from ? m.timestamp >= from : true))
      .filter((m) => (to ? m.timestamp <= to + "T23:59:59Z" : true))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [plate, type, from, to]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Breadcrumb items={[{ label: "Dashboard", to: "/" }, { label: "SMS Log" }]} />
      <h1 className="text-2xl font-bold tracking-tight mb-1">SMS Activity</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Every reminder, confirmation, and escalation sent across your fleet.
      </p>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 border-b">
          <Input
            placeholder="Filter by plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
          />
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All message types</SelectItem>
              <SelectItem value="reminder">Reminder</SelectItem>
              <SelectItem value="confirmation">Confirmation</SelectItem>
              <SelectItem value="escalation">Escalation</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Plate</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Message</th>
                <th className="py-3 px-4 font-medium">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                    {new Date(m.timestamp).toLocaleString("en-KE")}
                  </td>
                  <td className="py-3 px-4 font-semibold">{m.plate}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                        typeStyles[m.type],
                      )}
                    >
                      {m.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-md truncate">{m.body}</td>
                  <td className="py-3 px-4">
                    {m.status === "Delivered" ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-10">
                    No messages match your filters.
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
