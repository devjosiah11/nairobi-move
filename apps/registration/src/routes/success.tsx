import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Check, Share2, LayoutDashboard, Home } from "lucide-react";

const searchSchema = z.object({
  role: z.enum(["rider", "fleet"]).default("rider"),
  name: z.string().default("Friend"),
  stage: z.string().optional(),
});

export const Route = createFileRoute("/success")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Welcome to NairobiMove" }] }),
  component: Success,
});

function Success() {
  const { role, name, stage } = Route.useSearch();
  const isRider = role === "rider";

  const shareText = encodeURIComponent(
    "I just joined NairobiMove — Kenya's transport platform. Register here: https://nairobi-move.co.ke"
  );
  const shareUrl = `https://wa.me/?text=${shareText}`;

  return (
    <AppShell>
      <div className="text-center pt-6">
        <div className="mx-auto size-24 rounded-full bg-primary/10 flex items-center justify-center mb-5 animate-in zoom-in duration-500">
          <div className="size-20 rounded-full bg-primary flex items-center justify-center animate-in zoom-in duration-700 delay-150">
            <Check className="size-12 text-primary-foreground" strokeWidth={3} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Welcome to NairobiMove, {name}!
        </h1>

        {isRider ? (
          <div className="mt-5 text-left bg-accent rounded-2xl p-5 space-y-3">
            <p className="text-base text-accent-foreground">
              You're now live at <span className="font-bold">{stage || "your stage"}</span>.
            </p>
            <p className="text-sm text-foreground">
              Passengers can book you by texting{" "}
              <span className="font-bold bg-white px-2 py-0.5 rounded">
                BODA {stage?.split(" ")[0]?.toUpperCase() || "STAGE"}
              </span>{" "}
              to <span className="font-bold">21606</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              You'll receive a confirmation SMS shortly.
            </p>
          </div>
        ) : (
          <div className="mt-5 text-left bg-accent rounded-2xl p-5 space-y-3">
            <p className="text-base text-accent-foreground">
              Your fleet is registered.
            </p>
            <p className="text-sm text-foreground">
              You'll receive SMS alerts before any NTSA, insurance or PSV expiry.
            </p>
            <a
              href="https://fleetpulse.nairobi-move.co.ke"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <LayoutDashboard className="size-4" />
              Open FleetPulse dashboard →
            </a>
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button asChild className="w-full h-12 text-base font-semibold bg-[#25D366] hover:bg-[#25D366]/90">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <Share2 className="size-4" />
              Share NairobiMove with a fellow {isRider ? "rider" : "owner"}
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full h-12 text-base font-semibold">
            <Link to="/">
              <Home className="size-4" /> Back to home
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
