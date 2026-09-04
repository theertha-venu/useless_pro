import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Button } from "@/components/ui/button";
import { clearArchive, deleteSpecimen, loadArchive, type SpecimenRecord } from "@/lib/vada/store";
import { round } from "@/lib/vada/science";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "National Vada Archive | VADA-METRICS" },
      {
        name: "description",
        content:
          "Every specimen you have analysed, stored locally in your browser with scores, measurements and classification.",
      },
      { property: "og:title", content: "National Vada Archive | VADA-METRICS" },
      {
        property: "og:description",
        content: "A permanent local record of fritters that were measured far too carefully.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchivePage,
});

function useArchive() {
  const [records, setRecords] = useState<SpecimenRecord[]>([]);
  useEffect(() => {
    const sync = () => setRecords(loadArchive());
    sync();
    window.addEventListener("vada-archive-updated", sync);
    return () => window.removeEventListener("vada-archive-updated", sync);
  }, []);
  return records;
}

function ArchivePage() {
  const records = useArchive();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="label-mono">Repository 01</p>
        <h1 className="mt-2 font-display text-4xl font-bold">National Vada Archive</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Specimens are stored in this browser only. Clearing site data destroys decades of
          imaginary research.
        </p>

        {records.length === 0 ? (
          <div className="lab-panel mt-8 p-10 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Archive empty — no specimens filed
            </p>
            <Button asChild className="mt-5">
              <Link to="/analyze">Analyse your first vada</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((r) => (
                <div key={r.id} className="lab-panel overflow-hidden">
                  <img
                    src={r.imageDataUrl}
                    alt={`Archived vada specimen ${r.id}`}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-xs tracking-[0.16em] text-primary">
                        {r.id}
                      </span>
                      <span className="font-mono text-2xl text-foreground">
                        {r.metrics.score.overall}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{r.name}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Ø {round(r.metrics.outerDiameter, 2)} {r.metrics.unit} · hole{" "}
                      {round(r.metrics.holeEfficiency, 1)}% ·{" "}
                      {r.metrics.calibrated ? "calibrated" : "uncalibrated"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/battle">Battle</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSpecimen(r.id)}
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-6" onClick={() => clearArchive()}>
              Purge entire archive
            </Button>
          </>
        )}
        <LabFooter />
      </main>
    </div>
  );
}
