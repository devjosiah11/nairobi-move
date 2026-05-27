import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/fleet/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/add-vehicle")({
  head: () => ({ meta: [{ title: "Add Vehicle — FleetPulse" }] }),
  component: AddVehicle,
});

interface FormState {
  plate: string;
  type: string;
  driverName: string;
  driverPhone: string;
  ownerPhone: string;
  ntsa: string;
  insurance: string;
  psv: string;
}

const empty: FormState = {
  plate: "",
  type: "",
  driverName: "",
  driverPhone: "",
  ownerPhone: "",
  ntsa: "",
  insurance: "",
  psv: "",
};

function AddVehicle() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!/^[A-Z]{3}\s?\d{3}[A-Z]$/i.test(form.plate.trim()))
      e.plate = "Use Kenyan format, e.g. KCA 123G";
    if (!form.type) e.type = "Select a vehicle type";
    if (form.driverName.trim().length < 2) e.driverName = "Enter the driver's name";
    if (!/^\+?254\d{9}$/.test(form.driverPhone.replace(/\s/g, "")))
      e.driverPhone = "Use +254 format";
    if (!/^\+?254\d{9}$/.test(form.ownerPhone.replace(/\s/g, "")))
      e.ownerPhone = "Use +254 format";
    if (!form.ntsa) e.ntsa = "Required";
    if (!form.insurance) e.insurance = "Required";
    if (!form.psv) e.psv = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    toast.success(`${form.plate.toUpperCase()} added — SMS alerts enabled`);
    navigate({ to: "/" });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Breadcrumb items={[{ label: "Dashboard", to: "/" }, { label: "Add Vehicle" }]} />
      <h1 className="text-2xl font-bold tracking-tight">Add a vehicle</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Register a vehicle and we'll automatically send SMS reminders to the driver and owner.
      </p>

      <form onSubmit={onSubmit} className="bg-card rounded-xl border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Plate Number" error={errors.plate}>
            <Input
              value={form.plate}
              onChange={(e) => set("plate", e.target.value.toUpperCase())}
              placeholder="KCA 123G"
              maxLength={10}
            />
          </Field>
          <Field label="Vehicle Type" error={errors.type}>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matatu">Matatu</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
                <SelectItem value="lorry">Lorry</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Driver Name" error={errors.driverName}>
            <Input
              value={form.driverName}
              onChange={(e) => set("driverName", e.target.value)}
              placeholder="Joseph Kamau"
              maxLength={80}
            />
          </Field>
          <Field label="Driver Phone Number" error={errors.driverPhone}>
            <Input
              value={form.driverPhone}
              onChange={(e) => set("driverPhone", e.target.value)}
              placeholder="+254712345678"
            />
          </Field>
          <Field label="Owner Phone Number" error={errors.ownerPhone}>
            <Input
              value={form.ownerPhone}
              onChange={(e) => set("ownerPhone", e.target.value)}
              placeholder="+254722111222"
            />
          </Field>
          <div />
          <Field label="NTSA Inspection Expiry" error={errors.ntsa}>
            <Input type="date" value={form.ntsa} onChange={(e) => set("ntsa", e.target.value)} />
          </Field>
          <Field label="Insurance Expiry" error={errors.insurance}>
            <Input
              type="date"
              value={form.insurance}
              onChange={(e) => set("insurance", e.target.value)}
            />
          </Field>
          <Field label="PSV Licence Expiry" error={errors.psv}>
            <Input type="date" value={form.psv} onChange={(e) => set("psv", e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })}>
            Cancel
          </Button>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Add Vehicle & Enable Alerts
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
