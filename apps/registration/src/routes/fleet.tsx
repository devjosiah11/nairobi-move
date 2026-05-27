import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { AppShell, Field, ProgressBar } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ArrowLeft, CalendarIcon, AlertTriangle } from "lucide-react";
import { COUNTIES, VEHICLE_TYPES } from "@/lib/nairobi-data";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [{ title: "SACCO / Fleet Registration — NairobiMove" }],
  }),
  component: FleetRegister,
});

type Form = {
  saccoName: string;
  ownerName: string;
  phone: string;
  fleetSize: string;
  county: string;
  plate: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  ntsa?: Date;
  insurance?: Date;
  psv?: Date;
};

function FleetRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    saccoName: "", ownerName: "", phone: "", fleetSize: "", county: "",
    plate: "", vehicleType: "", driverName: "", driverPhone: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate1 = () => {
    const e: typeof errors = {};
    if (!form.saccoName.trim()) e.saccoName = "SACCO / business name required";
    if (!form.ownerName.trim()) e.ownerName = "Your name is required";
    if (!/^\+254\d{9}$/.test(form.phone)) e.phone = "Enter a valid +254 phone";
    if (!form.fleetSize || Number(form.fleetSize) < 1) e.fleetSize = "Enter at least 1 vehicle";
    if (!form.county) e.county = "Pick a county";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e: typeof errors = {};
    if (!form.plate.trim()) e.plate = "Plate required";
    if (!form.vehicleType) e.vehicleType = "Pick a vehicle type";
    if (!form.driverName.trim()) e.driverName = "Driver name required";
    if (!/^\+254\d{9}$/.test(form.driverPhone)) e.driverPhone = "Enter a valid +254 phone";
    if (!form.ntsa) e.ntsa = "Pick NTSA expiry";
    if (!form.insurance) e.insurance = "Pick insurance expiry";
    if (!form.psv) e.psv = "Pick PSV expiry";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate2()) return;
    const params = new URLSearchParams({ role: "fleet", name: form.ownerName.split(" ")[0] });
    navigate({ to: `/success?${params.toString()}` as "/success" });
  };

  return (
    <AppShell>
      <div className="flex items-center gap-2 mb-3">
        {step === 1 ? (
          <Link to="/" className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back
          </Link>
        ) : (
          <button onClick={() => setStep(1)} className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="size-4" /> Back
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">SACCO / Fleet Registration</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Register your fleet to get NTSA, insurance and PSV expiry alerts.
      </p>

      <ProgressBar step={step} total={2} />

      {step === 1 && (
        <div className="space-y-4">
          <Field label="SACCO / Business Name" htmlFor="sacco" error={errors.saccoName}>
            <Input id="sacco" className="h-12 text-base" placeholder="e.g. Embassava SACCO"
              value={form.saccoName} onChange={(e) => set("saccoName", e.target.value)} />
          </Field>
          <Field label="Your Name (Owner / Manager)" htmlFor="owner" error={errors.ownerName}>
            <Input id="owner" className="h-12 text-base"
              value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
          </Field>
          <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
            <PhoneInput id="phone" value={form.phone} onChange={(v) => set("phone", v)} />
          </Field>
          <Field label="Number of Vehicles in Fleet" htmlFor="size" error={errors.fleetSize}>
            <Input id="size" type="number" min={1} className="h-12 text-base"
              value={form.fleetSize} onChange={(e) => set("fleetSize", e.target.value)} />
          </Field>
          <Field label="County of Operation" htmlFor="county" error={errors.county}>
            <Select value={form.county} onValueChange={(v) => set("county", v)}>
              <SelectTrigger id="county" className="h-12 text-base">
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Button className="w-full h-12 text-base font-semibold mt-2"
            onClick={() => validate1() && setStep(2)}>Next</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground bg-accent text-accent-foreground rounded-lg p-3">
            Add your first vehicle now. You can add the rest from your dashboard later.
          </p>
          <Field label="Plate Number" htmlFor="plate" error={errors.plate}>
            <Input id="plate" className="h-12 text-base uppercase" placeholder="KCA 123X"
              value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Vehicle Type" htmlFor="vtype" error={errors.vehicleType}>
            <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)}>
              <SelectTrigger id="vtype" className="h-12 text-base">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Driver Name" htmlFor="dname" error={errors.driverName}>
            <Input id="dname" className="h-12 text-base"
              value={form.driverName} onChange={(e) => set("driverName", e.target.value)} />
          </Field>
          <Field label="Driver Phone" htmlFor="dphone" error={errors.driverPhone}>
            <PhoneInput id="dphone" value={form.driverPhone} onChange={(v) => set("driverPhone", v)} />
          </Field>
          <DateField label="NTSA Inspection Expiry" value={form.ntsa} onChange={(d) => set("ntsa", d)} error={errors.ntsa} />
          <DateField label="Insurance Expiry" value={form.insurance} onChange={(d) => set("insurance", d)} error={errors.insurance} />
          <DateField label="PSV Licence Expiry" value={form.psv} onChange={(d) => set("psv", d)} error={errors.psv} />

          <Button className="w-full h-12 text-base font-semibold" onClick={submit}>
            Register Fleet & Enable Alerts
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function DateField({ label, value, onChange, error }: { label: string; value?: Date; onChange: (d: Date) => void; error?: string }) {
  const isPast = value ? value < new Date(new Date().toDateString()) : false;
  return (
    <Field label={label} htmlFor={label} error={error}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn(
            "w-full h-12 justify-start text-left text-base font-normal",
            !value && "text-muted-foreground",
            isPast && "border-destructive text-destructive"
          )}>
            <CalendarIcon className="mr-2 size-4" />
            {value ? format(value, "PPP") : "Pick a date"}
            {isPast && <AlertTriangle className="ml-auto size-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(d) => d && onChange(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      {isPast && <p className="text-xs font-medium text-destructive mt-1">⚠ This date has already passed</p>}
    </Field>
  );
}

function PhoneInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const local = value.startsWith("+254") ? value.slice(4) : "";
  return (
    <div className="flex h-12 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      <span className="flex items-center px-3 bg-muted text-base font-medium text-foreground border-r border-input">+254</span>
      <input id={id} type="tel" inputMode="numeric" placeholder="7XX XXX XXX"
        className="flex-1 px-3 text-base bg-transparent outline-none" value={local}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(d ? `+254${d}` : "");
        }} />
    </div>
  );
}
