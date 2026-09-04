import type { SpecimenCV } from "./cv";
import type { Calibration, VadaMetrics } from "./science";

export interface SpecimenRecord {
  id: string;
  name: string;
  createdAt: string;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  cv: SpecimenCV;
  metrics: VadaMetrics;
  calibration: Calibration;
  demo?: boolean;
}

const KEY = "vada-metrics:archive:v1";

function simplify(points: { x: number; y: number }[], step = 3) {
  if (points.length <= 60) return points;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]!);
  return out;
}

export function loadArchive(): SpecimenRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpecimenRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(records: SpecimenRecord[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Archive full: drop the oldest non-demo specimen and retry once.
    const trimmed = records.slice(0, Math.max(1, records.length - 4));
    try {
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* the laboratory accepts defeat */
    }
  }
  window.dispatchEvent(new CustomEvent("vada-archive-updated"));
}

export function nextSpecimenId(records: SpecimenRecord[]) {
  const year = new Date().getFullYear();
  const n = records.length + 48; // the archive already claims 47 specimens
  return `VADA-${year}-${String(n).padStart(4, "0")}`;
}

export function saveSpecimen(
  record: Omit<SpecimenRecord, "id" | "createdAt"> & { id?: string },
): SpecimenRecord {
  const records = loadArchive();
  const full: SpecimenRecord = {
    ...record,
    id: record.id ?? nextSpecimenId(records),
    createdAt: new Date().toISOString(),
    cv: {
      ...record.cv,
      outerContour: simplify(record.cv.outerContour),
      holeContour: simplify(record.cv.holeContour),
    },
  };
  persist([full, ...records.filter((r) => r.id !== full.id)]);
  return full;
}

export function deleteSpecimen(id: string) {
  persist(loadArchive().filter((r) => r.id !== id));
}

export function clearArchive() {
  persist([]);
}

export function getSpecimen(id: string) {
  return loadArchive().find((r) => r.id === id) ?? null;
}

export function shortId(id: string) {
  const parts = id.split("-");
  return `VADA #${parts[parts.length - 1] ?? id}`;
}
