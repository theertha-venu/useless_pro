/**
 * VADA-METRICS computer vision core.
 * Pure client-side segmentation: images never leave the laboratory.
 *
 * Pipeline: downscale -> background estimation -> foreground mask ->
 * connected components -> hole detection (enclosed background) ->
 * contour tracing -> geometry / circularity / symmetry.
 */

export type Point = { x: number; y: number };

export interface SpecimenCV {
  index: number;
  /** pixel area of the solid body (excluding hole) */
  bodyAreaPx: number;
  /** pixel area enclosed by the outer contour (body + hole) */
  outerAreaPx: number;
  perimeterPx: number;
  holeAreaPx: number;
  centroid: Point;
  holeCentroid: Point | null;
  outerDiameterPx: number;
  holeDiameterPx: number;
  outerContour: Point[];
  holeContour: Point[];
  circularity: number; // 0..1
  symmetryH: number; // 0..1
  symmetryV: number; // 0..1
  radiusVariation: number; // 0..1, lower = rounder
  confidence: number; // 0..100
  bbox: { x: number; y: number; w: number; h: number };
}

export interface CVResult {
  width: number;
  height: number;
  imageDataUrl: string;
  specimens: SpecimenCV[];
}

const MAX_DIM = 520;

function drawToCanvas(img: HTMLImageElement) {
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be decoded"));
    img.src = src;
  });
}

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** Otsu threshold over a 0..255 histogram of distances. */
function otsu(hist: number[], total: number) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

function traceContour(mask: Uint8Array, w: number, h: number, label: number, labels: Int32Array) {
  // Moore-neighbour boundary tracing from the topmost-leftmost pixel.
  let start = -1;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === label) {
      start = i;
      break;
    }
  }
  if (start < 0) return [] as Point[];
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && labels[y * w + x] === label;

  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  const sx = start % w;
  const sy = Math.floor(start / w);
  const contour: Point[] = [];
  let cx = sx;
  let cy = sy;
  let dir = 6;
  const maxSteps = 8 * (w + h) * 4;
  for (let step = 0; step < maxSteps; step++) {
    contour.push({ x: cx, y: cy });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 5 + k) % 8;
      const nx = cx + dirs[nd]![0]!;
      const ny = cy + dirs[nd]![1]!;
      if (inside(nx, ny)) {
        cx = nx;
        cy = ny;
        dir = nd;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === sx && cy === sy && contour.length > 2) break;
  }
  void mask;
  return contour;
}

function contourPerimeter(contour: Point[]) {
  let p = 0;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i]!;
    const b = contour[(i + 1) % contour.length]!;
    p += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return p;
}

