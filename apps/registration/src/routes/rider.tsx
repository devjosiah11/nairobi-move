import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Field, ProgressBar } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, ArrowLeft } from "lucide-react";
import { NAIROBI_STAGES, MOTO_MAKES } from "@/lib/nairobi-data";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [{ title: "Boda Rider Registration — NairobiMove" }],
  }),
  component: RiderRegister,
});

type Form = {
  fullName: string;
  phone: string;
  idNumber: string;
  stage: string;
  plate: string;
  make: string;
  psb: string;
  kinName: string;
  kinPhone: string;
  agreed: boolean;
};

function RiderRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>({
    fullName: "",
    phone: "",
    idNumber: "",
    stage: "",
    plate: "",
    make: "",
    psb: "",
    kinName: "",
    kinPhone: "",
    agreed: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validateStep1 = () => {
    const e: typeof errors = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!/^\+254\d{9}$/.test(form.phone)) e.phone = "Enter a valid +254 phone number";
    if (!/^\d{7,9}$/.test(form.idNumber)) e.idNumber = "Enter a valid national ID";
    if (!form.stage) e.stage = "Pick your stage";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: typeof errors = {};
    if (!form.plate.trim()) e.plate = "Plate number required";
    if (!form.make) e.make = "Pick a make";
    if (!form.psb.trim()) e.psb = "PSB licence required";
    if (!form.kinName.trim()) e.kinName = "Next of kin name required";
    if (!/^\+254\d{9}$/.test(form.kinPhone)) e.kinPhone = "Enter a valid +254 phone number";
    if (!form.agreed) e.agreed = "Please accept the terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validateStep2()) return;
    const params = new URLSearchParams({
      role: "rider",
      name: form.fullName.split(" ")[0],
      stage: form.stage,
    });
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

      <h1 className="text-2xl font-bold text-foreground mb-1">Boda Rider Registration</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Takes about 2 minutes. We'll text you a confirmation.
      </p>

      <ProgressBar step={step} total={2} />

      {step === 1 && (
        <div className="space-y-4">
          <Field label="Full Name" htmlFor="fullName" error={errors.fullName}>
            <Input id="fullName" className="h-12 text-base" placeholder="e.g. John Mwangi"
              value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </Field>

          <Field label="Phone Number" htmlFor="phone" error={errors.phone} hint="We'll send bookings here">
            <PhoneInput id="phone" value={form.phone} onChange={(v) => set("phone", v)} />
          </Field>

          <Field label="ID Number" htmlFor="id" error={errors.idNumber}>
            <Input id="id" inputMode="numeric" className="h-12 text-base" placeholder="National ID"
              value={form.idNumber} onChange={(e) => set("idNumber", e.target.value.replace(/\D/g, ""))} />
          </Field>

          <Field label="Stage / Operating Area" htmlFor="stage" error={errors.stage}>
            <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
              <SelectTrigger id="stage" className="h-12 text-base">
                <SelectValue placeholder="Select your stage" />
              </SelectTrigger>
              <SelectContent>
                {NAIROBI_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Profile Photo (optional)" htmlFor="photo">
            <label className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border p-3 cursor-pointer">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Camera className="size-6" />
              </div>
              <span className="text-sm text-muted-foreground">Tap to add a photo</span>
              <input id="photo" type="file" accept="image/*" className="hidden" />
            </label>
          </Field>

          <Button
            className="w-full h-12 text-base font-semibold mt-2"
            onClick={() => validateStep1() && setStep(2)}
          >
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Motorcycle Plate Number" htmlFor="plate" error={errors.plate}>
            <Input id="plate" className="h-12 text-base uppercase" placeholder="KMFA 123A"
              value={form.plate} onChange={(e) => set("plate", e.target.value.toUpperCase())} />
          </Field>

          <Field label="Motorcycle Make" htmlFor="make" error={errors.make}>
            <Select value={form.make} onValueChange={(v) => set("make", v)}>
              <SelectTrigger id="make" className="h-12 text-base">
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {MOTO_MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="PSB Licence Number" htmlFor="psb" error={errors.psb} hint="Public Service Board licence">
            <Input id="psb" className="h-12 text-base" value={form.psb}
              onChange={(e) => set("psb", e.target.value)} />
          </Field>

          <Field label="Next of Kin Name" htmlFor="kin" error={errors.kinName}>
            <Input id="kin" className="h-12 text-base" value={form.kinName}
              onChange={(e) => set("kinName", e.target.value)} />
          </Field>

          <Field label="Next of Kin Phone" htmlFor="kinPhone" error={errors.kinPhone}>
            <PhoneInput id="kinPhone" value={form.kinPhone} onChange={(v) => set("kinPhone", v)} />
          </Field>

          <label className="flex items-start gap-3 rounded-lg bg-muted p-3">
            <Checkbox
              id="agree"
              checked={form.agreed}
              onCheckedChange={(c) => set("agreed", c === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              I agree to NairobiMove terms and safety guidelines.
            </span>
          </label>
          {errors.agreed && <p className="text-xs font-medium text-destructive -mt-2">{errors.agreed}</p>}

          <Button className="w-full h-12 text-base font-semibold" onClick={submit}>
            Register & Activate SMS Alerts
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function PhoneInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const local = value.startsWith("+254") ? value.slice(4) : "";
  return (
    <div className="flex h-12 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
      <span className="flex items-center px-3 bg-muted text-base font-medium text-foreground border-r border-input">
        +254
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder="7XX XXX XXX"
        className="flex-1 px-3 text-base bg-transparent outline-none"
        value={local}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(digits ? `+254${digits}` : "");
        }}
      />
    </div>
  );
}
