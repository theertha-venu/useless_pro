import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "The V.A.D.A. Manifesto | VADA-METRICS" },
      {
        name: "description",
        content:
          "Why we built an unnecessarily advanced metrology platform for urad-dal fritters, and what it definitively fails to achieve.",
      },
      { property: "og:title", content: "The V.A.D.A. Manifesto" },
      {
        property: "og:description",
        content: "A serious document about a deeply unserious instrument.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManifestoPage,
});

const NUMBERS = [
  { v: "18", k: "Measurement channels" },
  { v: "0", k: "Images sent to a server" },
  { v: "0", k: "Problems solved" },
  { v: "∞", k: "Confidence in our findings" },
];

function ManifestoPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="label-mono">Opening statement</p>
        <h1 className="mt-2 font-display text-4xl font-bold">The V.A.D.A. Manifesto</h1>

        <div className="lab-panel mt-8 space-y-5 p-7 text-sm leading-relaxed text-muted-foreground">
          <p className="text-lg text-foreground">
            Humanity has measured the curvature of spacetime, the mass of the Higgs boson, and the
            distance to Andromeda. Nobody, until now, measured the hole.
          </p>
          <p>
            VADA-METRICS is an unnecessarily advanced computer-vision-based metrology platform for
            the quantitative characterization of urad-dal fritters. It performs real segmentation,
            real contour extraction, and real geometry — on a snack.
          </p>
          <p>
            We refuse to lie about units. An uncalibrated photograph yields pixels, and pixels are
            what we report. Centimetres are earned, not assumed. Estimated volume and density are
            labelled as estimates, forever, loudly.
          </p>
          <p>
            Every pixel is processed inside your browser. Your vada never leaves your device,
            because your vada is nobody else's business.
          </p>
          <p className="text-foreground">
            We do not claim this platform improves vadas. We claim only that it describes them with
            an intensity they never requested.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {NUMBERS.map((n) => (
            <div key={n.k} className="lab-panel p-5 text-center">
              <p className="font-mono text-3xl text-primary">{n.v}</p>
              <p className="label-mono mt-1">{n.k}</p>
            </div>
          ))}
        </div>

        <div className="lab-panel mt-6 p-7 text-center">
          <p className="label-mono">Closing remark</p>
          <p className="mt-3 font-display text-2xl font-semibold text-foreground">
            After all this science, the correct way to evaluate a vada remains unchanged: eat it
            while it is hot.
          </p>
          <Button asChild className="mt-6">
            <Link to="/analyze">Proceed to analysis anyway</Link>
          </Button>
        </div>
        <LabFooter />
      </main>
    </div>
  );
}
