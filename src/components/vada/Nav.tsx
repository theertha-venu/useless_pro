import { Link } from "@tanstack/react-router";

const LINKS = [
  { to: "/analyze", label: "Analysis" },
  { to: "/archive", label: "Archive" },
  { to: "/olympics", label: "Olympics" },
  { to: "/battle", label: "Battle" },
  { to: "/manifesto", label: "Manifesto" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary animate-blip" />
          <span className="font-mono text-sm tracking-[0.28em] text-primary">VADA-METRICS</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-primary border-primary/50 bg-primary/10" }}
              className="rounded-md border border-transparent px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function LabFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>Your vada images remain inside the laboratory — processed locally in your browser.</span>
        <span className="text-primary/70">
          An unnecessarily advanced computer-vision-based metrology platform for the quantitative
          characterization of urad-dal fritters.
        </span>
      </div>
    </footer>
  );
}
