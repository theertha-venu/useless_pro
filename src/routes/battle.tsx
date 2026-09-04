import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Button } from "@/components/ui/button";
import { loadArchive, type SpecimenRecord } from "@/lib/vada/store";
import { round, finalVerdict, type VadaMetrics } from "@/lib/vada/science";

export const Route = createFileRoute("/battle")({
  head: () => ({
    meta: [
      { title: "Forensic Vada Battle | VADA-METRICS" },
      {
        name: "description",
        content:
          "Place two archived specimens side by side for a channel-by-channel forensic comparison and an official verdict.",
      },
      { property: "og:title", content: "Forensic Vada Battle | VADA-METRICS" },
      {
        property: "og:description",
        content: "Two fritters enter the comparison chamber. One leaves statistically superior.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BattlePage,
});

const CHANNELS = [
  { label: "Quality Score™", get: (m: VadaMetrics) => m.score.overall, unit: "" },
  { label: "Roundness Index™", get: (m: VadaMetrics) => m.circularity, unit: "" },
  { label: "Hole efficiency", get: (m: VadaMetrics) => m.holeEfficiency, unit: "%" },
  { label: "Symmetry", get: (m: VadaMetrics) => m.symmetry, unit: "" },
  { label: "Regularity", get: (m: VadaMetrics) => 100 - m.irregularity, unit: "" },
  { label: "Diameter", get: (m: VadaMetrics) => m.outerDiameter, unit: "" },
] as const;

function BattlePage() {
  const [records, setRecords] = useState<SpecimenRecord[]>([]);
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  useEffect(() => {
    const sync = () => {
      const r = loadArchive();
      setRecords(r);
      setAId((p) => p || (r[0]?.id ?? ""));
      setBId((p) => p || (r[1]?.id ?? r[0]?.id ?? ""));
    };
    sync();
    window.addEventListener("vada-archive-updated", sync);
    return () => window.removeEventListener("vada-archive-updated", sync);
  }, []);

  const a = records.find((r) => r.id === aId) ?? null;
  const b = records.find((r) => r.id === bId) ?? null;

  const result = useMemo(() => {
    if (!a || !b) return null;
    let aWins = 0;
    let bWins = 0;
    for (const c of CHANNELS) {
      const av = c.get(a.metrics);
      const bv = c.get(b.metrics);
      if (round(av, 2) > round(bv, 2)) aWins++;
      else if (round(bv, 2) > round(av, 2)) bWins++;
    }
    return { aWins, bWins };
  }, [a, b]);

  if (records.length < 1) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="font-display text-4xl font-bold">Forensic Vada Battle</h1>
          <div className="lab-panel mt-8 p-10 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
              The comparison chamber is empty
            </p>
            <Button asChild className="mt-5">
              <Link to="/analyze">Archive some specimens first</Link>
            </Button>
          </div>
          <LabFooter />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="label-mono">Comparative forensics</p>
        <h1 className="mt-2 font-display text-4xl font-bold">Forensic Vada Battle</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { rec: a, id: aId, set: setAId, side: "Specimen A" },
            { rec: b, id: bId, set: setBId, side: "Specimen B" },
          ].map((slot) => (
            <div key={slot.side} className="lab-panel p-5">
              <p className="label-mono">{slot.side}</p>
              <select
                value={slot.id}
                onChange={(e) => slot.set(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground"
                aria-label={`Select ${slot.side}`}
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} — {r.name}
                  </option>
                ))}
              </select>
              {slot.rec ? (
                <>
                  <img
                    src={slot.rec.imageDataUrl}
                    alt={`Specimen ${slot.rec.id}`}
                    className="mt-4 h-56 w-full rounded-md object-cover"
                  />
                  <p className="mt-3 font-mono text-3xl text-primary">
                    {slot.rec.metrics.score.overall}
                    <span className="text-sm text-muted-foreground"> / 100</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {finalVerdict(slot.rec.metrics.score.overall)}
                  </p>
                </>
              ) : null}
            </div>
          ))}
        </div>

        {a && b && result ? (
          <div className="lab-panel mt-6 p-6">
            <h2 className="font-display text-lg font-semibold">Channel-by-channel forensics</h2>
            <div className="mt-4 space-y-2">
              {CHANNELS.map((c) => {
                const av = c.get(a.metrics);
                const bv = c.get(b.metrics);
                const aBetter = round(av, 2) > round(bv, 2);
                const bBetter = round(bv, 2) > round(av, 2);
                return (
                  <div
                    key={c.label}
                    className="grid grid-cols-3 items-center gap-2 rounded-md border border-border/60 px-3 py-2 font-mono text-sm"
                  >
                    <span className={aBetter ? "text-success" : "text-muted-foreground"}>
                      {round(av, 1)}
                      {c.unit}
                    </span>
                    <span className="text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {c.label}
                    </span>
                    <span
                      className={`text-right ${bBetter ? "text-success" : "text-muted-foreground"}`}
                    >
                      {round(bv, 1)}
                      {c.unit}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-md border border-primary/40 bg-primary/10 p-5 text-center">
              <p className="label-mono">Official ruling</p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {result.aWins === result.bWins
                  ? "Statistical deadlock. The committee demands a rematch."
                  : `${(result.aWins > result.bWins ? a : b).name} wins ${Math.max(result.aWins, result.bWins)}–${Math.min(result.aWins, result.bWins)}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ruling is non-binding and has no nutritional consequences.
              </p>
            </div>
          </div>
        ) : null}
        <LabFooter />
      </main>
    </div>
  );
}
