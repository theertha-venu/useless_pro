import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Button } from "@/components/ui/button";
import { loadArchive } from "@/lib/vada/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VADA-METRICS — Visual Analysis & Dimensional Assessment" },
      {
        name: "description",
        content:
          "An unnecessarily advanced computer-vision-based metrology platform for the quantitative characterization of urad-dal fritters.",
      },
      { property: "og:title", content: "VADA-METRICS — Project V.A.D.A." },
      {
        property: "og:description",
        content:
          "Upload a vada. Receive segmentation, hole efficiency, Roundness Index™ and a Quality Score™ nobody asked for.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STATS = [
  { k: "Specimens archived", v: "47+" },
  { k: "Measurement channels", v: "18" },
  { k: "Problems solved", v: "0" },
  { k: "Images uploaded to servers", v: "0" },
];

function Landing() {
  const [count, setCount] = useState(0);
  useEffect(() => setCount(loadArchive().length), []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4">
        <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 px-6 py-20 text-center mt-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/10 blur-3xl" />
          <p className="label-mono">Project V.A.D.A. · Est. Yesterday</p>
          <h1 className="mt-5 font-display text-5xl font-bold tracking-tight sm:text-7xl">
            <span className="text-gradient-gold">VADA-METRICS</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-mono text-sm uppercase tracking-[0.22em] text-primary/80">
            Visual Analysis &amp; Dimensional Assessment
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground">
            An unnecessarily advanced computer-vision-based metrology platform for the quantitative
            characterization of urad-dal fritters. It solves absolutely no problem.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/analyze">Begin specimen analysis</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/manifesto">Read the manifesto</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-success">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-blip" />
            All laboratory systems operational
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.k} className="lab-panel p-5">
              <p className="label-mono">{s.k}</p>
              <p className="mt-2 font-mono text-3xl text-primary">{s.v}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            {
              t: "Real computer vision",
              d: "Otsu thresholding, morphological cleanup, connected components, Moore contour tracing and enclosed-cavity detection — executed in your browser, on your pixels.",
            },
            {
              t: "Honest units",
              d: "Uncalibrated images are reported in pixels. Centimetres appear only after you calibrate with a reference line or a known diameter.",
            },
            {
              t: "Ridiculous science",
              d: "Hole efficiency, Roundness Index™, symmetry tensors, Vada DNA™, a medical report, and a certificate suitable for framing.",
            },
          ].map((f) => (
            <div key={f.t} className="lab-panel p-6">
              <h2 className="font-display text-lg font-semibold">{f.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 lab-panel flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="label-mono">Local archive</p>
            <p className="mt-1 font-mono text-2xl text-primary">
              {count} specimen{count === 1 ? "" : "s"} on file
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/archive">Open the archive</Link>
          </Button>
        </section>
        <LabFooter />
      </main>
    </div>
  );
}
