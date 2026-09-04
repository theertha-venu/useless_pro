import type { SpecimenCV } from "./cv";

export interface Calibration {
  /** pixels per centimetre; null = uncalibrated (measurements are estimated units) */
  pxPerCm: number | null;
  mode: "none" | "reference" | "diameter";
  note?: string;
}

export interface VadaMetrics {
  calibrated: boolean;
  unit: "cm" | "px";
  outerDiameter: number;
  radius: number;
  circumference: number;
  outerArea: number;
  holeDiameter: number;
  holeArea: number;
  holeEfficiency: number; // %
  circularity: number; // 0-100
  symmetry: number; // 0-100
  symmetryH: number;
  symmetryV: number;
  irregularity: number; // 0-100 (higher = weirder)
  thicknessCm: number;
  volume: number | null; // cm3
  mass: number | null; // g
  density: number | null; // g/cm3
  confidence: number;
  score: {
    geometry: number;
    hole: number;
    symmetry: number;
    density: number | null;
    overall: number;
  };
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function computeMetrics(
  cv: SpecimenCV,
  calibration: Calibration,
  opts: { mass?: number | null; thicknessCm?: number } = {},
): VadaMetrics {
  const k = calibration.pxPerCm && calibration.pxPerCm > 0 ? 1 / calibration.pxPerCm : null;
  const conv = k ?? 1;
  const calibrated = k !== null;

  const outerDiameter = cv.outerDiameterPx * conv;
  const radius = outerDiameter / 2;
  const circumference = 2 * Math.PI * radius;
  const outerArea = cv.outerAreaPx * conv * conv;
  const holeDiameter = cv.holeDiameterPx * conv;
  const holeArea = cv.holeAreaPx * conv * conv;
  const holeEfficiency = cv.outerDiameterPx > 0 ? (cv.holeDiameterPx / cv.outerDiameterPx) * 100 : 0;

  const circularity = clamp(cv.circularity * 100);
  const symmetryH = clamp(cv.symmetryH * 100);
  const symmetryV = clamp(cv.symmetryV * 100);
  const symmetry = clamp((symmetryH + symmetryV) / 2);
  const irregularity = clamp(cv.radiusVariation * 220);

  const thicknessCm = opts.thicknessCm ?? 2;
  let volume: number | null = null;
  if (calibrated) {
    // ring/torus-ish solid: (outer area - hole area) * thickness, softened by doming
    volume = Math.max(0.1, (outerArea - holeArea) * thicknessCm * 0.82);
  }
  const mass = opts.mass ?? null;
  const density = volume && mass ? mass / volume : null;

  const geometry = clamp(circularity * 0.7 + (100 - irregularity) * 0.3);
  const holeScore = clamp(100 - Math.abs(holeEfficiency - 30) * 2.4);
  const densityScore =
    density !== null ? clamp(100 - Math.abs(density - 0.75) * 55) : null;

  const parts = [geometry, holeScore, symmetry];
  const weights = [0.4, 0.25, 0.25];
  let overall = parts.reduce((a, p, i) => a + p * weights[i]!, 0) / 0.9;
  if (densityScore !== null) overall = overall * 0.85 + densityScore * 0.15;

  return {
    calibrated,
    unit: calibrated ? "cm" : "px",
    outerDiameter,
    radius,
    circumference,
    outerArea,
    holeDiameter,
    holeArea,
    holeEfficiency,
    circularity,
    symmetry,
    symmetryH,
    symmetryV,
    irregularity,
    thicknessCm,
    volume,
    mass,
    density,
    confidence: cv.confidence,
    score: {
      geometry: round(geometry, 1),
      hole: round(holeScore, 1),
      symmetry: round(symmetry, 1),
      density: densityScore === null ? null : round(densityScore, 1),
      overall: round(clamp(overall), 1),
    },
  };
}

export function holeVerdict(m: VadaMetrics) {
  if (m.holeDiameter <= 0)
    return {
      label: "STRUCTURAL IDENTITY CRISIS",
      note: "Specimen may be questioning its vada classification.",
      tone: "danger" as const,
    };
  if (m.holeEfficiency < 18)
    return {
      label: "UNDER-HOLED",
      note: "The specimen appears reluctant to commit to the concept of a hole.",
      tone: "warn" as const,
    };
  if (m.holeEfficiency < 42)
    return {
      label: "ARCHITECTURALLY BALANCED",
      note: "Hole geometry within the accepted laboratory envelope.",
      tone: "ok" as const,
    };
  return {
    label: "AGGRESSIVE HOLE DESIGN",
    note: "The specimen has prioritised void over substance.",
    tone: "warn" as const,
  };
}

export function roundnessVerdict(c: number) {
  if (c >= 95) return "ENGINEERING MASTERPIECE";
  if (c >= 85) return "EXCELLENT GEOMETRY";
  if (c >= 70) return "ACCEPTABLE CIRCULARITY";
  if (c >= 50) return "SHAPE CRISIS";
  return "THE VADA HAS ABANDONED GEOMETRY";
}

export function symmetryVerdict(s: number) {
  if (s >= 90) return "Perfectionist.";
  if (s >= 75) return "Mostly has its life together.";
  if (s >= 50) return "Creative individual.";
  return "This vada rejects symmetry as a concept.";
}

export function densityVerdict(d: number | null) {
  if (d === null) return { label: "AWAITING MASS INPUT", note: "Enter mass to unlock density." };
  if (d < 0.55) return { label: "FLUFFY CITIZEN", note: "Structurally airborne." };
  if (d < 1.1) return { label: "STRUCTURALLY ACCEPTABLE", note: "Nothing to report." };
  return { label: "DAL NEUTRON STAR", note: "Handle with institutional caution." };
}

export function finalVerdict(score: number) {
  if (score >= 90) return "SCIENTIFICALLY EXCEPTIONAL VADA";
  if (score >= 80) return "ABOVE AVERAGE SPECIMEN";
  if (score >= 68) return "STRUCTURALLY ACCEPTABLE";
  if (score >= 55) return "QUESTIONABLE GEOMETRY";
  if (score >= 40) return "CRITICAL VADA IRREGULARITY";
  return "UNCLASSIFIED FRIED OBJECT";
}

export function personality(m: VadaMetrics) {
  const big = m.outerDiameter > 0;
  void big;
  if (m.holeDiameter <= 0)
    return {
      name: "THE IMPOSTOR",
      note: "The committee is reviewing its vada status.",
    };
  if (m.holeEfficiency >= 42)
    return { name: "THE OVERCONFIDENT", note: "Has more empty space than necessary." };
  if (m.irregularity > 45 || m.circularity < 62)
    return { name: "THE ARTIST", note: "Nobody understands its shape. Not even the vada." };
  if (m.symmetry >= 92)
    return { name: "THE PERFECTIONIST", note: "Probably judges other vadas." };
  if (m.density !== null && m.density >= 1.0)
    return {
      name: "THE INTROVERT",
      note: "Doesn't take up much space. Carries a lot of weight internally.",
    };
  if (m.density !== null && m.density < 0.55)
    return {
      name: "THE EXTROVERT",
      note: "Takes up the entire plate. Has surprisingly little substance.",
    };
  return { name: "THE DIPLOMAT", note: "Offends no geometry. Excites no one." };
}

export function dnaProfile(m: VadaMetrics) {
  const crispiness = clamp(60 + m.circularity * 0.25 + (100 - m.irregularity) * 0.15);
  return [
    { key: "SHAPE", value: round(m.circularity, 0) },
    { key: "HOLE", value: round(clamp(m.holeEfficiency * 2.4), 0) },
    { key: "DENSITY", value: m.score.density === null ? 50 : round(m.score.density, 0) },
    { key: "SYMMETRY", value: round(m.symmetry, 0) },
    { key: "CRISPINESS", value: round(crispiness, 0) },
  ];
}

export function geneticClass(m: VadaMetrics) {
  const a = m.symmetry >= 88 ? "PERFECTIONIST" : m.irregularity > 45 ? "CHAOTIC" : "STANDARD";
  const b =
    m.holeDiameter <= 0
      ? "NULL-HOLE VARIANT"
      : m.holeEfficiency >= 42
        ? "HIGH-HOLE VARIANT"
        : m.holeEfficiency < 18
          ? "MICRO-HOLE VARIANT"
          : "MID-HOLE VARIANT";
  return `${a} / ${b}`;
}

export function prediction(m: VadaMetrics) {
  const options = [
    "This vada is likely to become the most respected specimen on the plate.",
    "High probability of being selected first.",
    "May attract coconut chutney.",
    "Strong compatibility with sambar.",
    "Potentially dangerous when consumed while hot.",
    "Expected to be photographed before being eaten.",
  ];
  const seed = Math.round(m.outerDiameter * 100 + m.circularity * 7 + m.symmetry * 3);
  return options[seed % options.length]!;
}

export function medicalReport(m: VadaMetrics) {
  const grade = (v: number) =>
    v >= 90 ? "EXCELLENT" : v >= 75 ? "GOOD" : v >= 60 ? "STABLE" : v >= 45 ? "MONITOR" : "CRITICAL";
  return {
    rows: [
      { label: "STRUCTURAL INTEGRITY", value: grade(m.score.geometry) },
      { label: "CIRCULARITY", value: grade(m.circularity) },
      { label: "HOLE HEALTH", value: m.holeDiameter > 0 ? grade(m.score.hole) : "ABSENT" },
      {
        label: "DENSITY",
        value: m.density === null ? "NOT MEASURED" : m.density > 1 ? "ELEVATED" : "MODERATE",
      },
      { label: "SYMMETRY", value: grade(m.symmetry) },
    ],
    diagnosis:
      m.score.overall >= 80
        ? "HEALTHY AND CRISPY"
        : m.score.overall >= 60
          ? "MILD GEOMETRIC FATIGUE"
          : "ACUTE SHAPE DISORDER",
    recommendation:
      m.score.overall >= 80
        ? "Consume immediately."
        : m.score.overall >= 60
          ? "Consume with chutney to compensate."
          : "Consume before anyone measures it again.",
  };
}

/** Deterministic, measurement-driven answers from the specimen itself. */
export function askTheVada(question: string, m: VadaMetrics, id: string) {
  const q = question.toLowerCase();
  const c = round(m.circularity, 0);
  const s = round(m.symmetry, 0);
  const he = round(m.holeEfficiency, 0);
  if (/hole/.test(q)) {
    if (m.holeDiameter <= 0) return "I do not discuss the hole. There is no hole. Move on.";
    if (he < 18) return "I prefer privacy.";
    if (he >= 42) return `My hole efficiency is ${he}%. I call it open-plan living.`;
    return `${he}% hole efficiency. Architecturally balanced, unlike your question.`;
  }
  if (/good|best|great|nice/.test(q))
    return `My circularity is ${c}%. Perhaps you should ask yourself whether YOU are good enough for me.`;
  if (/round|circle|shape/.test(q))
    return `Roundness index ${c}. Geometry is not an opinion, it is a measurement.`;
  if (/symmetr/.test(q)) return `Symmetry ${s}%. ${symmetryVerdict(m.symmetry)}`;
  if (/eat|taste|hungry|consume/.test(q))
    return "Consumption is a one-way procedure. Consider the ethics, then proceed.";
  if (/name|who|what are you/.test(q))
    return `I am ${id}. Specimen. Fritter. Subject of unnecessary science.`;
  if (/dens|weigh|mass|heavy/.test(q))
    return m.density === null
      ? "You never weighed me. And yet you have opinions."
      : `Density ${round(m.density, 2)} g/cm³. Substantial, in every sense.`;
  if (/love|feel|happy|sad/.test(q))
    return "I was submerged in boiling oil. My feelings are documented in the report.";
  return `Overall score ${m.score.overall}. That is the answer to most questions.`;
}
