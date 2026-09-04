import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Nav, LabFooter } from "@/components/vada/Nav";
import { Overlay } from "@/components/vada/Overlay";
import { ScanSequence } from "@/components/vada/ScanSequence";
import { CertificateButton } from "@/components/vada/Certificate";
import {
  Bar,
  DnaPanel,
  MeasurementGrid,
  MedicalPanel,
  Panel,
  PersonalityPanel,
  QualityScore,
  Stat,
  VerdictPanel,
} from "@/components/vada/Panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analyzeImage, type CVResult, type SpecimenCV } from "@/lib/vada/cv";
import { computeMetrics, askTheVada, round, type Calibration } from "@/lib/vada/science";
import { saveSpecimen, loadArchive, nextSpecimenId } from "@/lib/vada/store";
import { DEMO_SPECS, renderDemoImage } from "@/lib/vada/demo";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Specimen Analysis | VADA-METRICS" },
      {
        name: "description",
        content:
          "Upload a vada image and run local computer-vision segmentation: diameter, hole efficiency, circularity, symmetry and density estimation.",
      },
      { property: "og:title", content: "Specimen Analysis | VADA-METRICS" },
      {
        property: "og:description",
        content: "Unnecessarily advanced vada metrology, executed entirely inside your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyzePage,
});

type Phase = "idle" | "scanning" | "done" | "rejected";

const REJECTIONS = [
  "Please provide a more vada-like object.",
  "This appears to be food, but our scientists are unconvinced.",
  "Object classification failed. The committee is confused.",
];

function scaleContour(pts: { x: number; y: number }[], c: { x: number; y: number }, s: number) {
  return pts.map((p) => ({ x: c.x + (p.x - c.x) * s, y: c.y + (p.y - c.y) * s }));
}

function adjustCv(cv: SpecimenCV, outerScale: number, holeScale: number): SpecimenCV {
  const hc = cv.holeCentroid ?? cv.centroid;
  return {
    ...cv,
    outerDiameterPx: cv.outerDiameterPx * outerScale,
    outerAreaPx: cv.outerAreaPx * outerScale * outerScale,
    perimeterPx: cv.perimeterPx * outerScale,
    holeDiameterPx: cv.holeDiameterPx * holeScale,
    holeAreaPx: cv.holeAreaPx * holeScale * holeScale,
    outerContour: scaleContour(cv.outerContour, cv.centroid, outerScale),
    holeContour: scaleContour(cv.holeContour, hc, holeScale),
  };
}

