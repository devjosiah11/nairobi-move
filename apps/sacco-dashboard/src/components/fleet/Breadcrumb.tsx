import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center">
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "text-foreground font-medium" : ""}>{c.label}</span>
            )}
            {!last && <ChevronRight className="h-4 w-4 mx-1.5 text-muted-foreground/50" />}
          </span>
        );
      })}
    </nav>
  );
}