function polygonArea(contour: Point[]) {
  let a = 0;
  for (let i = 0; i < contour.length; i++) {
    const p = contour[i]!;
    const q = contour[(i + 1) % contour.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export async function analyzeImage(src: string): Promise<CVResult> {
  const img = await loadImage(src);
  const { canvas, ctx, w, h } = drawToCanvas(img);
  const data = ctx.getImageData(0, 0, w, h).data;

  // --- background estimation from the image border ---
  const br: number[] = [];
  const bg: number[] = [];
  const bb: number[] = [];
  const pushPx = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    br.push(data[i]!);
    bg.push(data[i + 1]!);
    bb.push(data[i + 2]!);
  };
  for (let x = 0; x < w; x++) {
    pushPx(x, 0);
    pushPx(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushPx(0, y);
    pushPx(w - 1, y);
  }
  const bgR = median(br);
  const bgG = median(bg);
  const bgB = median(bb);

  // --- distance-from-background map ---
  const dist = new Uint8Array(w * h);
  const hist = new Array<number>(256).fill(0);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const dr = data[i]! - bgR;
    const dg = data[i + 1]! - bgG;
    const db = data[i + 2]! - bgB;
    const d = Math.min(255, Math.round(Math.sqrt(dr * dr + dg * dg + db * db) / 1.733));
    dist[p] = d;
    hist[d] = (hist[d] ?? 0) + 1;
  }
  const t = Math.max(14, Math.min(90, otsu(hist, w * h)));
  const mask = new Uint8Array(w * h);
  for (let p = 0; p < mask.length; p++) mask[p] = dist[p]! > t ? 1 : 0;

  // --- morphological cleanup (open then close, 3x3) ---
  const morph = (input: Uint8Array, erode: boolean) => {
    const out = new Uint8Array(input.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = erode ? 1 : 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const s = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : input[ny * w + nx]!;
            if (erode) v = Math.min(v, s);
            else v = Math.max(v, s);
          }
        }
        out[y * w + x] = v;
      }
    }
    return out;
  };
  let m = morph(morph(mask, true), false);
  m = morph(morph(m, false), true);

  // --- connected components on the foreground ---
  const labels = new Int32Array(w * h).fill(0);
  const areas: number[] = [0];
  let next = 1;
  const stack: number[] = [];
  for (let p = 0; p < m.length; p++) {
    if (!m[p] || labels[p]) continue;
    const label = next++;
    let area = 0;
    stack.push(p);
    labels[p] = label;
    while (stack.length) {
      const q = stack.pop()!;
      area++;
      const qx = q % w;
      const qy = (q / w) | 0;
      if (qx > 0 && m[q - 1] && !labels[q - 1]) (labels[q - 1] = label), stack.push(q - 1);
      if (qx < w - 1 && m[q + 1] && !labels[q + 1]) (labels[q + 1] = label), stack.push(q + 1);
      if (qy > 0 && m[q - w] && !labels[q - w]) (labels[q - w] = label), stack.push(q - w);
      if (qy < h - 1 && m[q + w] && !labels[q + w]) (labels[q + w] = label), stack.push(q + w);
    }
    areas[label] = area;
  }

  // --- background flood from borders to find enclosed holes ---
  const outside = new Uint8Array(w * h);
  const q2: number[] = [];
  const seed = (p: number) => {
    if (!m[p] && !outside[p]) {
      outside[p] = 1;
      q2.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (q2.length) {
    const p = q2.pop()!;
    const px = p % w;
    const py = (p / w) | 0;
    if (px > 0) seed(p - 1);
    if (px < w - 1) seed(p + 1);
    if (py > 0) seed(p - w);
    if (py < h - 1) seed(p + w);
  }

  const minArea = w * h * 0.012;
  const candidates: number[] = [];
  for (let l = 1; l < areas.length; l++) if (areas[l]! >= minArea) candidates.push(l);
  candidates.sort((a, b) => areas[b]! - areas[a]!);
  const chosen = candidates.filter((l) => areas[l]! >= areas[candidates[0]!]! * 0.25).slice(0, 6);

  const specimens: SpecimenCV[] = [];

  chosen.forEach((label, index) => {
    // body pixel stats
    let sx = 0;
    let sy = 0;
    let n = 0;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    for (let p = 0; p < labels.length; p++) {
      if (labels[p] !== label) continue;
      const x = p % w;
      const y = (p / w) | 0;
      sx += x;
      sy += y;
      n++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (!n) return;
    const cxp = sx / n;
    const cyp = sy / n;

    // enclosed background pixels adjacent to this component = the hole
    const holePixels: number[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const p = y * w + x;
        if (m[p] || outside[p]) continue;
        holePixels.push(p);
      }
    }
    let holeArea = 0;
    let hx = 0;
    let hy = 0;
    for (const p of holePixels) {
      holeArea++;
      hx += p % w;
      hy += (p / w) | 0;
    }
    const hasHole = holeArea > Math.max(12, n * 0.008);
    const holeCentroid = hasHole ? { x: hx / holeArea, y: hy / holeArea } : null;

    const outerContour = traceContour(m, w, h, label, labels);
    const perimeter = Math.max(1, contourPerimeter(outerContour));
    const polyArea = Math.max(polygonArea(outerContour), n);
    const outerArea = Math.max(polyArea, n + (hasHole ? holeArea : 0));

    // hole contour: label hole pixels then trace the largest blob
    let holeContour: Point[] = [];
    if (hasHole) {
      const hLabels = new Int32Array(w * h);
      const hMask = new Uint8Array(w * h);
      for (const p of holePixels) hMask[p] = 1;
      let hNext = 1;
      const hAreas: number[] = [0];
      const st: number[] = [];
      for (const p0 of holePixels) {
        if (hLabels[p0]) continue;
        const hl = hNext++;
        let a = 0;
        st.push(p0);
        hLabels[p0] = hl;
        while (st.length) {
          const p = st.pop()!;
          a++;
          const px = p % w;
          const py = (p / w) | 0;
          const tryP = (np: number) => {
            if (hMask[np] && !hLabels[np]) {
              hLabels[np] = hl;
              st.push(np);
            }
          };
          if (px > 0) tryP(p - 1);
          if (px < w - 1) tryP(p + 1);
          if (py > 0) tryP(p - w);
          if (py < h - 1) tryP(p + w);
        }
        hAreas[hl] = a;
      }
      let bestL = 1;
      for (let l = 1; l < hAreas.length; l++) if (hAreas[l]! > hAreas[bestL]!) bestL = l;
      holeArea = hAreas[bestL] ?? holeArea;
      holeContour = traceContour(hMask, w, h, bestL, hLabels);
    }

    // radial profile from the centroid over the outer contour
    const radii = outerContour.map((p) => Math.hypot(p.x - cxp, p.y - cyp));
    const meanR = radii.reduce((a, b) => a + b, 0) / Math.max(1, radii.length);
    const varR = Math.sqrt(
      radii.reduce((a, r) => a + (r - meanR) * (r - meanR), 0) / Math.max(1, radii.length),
    );
    const radiusVariation = meanR > 0 ? Math.min(1, varR / meanR) : 1;

    const equivDiameter = 2 * Math.sqrt(outerArea / Math.PI);
    const outerDiameterPx = (equivDiameter + 2 * meanR) / 2;
    const holeDiameterPx = hasHole ? 2 * Math.sqrt(holeArea / Math.PI) : 0;

    const circularity = Math.max(0, Math.min(1, (4 * Math.PI * outerArea) / (perimeter * perimeter)));

    // symmetry: mirror the body mask about the centroid axes and measure overlap
    const symmetry = (axis: "h" | "v") => {
      let inter = 0;
      let union = 0;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const a = labels[y * w + x] === label ? 1 : 0;
          const mx = axis === "v" ? Math.round(2 * cxp - x) : x;
          const my = axis === "h" ? Math.round(2 * cyp - y) : y;
          const b =
            mx >= 0 && my >= 0 && mx < w && my < h && labels[my * w + mx] === label ? 1 : 0;
          if (a || b) union++;
          if (a && b) inter++;
        }
      }
      return union ? inter / union : 0;
    };
    const symmetryV = symmetry("v");
    const symmetryH = symmetry("h");

    const boxFill = outerArea / Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
    const confidence = Math.max(
      35,
      Math.min(
        99.4,
        100 * (0.45 * circularity + 0.25 * (symmetryV + symmetryH) * 0.5 + 0.2 * boxFill) +
          (hasHole ? 12 : 2),
      ),
    );

    specimens.push({
      index,
      bodyAreaPx: n,
      outerAreaPx: outerArea,
      perimeterPx: perimeter,
      holeAreaPx: hasHole ? holeArea : 0,
      centroid: { x: cxp, y: cyp },
      holeCentroid,
      outerDiameterPx,
      holeDiameterPx,
      outerContour,
      holeContour,
      circularity,
      symmetryH,
      symmetryV,
      radiusVariation,
      confidence: Math.round(confidence * 10) / 10,
      bbox: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    });
  });

  return {
    width: w,
    height: h,
    imageDataUrl: canvas.toDataURL("image/jpeg", 0.86),
    specimens,
  };
}
