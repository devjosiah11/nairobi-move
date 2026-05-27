import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, Bike } from "lucide-react";
import { type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
              <Bike className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-base text-foreground">NairobiMove</div>
              <div className="text-[11px] text-muted-foreground">Join the Platform</div>
            </div>
          </Link>
          <a
            href="tel:0800000000"
            className="flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            <Phone className="size-4" />
            <span className="hidden xs:inline">Need help?</span>
            <span>0800 000 000</span>
          </a>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-4 py-5 pb-28">{children}</main>

      <a
        href="https://wa.me/254800000000?text=I%20need%20help%20joining%20NairobiMove"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-[#25D366] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <MessageCircle className="size-7" />
      </a>
    </div>
  );
}

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          Step {step} of {total}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round((step / total) * 100)}%
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
