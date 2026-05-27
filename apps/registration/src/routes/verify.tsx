import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Field } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a Rider — NairobiMove" },
      { name: "description", content: "Check if a boda rider or vehicle is registered with NairobiMove." },
    ],
  }),
  component: Verify,
});

// Mock dataset
const MOCK = [
  { plate: "KMFA123A", phone: "+254712345678", name: "John Mwangi", stage: "Westlands Total", registered: "2024-08-14", status: "Active" as const },
  { plate: "KMEB456B", phone: "+254722654321", name: "Peter Otieno", stage: "CBD Archives", registered: "2024-03-22", status: "Suspended" as const },
  { plate: "KCA123X", phone: "+254733111222", name: "Embassava SACCO — KCA 123X", stage: "Nairobi", registered: "2023-11-05", status: "Active" as const },
];

type Result = (typeof MOCK)[number] | null;

function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | "notfound" | null>(null);

  const search = () => {
    const q = query.replace(/\s/g, "").toUpperCase();
    if (!q) return;
    const found = MOCK.find(
      (r) => r.plate.toUpperCase() === q || r.phone.replace(/\s/g, "") === q || r.phone.endsWith(q),
    );
    setResult(found || "notfound");
  };

  return (
    <AppShell>
      <Link to="/" className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-1">Verify a Rider</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Enter a plate number or phone to confirm a rider is registered with NairobiMove.
      </p>

      <div className="space-y-3">
        <Field label="Plate number or phone" htmlFor="q">
          <Input
            id="q"
            className="h-12 text-base"
            placeholder="e.g. KMFA 123A or +254712..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </Field>
        <Button className="w-full h-12 text-base font-semibold" onClick={search}>
          <Search className="size-4" /> Search
        </Button>
      </div>

      {result === "notfound" && (
        <div className="mt-6 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5 text-center">
          <XCircle className="size-10 text-destructive mx-auto mb-2" />
          <p className="font-semibold text-foreground">Not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This plate or number isn't registered on NairobiMove. Be cautious.
          </p>
        </div>
      )}

      {result && result !== "notfound" && (
        <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-6 text-primary" />
            <span className="font-semibold text-foreground">Registered</span>
            <Badge
              className="ml-auto"
              variant={result.status === "Active" ? "default" : "destructive"}
            >
              {result.status}
            </Badge>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={result.name} />
            <Row label="Stage / Area" value={result.stage} />
            <Row label="Registered" value={new Date(result.registered).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })} />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Phone number hidden for privacy.
          </p>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}