function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cvResult, setCvResult] = useState<CVResult | null>(null);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [outerScale, setOuterScale] = useState(1);
  const [holeScale, setHoleScale] = useState(1);
  const [thickness, setThickness] = useState(2);
  const [mass, setMass] = useState("");
  const [calibMode, setCalibMode] = useState<"none" | "reference" | "diameter">("none");
  const [refLength, setRefLength] = useState("10");
  const [knownDiameter, setKnownDiameter] = useState("7.5");
  const [refLine, setRefLine] = useState<{ a: [number, number]; b: [number, number] } | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [specimenName, setSpecimenName] = useState("");
  const imgBoxRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async (src: string) => {
    setPhase("scanning");
    setSavedId(null);
    setAnswer(null);
    setRefLine(null);
    setOuterScale(1);
    setHoleScale(1);
    try {
      const result = await analyzeImage(src);
      setCvResult(result);
      setActive(0);
      const best = result.specimens[0];
      window.setTimeout(() => {
        if (!best || best.confidence < 45) setPhase("rejected");
        else {
          setPhase("done");
          if (result.specimens.length > 1)
            toast("Multiple specimens detected. The laboratory is becoming unnecessarily excited.");
        }
      }, 1650);
    } catch {
      setPhase("rejected");
    }
  }, []);

  const onFile = useCallback(
    (file: File) => {
      if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
        toast.error("Unsupported specimen format. PNG, JPG, JPEG or WebP only.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => run(String(reader.result));
      reader.readAsDataURL(file);
    },
    [run],
  );

  const loadDemo = useCallback(
    (i: number) => {
      const spec = DEMO_SPECS[i]!;
      setMass(String(spec.mass));
      setThickness(spec.thickness);
      setCalibMode("diameter");
      setKnownDiameter("7.5");
      setSpecimenName(spec.label);
      run(renderDemoImage(spec));
    },
    [run],
  );

  const activeCv = cvResult?.specimens[active] ?? null;
  const adjusted = useMemo(
    () => (activeCv ? adjustCv(activeCv, outerScale, holeScale) : null),
    [activeCv, outerScale, holeScale],
  );

  const calibration: Calibration = useMemo(() => {
    if (calibMode === "reference" && refLine) {
      const len = Math.hypot(refLine.b[0] - refLine.a[0], refLine.b[1] - refLine.a[1]);
      const cm = parseFloat(refLength);
      if (len > 4 && cm > 0)
        return { pxPerCm: len / cm, mode: "reference", note: `${round(len, 0)} px = ${cm} cm` };
    }
    if (calibMode === "diameter" && adjusted) {
      const cm = parseFloat(knownDiameter);
      if (cm > 0)
        return {
          pxPerCm: adjusted.outerDiameterPx / cm,
          mode: "diameter",
          note: `Operator-declared diameter ${cm} cm`,
        };
    }
    return { pxPerCm: null, mode: "none" };
  }, [calibMode, refLine, refLength, knownDiameter, adjusted]);

  const metrics = useMemo(
    () =>
      adjusted
        ? computeMetrics(adjusted, calibration, {
            mass: mass ? parseFloat(mass) : null,
            thicknessCm: thickness,
          })
        : null,
    [adjusted, calibration, mass, thickness],
  );

  const specimenId = savedId ?? nextSpecimenId(loadArchive());

  const allOverlays = useMemo(() => {
    if (!cvResult || !metrics || !adjusted) return [];
    return cvResult.specimens.map((cv, i) => ({
      cv: i === active ? adjusted : cv,
      metrics:
        i === active
          ? metrics
          : computeMetrics(cv, calibration, { thicknessCm: thickness, mass: null }),
      label: `SPEC-${String(i + 1).padStart(2, "0")}`,
    }));
  }, [cvResult, metrics, adjusted, active, calibration, thickness]);

  const onCanvasClick = (e: React.MouseEvent) => {
    if (calibMode !== "reference" || !imgBoxRef.current) return;
    const rect = imgBoxRef.current.getBoundingClientRect();
    const p: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
    setRefLine((prev) => (!prev || prev.b ? { a: p, b: p } : prev));
    if (!refLine) setRefLine({ a: p, b: p });
    else setRefLine({ a: refLine.a, b: p });
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl tracking-[0.16em] text-primary">SPECIMEN ANALYSIS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Local computer-vision segmentation. Your vada images remain inside the laboratory.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_SPECS.map((d, i) => (
              <Button
                key={d.key}
                size="sm"
                variant="secondary"
                title={`Reference specimen — expected verdict: ${d.expectation}`}
                onClick={() => loadDemo(i)}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>

        {phase === "idle" ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
            className={`lab-panel flex min-h-[340px] flex-col items-center justify-center border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="font-mono text-xl tracking-[0.2em] text-primary">
              DROP YOUR SPECIMEN HERE
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Recommended: top-down image with the entire vada visible.
            </p>
            <label className="mt-6">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
              <span className="inline-flex cursor-pointer items-center rounded-md bg-primary px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-primary-foreground transition-opacity hover:opacity-90">
                Upload vada image
              </span>
            </label>
            <p className="label-mono mt-4">PNG · JPG · JPEG · WEBP</p>
          </div>
        ) : null}

        {phase === "scanning" ? <ScanSequence /> : null}

        {phase === "rejected" ? (
          <div className="lab-panel border-destructive/50 p-10 text-center">
            <p className="font-mono text-2xl text-destructive">SPECIMEN REJECTED</p>
            <p className="mt-3 text-muted-foreground">
              The laboratory has detected insufficient vada characteristics.
            </p>
            <p className="mt-2 font-mono text-sm">“{REJECTIONS[Math.floor(Math.random() * 3)]}”</p>
            <Button className="mt-6" onClick={() => setPhase("idle")}>
              Submit another specimen
            </Button>
          </div>
        ) : null}

        {phase === "done" && cvResult && adjusted && metrics ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="space-y-6">
              <Panel
                title="Auto detection"
                right={
                  <span className="font-mono text-xs text-success">
                    Vada confidence: {adjusted.confidence}%
                  </span>
                }
              >
                <div
                  ref={imgBoxRef}
                  onClick={onCanvasClick}
                  className="relative mx-auto w-fit overflow-hidden rounded-md border border-border"
                  style={{ cursor: calibMode === "reference" ? "crosshair" : "default" }}
                >
                  <Overlay
                    imageDataUrl={cvResult.imageDataUrl}
                    width={cvResult.width}
                    height={cvResult.height}
                    specimens={allOverlays}
                    activeIndex={active}
                  />
                  {refLine ? (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      <line
                        x1={refLine.a[0]}
                        y1={refLine.a[1]}
                        x2={refLine.b[0]}
                        y2={refLine.b[1]}
                        stroke="var(--success)"
                        strokeWidth={2}
                      />
                    </svg>
                  ) : null}
                </div>
                {adjusted.confidence < 70 ? (
                  <p className="mt-3 font-mono text-xs text-warning">
                    “The specimen is behaving suspiciously.”
                  </p>
                ) : null}
                {cvResult.specimens.length > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cvResult.specimens.map((_, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant={i === active ? "default" : "secondary"}
                        onClick={() => setActive(i)}
                      >
                        SPEC-{String(i + 1).padStart(2, "0")}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <Button className="mt-4 w-full" variant="outline" onClick={() => setPhase("idle")}>
                  New specimen
                </Button>
              </Panel>

              <Panel title="Scale calibration">
                <div className="flex gap-2">
                  {(["none", "reference", "diameter"] as const).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={calibMode === mode ? "default" : "secondary"}
                      onClick={() => setCalibMode(mode)}
                    >
                      {mode === "none" ? "Uncalibrated" : mode === "reference" ? "Reference" : "Known ⌀"}
                    </Button>
                  ))}
                </div>
                {calibMode === "reference" ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Click twice on the image to draw a line across a reference object, then enter
                      its real length.
                    </p>
                    <Label className="label-mono">Reference length (cm)</Label>
                    <Input
                      value={refLength}
                      onChange={(e) => setRefLength(e.target.value)}
                      inputMode="decimal"
                    />
                    <Button size="sm" variant="secondary" onClick={() => setRefLine(null)}>
                      Reset line
                    </Button>
                  </div>
                ) : null}
                {calibMode === "diameter" ? (
                  <div className="mt-4 space-y-3">
                    <Label className="label-mono">Known vada diameter (cm)</Label>
                    <Input
                      value={knownDiameter}
                      onChange={(e) => setKnownDiameter(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                ) : null}
                <p
                  className={`mt-4 font-mono text-xs ${metrics.calibrated ? "text-success" : "text-warning"}`}
                >
                  {metrics.calibrated
                    ? `CALIBRATED · ${round(calibration.pxPerCm!, 2)} px/cm · ${calibration.note}`
                    : "UNCALIBRATED · all lengths reported in pixels and labelled ESTIMATED"}
                </p>
              </Panel>

              <Panel title="Manual correction">
                <div className="space-y-5">
                  <div>
                    <Label className="label-mono">Outer contour scale — {outerScale.toFixed(2)}×</Label>
                    <Slider
                      value={[outerScale]}
                      min={0.7}
                      max={1.3}
                      step={0.01}
                      onValueChange={(v) => setOuterScale(v[0]!)}
                      className="mt-3"
                    />
                  </div>
                  <div>
                    <Label className="label-mono">Inner hole scale — {holeScale.toFixed(2)}×</Label>
                    <Slider
                      value={[holeScale]}
                      min={0}
                      max={1.6}
                      step={0.01}
                      onValueChange={(v) => setHoleScale(v[0]!)}
                      className="mt-3"
                    />
                  </div>
                  <div>
                    <Label className="label-mono">Estimated thickness — {thickness.toFixed(1)} cm</Label>
                    <Slider
                      value={[thickness]}
                      min={0.5}
                      max={5}
                      step={0.1}
                      onValueChange={(v) => setThickness(v[0]!)}
                      className="mt-3"
                    />
                  </div>
                  <div>
                    <Label className="label-mono">Mass (grams, optional)</Label>
                    <Input
                      className="mt-2"
                      placeholder="48.2"
                      value={mass}
                      inputMode="decimal"
                      onChange={(e) => setMass(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="label-mono">Specimen name (optional)</Label>
                    <Input
                      className="mt-2"
                      placeholder="Canteen Vada"
                      value={specimenName}
                      onChange={(e) => setSpecimenName(e.target.value)}
                    />
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel
                title={`Dashboard · ${specimenId}`}
                right={
                  <span className="label-mono">
                    {metrics.calibrated ? "CALIBRATED" : "ESTIMATED UNITS"}
                  </span>
                }
              >
                <MeasurementGrid m={metrics} />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Stat label="Measured mass" value={metrics.mass ? `${metrics.mass} g` : "—"} />
                  <Stat
                    label="Detection confidence"
                    value={`${Math.round(adjusted.confidence)} %`}
                    tone="cyan"
                  />
                  <Stat
                    label="Units"
                    value={metrics.calibrated ? "centimetres" : "pixels"}
                    tone="warn"
                    sub={
                      metrics.calibrated
                        ? "Calibrated against operator reference."
                        : "Calibrate to obtain real-world units."
                    }
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const rec = saveSpecimen({
                        name: specimenName || specimenId,
                        imageDataUrl: cvResult.imageDataUrl,
                        imageWidth: cvResult.width,
                        imageHeight: cvResult.height,
                        cv: adjusted,
                        metrics,
                        calibration,
                        ...(savedId ? { id: savedId } : {}),
                      });
                      setSavedId(rec.id);
                      toast.success(`${rec.id} filed in the National Vada Archive`);
                    }}
                  >
                    {savedId ? "Update archive entry" : "Save to archive"}
                  </Button>
                  <CertificateButton
                    id={specimenId}
                    metrics={metrics}
                    name={specimenName || specimenId}
                  />
                  <Button variant="outline" asChild>
                    <Link to="/battle">Battle another vada</Link>
                  </Button>
                </div>
              </Panel>

              <Tabs defaultValue="science">
                <TabsList className="font-mono text-xs">
                  <TabsTrigger value="science">Science</TabsTrigger>
                  <TabsTrigger value="quality">Quality score</TabsTrigger>
                  <TabsTrigger value="medical">Diagnostic centre</TabsTrigger>
                  <TabsTrigger value="dna">Vada DNA™</TabsTrigger>
                  <TabsTrigger value="ask">Ask the vada</TabsTrigger>
                </TabsList>

                <TabsContent value="science" className="mt-4 grid gap-6 lg:grid-cols-2">
                  <Panel title="Interpretation">
                    <VerdictPanel m={metrics} />
                  </Panel>
                  <Panel title="Personality engine">
                    <PersonalityPanel m={metrics} />
                    <div className="mt-6 space-y-3">
                      <Bar label="Horizontal" value={metrics.symmetryH} />
                      <Bar label="Vertical" value={metrics.symmetryV} />
                      <Bar
                        label="Irregularity"
                        value={metrics.irregularity}
                        tone="var(--destructive)"
                      />
                    </div>
                  </Panel>
                </TabsContent>

                <TabsContent value="quality" className="mt-4">
                  <Panel title="Vada Quality Score™">
                    <QualityScore m={metrics} />
                  </Panel>
                </TabsContent>

                <TabsContent value="medical" className="mt-4">
                  <Panel title="Vada Diagnostic Centre">
                    <MedicalPanel m={metrics} id={specimenId} />
                  </Panel>
                </TabsContent>

                <TabsContent value="dna" className="mt-4">
                  <Panel title="VADA DNA™">
                    <DnaPanel m={metrics} />
                  </Panel>
                </TabsContent>

                <TabsContent value="ask" className="mt-4">
                  <Panel title="Ask the vada">
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setAnswer(askTheVada(question, metrics, specimenId));
                      }}
                    >
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Are you a good vada?"
                      />
                      <Button type="submit">Interrogate</Button>
                    </form>
                    {answer ? (
                      <div className="mt-5 rounded-md border border-primary/30 bg-primary/5 p-4">
                        <p className="label-mono text-primary">{specimenId} responds</p>
                        <p className="mt-2 font-mono text-sm">“{answer}”</p>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Responses are derived from this specimen's own measurements. It has
                        opinions.
                      </p>
                    )}
                  </Panel>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : null}
      </main>
      <LabFooter />
    </div>
  );
}
