import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  densityVerdict,
  dnaProfile,
  finalVerdict,
  geneticClass,
  holeVerdict,
  medicalReport,
  personality,
  prediction,
  round,
  roundnessVerdict,
  symmetryVerdict,
  type VadaMetrics,
} from "@/lib/vada/science";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  children,
  className,
  right,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={cn("lab-panel p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
        <h2 className="label-mono text-primary">{title}</h2>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "cyan" | "warn";
}) {
  return (
    <div className="rounded-md border border-border/70 bg-secondary/40 p-3">
      <p className="label-mono">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg tabular-nums",
          tone === "cyan" && "text-cyan",
          tone === "warn" && "text-warning",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="label-mono mt-0.5 tracking-normal normal-case">{sub}</p> : null}
    </div>
  );
}

export function Bar({ value, label, tone }: { value: number; label?: string; tone?: string }) {
  return (
    <div className="flex items-center gap-3">
      {label ? <span className="label-mono w-24 shrink-0">{label}</span> : null}
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            background: tone ?? "var(--gradient-gold)",
          }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {Math.round(value)}%
      </span>
    </div>
  );
}

export function MeasurementGrid({ m }: { m: VadaMetrics }) {
  const u = m.unit;
  const f = (v: number, d = 2) => `${round(v, d)} ${u}`;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat label="Outer diameter" value={f(m.outerDiameter)} />
      <Stat label="Radius" value={f(m.radius)} />
      <Stat label="Circumference" value={f(m.circumference)} />
      <Stat label="Outer area" value={`${round(m.outerArea, 2)} ${u}²`} />
      <Stat label="Hole diameter" value={m.holeDiameter > 0 ? f(m.holeDiameter) : "—"} tone="cyan" />
      <Stat
        label="Hole area"
        value={m.holeArea > 0 ? `${round(m.holeArea, 2)} ${u}²` : "—"}
        tone="cyan"
      />
      <Stat label="Hole efficiency" value={`${round(m.holeEfficiency, 1)} %`} />
      <Stat label="Circularity" value={`${round(m.circularity, 1)} %`} />
      <Stat label="Symmetry" value={`${round(m.symmetry, 1)} %`} />
      <Stat label="Irregularity" value={`${round(m.irregularity, 1)} %`} />
      <Stat
        label="Volume (est.)"
        value={m.volume ? `${round(m.volume, 1)} cm³` : "requires calibration"}
      />
      <Stat
        label="Density (est.)"
        value={m.density ? `${round(m.density, 2)} g/cm³` : "requires mass"}
      />
    </div>
  );
}

export function VerdictPanel({ m }: { m: VadaMetrics }) {
  const hv = holeVerdict(m);
  const dv = densityVerdict(m.density);
  return (
    <div className="space-y-4">
      <div>
        <p className="label-mono">Vada Roundness Index™</p>
        <p className="mt-1 font-mono text-xl text-primary">{roundnessVerdict(m.circularity)}</p>
        <Bar value={m.circularity} />
      </div>
      <div>
        <p className="label-mono">Hole efficiency</p>
        <p
          className={cn(
            "mt-1 font-mono text-xl",
            hv.tone === "danger" ? "text-destructive" : hv.tone === "warn" ? "text-warning" : "text-success",
          )}
        >
          {hv.label}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{hv.note}</p>
      </div>
      <div>
        <p className="label-mono">Symmetry assessment</p>
        <p className="mt-1 font-mono text-xl text-cyan">{round(m.symmetry, 0)}%</p>
        <p className="text-sm text-muted-foreground">“{symmetryVerdict(m.symmetry)}”</p>
      </div>
      <div>
        <p className="label-mono">Density classification</p>
        <p className="mt-1 font-mono text-xl">{dv.label}</p>
        <p className="text-sm text-muted-foreground">{dv.note}</p>
        {m.density !== null ? (
          <p className="label-mono mt-2 tracking-normal normal-case">
            Estimated only — thickness supplied manually ({m.thicknessCm} cm).
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function QualityScore({ m }: { m: VadaMetrics }) {
  const rows = [
    { k: "Geometry", v: m.score.geometry },
    { k: "Hole design", v: m.score.hole },
    { k: "Symmetry", v: m.score.symmetry },
    { k: "Density", v: m.score.density ?? 0 },
  ];
  const radar = [
    { k: "GEO", v: m.score.geometry },
    { k: "HOLE", v: m.score.hole },
    { k: "SYM", v: m.score.symmetry },
    { k: "DENS", v: m.score.density ?? 50 },
    { k: "ROUND", v: m.circularity },
  ];
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between font-mono text-sm">
            <span className="text-muted-foreground">{r.k}</span>
            <span className="tabular-nums">
              {r.k === "Density" && m.score.density === null ? "n/a" : Math.round(r.v)}
            </span>
          </div>
        ))}
        <div className="mt-4 border-t border-border pt-4">
          <p className="label-mono">Overall</p>
          <p className="font-mono text-5xl text-gradient-gold">{m.score.overall}</p>
          <p className="label-mono">/ 100</p>
          <p className="mt-3 font-mono text-base text-primary">{finalVerdict(m.score.overall)}</p>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radar} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="k"
              tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
            />
            <Radar
              dataKey="v"
              stroke="var(--gold)"
              fill="var(--gold)"
              fillOpacity={0.28}
              isAnimationActive
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PersonalityPanel({ m }: { m: VadaMetrics }) {
  const p = personality(m);
  return (
    <div>
      <p className="font-mono text-2xl text-primary">{p.name}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">“{p.note}”</p>
      <div className="mt-4 rounded-md border border-cyan/30 bg-cyan/5 p-3">
        <p className="label-mono text-cyan">Vada future</p>
        <p className="mt-1 text-sm">{prediction(m)}</p>
      </div>
    </div>
  );
}

export function DnaPanel({ m }: { m: VadaMetrics }) {
  const dna = dnaProfile(m);
  return (
    <div className="space-y-3">
      {dna.map((d) => (
        <div key={d.key} className="font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="w-24 text-muted-foreground">{d.key}</span>
            <span className="tracking-[0.15em] text-primary">
              {"█".repeat(Math.round(d.value / 10))}
              <span className="text-muted-foreground/40">
                {"░".repeat(10 - Math.round(d.value / 10))}
              </span>
            </span>
            <span className="tabular-nums">{d.value}%</span>
          </div>
        </div>
      ))}
      <p className="label-mono mt-4">Genetic classification</p>
      <p className="font-mono text-sm text-primary">{geneticClass(m)}</p>
      <p className="label-mono tracking-normal normal-case">
        VADA DNA™ is a visual fingerprint derived from geometry. It is not biological DNA.
      </p>
    </div>
  );
}

export function MedicalPanel({ m, id }: { m: VadaMetrics; id: string }) {
  const r = medicalReport(m);
  return (
    <div className="font-mono text-sm">
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <span>PATIENT: {id}</span>
        <span>AGE: 6 MINUTES</span>
        <span>STATUS: FRIED</span>
      </div>
      <div className="mt-4 space-y-1.5">
        {r.rows.map((row) => (
          <div key={row.label} className="flex justify-between border-b border-border/50 py-1.5">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="label-mono mt-5">Final diagnosis</p>
      <p className="text-lg text-success">{r.diagnosis}</p>
      <p className="label-mono mt-4">Doctor's recommendation</p>
      <p>“{r.recommendation}”</p>
      <div className="mt-5 inline-block -rotate-6 rounded border-2 border-success/70 px-4 py-2 text-success">
        APPROVED FOR CONSUMPTION
      </div>
    </div>
  );
}
