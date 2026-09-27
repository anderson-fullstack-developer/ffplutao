import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { cn } from "@/lib/format";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)}>
      <span className="gold-surface glow-cta flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
        <Flame className="size-5" />
      </span>
      {!compact && (
        <span className="font-display text-lg leading-none font-extrabold tracking-tight">
          PLUTÃO <span className="gold-text">SHOP</span>
        </span>
      )}
    </Link>
  );
}
