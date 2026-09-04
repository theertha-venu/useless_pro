/** Synthetic reference specimens so a demo never depends on live segmentation. */

export interface DemoSpec {
  key: string;
  label: string;
  expectation: string;
  mass: number;
  thickness: number;
  draw: { r: number; hole: number; wobble: number; lobes: number };
}

export const DEMO_SPECS: DemoSpec[] = [
  {
    key: "d1",
    label: "SPECIMEN 001",
    expectation: "ENGINEERING MASTERPIECE",
    mass: 42,
    thickness: 2,
    draw: { r: 0.4, hole: 0.28, wobble: 0.004, lobes: 5 },
  },
  {
    key: "d2",
    label: "SPECIMEN 002",
    expectation: "IDENTITY CRISIS",
    mass: 51,
    thickness: 2.2,
    draw: { r: 0.4, hole: 0.08, wobble: 0.02, lobes: 6 },
  },
  {
    key: "d3",
    label: "SPECIMEN 003",
    expectation: "OVERCONFIDENT",
    mass: 33,
    thickness: 1.9,
    draw: { r: 0.4, hole: 0.52, wobble: 0.015, lobes: 4 },
  },
  {
    key: "d4",
    label: "SPECIMEN 004",
    expectation: "ARTIST",
    mass: 45,
    thickness: 2.1,
    draw: { r: 0.38, hole: 0.24, wobble: 0.11, lobes: 3 },
  },
  {
    key: "d5",
    label: "SPECIMEN 005",
    expectation: "DAL NEUTRON STAR",
    mass: 96,
    thickness: 2.4,
    draw: { r: 0.37, hole: 0.2, wobble: 0.03, lobes: 7 },
  },
];

export function renderDemoImage(spec: DemoSpec, size = 420): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // laboratory tray background
  ctx.fillStyle = "#1b1a17";
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const base = size * spec.draw.r;

  const radiusAt = (a: number) =>
    base *
    (1 +
      spec.draw.wobble * Math.sin(a * spec.draw.lobes) +
      spec.draw.wobble * 0.6 * Math.cos(a * (spec.draw.lobes + 3) + 1.2));

  const path = (scale: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
      const a = (i * Math.PI) / 180;
      const r = radiusAt(a) * scale;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  const grad = ctx.createRadialGradient(cx - base * 0.3, cy - base * 0.3, base * 0.1, cx, cy, base);
  grad.addColorStop(0, "#e8b45a");
  grad.addColorStop(0.6, "#c8873a");
  grad.addColorStop(1, "#8c5620");
  ctx.fillStyle = grad;
  path(1);
  ctx.fill();

  if (spec.draw.hole > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.ellipse(cx, cy, base * spec.draw.hole, base * spec.draw.hole * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // fried speckle texture
  for (let i = 0; i < 1400; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = base * (0.1 + Math.random() * 0.9);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const inHole = Math.hypot(x - cx, y - cy) < base * spec.draw.hole;
    if (inHole || Math.hypot(x - cx, y - cy) > radiusAt(a)) continue;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,225,170" : "90,50,20"},${0.05 + Math.random() * 0.18})`;
    ctx.fillRect(x, y, 2, 2);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}
