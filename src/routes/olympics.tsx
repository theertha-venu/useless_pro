import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Button } from "@/components/ui/button";
import { loadArchive, type SpecimenRecord } from "@/lib/vada/store";
import { round } from "@/lib/vada/science";

export const Route = createFileRoute("/olympics")({
  head: () => ({
    meta: [
      { title: "Vada Olympics | VADA-METRICS" },
      {
        name: "description",
        content:
          "Leaderboards for roundness, hole efficiency, symmetry and overall Vada Quality Score™ across your archived specimens.",
      },
      { property: "og:title", content: "Vada Olympics | VADA-METRICS" },
      {
        property: "og:description",
        content: "Competitive fritter metrology. Medals are awarded by an unaccountable algorithm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OlympicsPage,
});

const EVENTS = [
  { key: "overall", label: "Overall Quality Score™", get: (r: SpecimenRecord) => r.metrics.score.overall },
  { key: "round", label: "Roundness Index™", get: (r: SpecimenRecord) => r.metrics.circularity },
  { key: "hole", label: "Hole Efficiency", get: (r: SpecimenRecord) => r.metrics.holeEfficiency },
  { key: "sym", label: "Bilateral Symmetry", get: (r: SpecimenRecord) => r.metrics.symmetry },
  { key: "size", label: "Heavyweight Diameter", get: (r: SpecimenRecord) => r.metrics.outerDiameter },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

function OlympicsPage() {
  const [records, setRecords] = useState<SpecimenRecord[]>([]);
  useEffect(() => {
    const sync = () => setRecords(loadArchive());
    sync();
    window.addEventListener("vada-archive-updated", sync);
    return () => window.removeEventListener("vada-archive-updated", sync);
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="label-mono">Competitive division</p>
        <h1 className="mt-2 font-display text-4xl font-bold">The Vada Olympics</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Five events. No prize money. Rankings derive strictly from your locally archived
          specimens.
        </p>

        {records.length === 0 ? (
          <div className="lab-panel mt-8 p-10 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
              No athletes registered
            </p>
            <Button asChild className="mt-5">
              <Link to="/analyze">Submit a competitor</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {EVENTS.map((ev) => {
              const ranked = [...records].sort((a, b) => ev.get(b) - ev.get(a)).slice(0, 5);
              return (
                <div key={ev.key} className="lab-panel p-5">
                  <h2 className="font-display text-lg font-semibold">{ev.label}</h2>
                  <ul className="mt-4 space-y-2">
                    {ranked.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span>
                          <span className="truncate text-sm">{r.name}</span>
                        </span>
                        <span className="font-mono text-sm text-primary">
                          {round(ev.get(r), 1)}
                          {ev.key === "size" ? ` ${r.metrics.unit}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        <LabFooter />
      </main>
    </div>
  );
}
