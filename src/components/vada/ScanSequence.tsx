import { useEffect, useState } from "react";

const STEPS = [
  "Image received",
  "Specimen detected",
  "Shape segmentation initiated",
  "Outer boundary detected",
  "Inner cavity detected",
  "Geometric reconstruction initiated",
  "Symmetry analysis initiated",
  "Density estimation initiated",
];

export function ScanSequence({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(() => onDone?.(), 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 180);
    return () => clearTimeout(t);
  }, [step, onDone]);

  const pct = Math.round((step / STEPS.length) * 100);

  return (
    <div className="lab-panel scanline p-6 sm:p-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scanline bg-gradient-to-b from-transparent via-primary/15 to-transparent"
        aria-hidden
      />
      <p className="label-mono text-primary">Initializing vada analysis...</p>
      <ul className="mt-5 space-y-2 font-mono text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={
              i < step ? "text-success" : i === step ? "text-primary animate-blip" : "text-muted-foreground/40"
            }
          >
            {i < step ? "✓" : i === step ? "▸" : "·"} {s}
          </li>
        ))}
      </ul>
      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="label-mono mt-3">
        Status: <span className="text-primary">vada science in progress...</span>
      </p>
    </div>
  );
}
