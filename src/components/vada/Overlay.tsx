import { useEffect, useRef } from "react";
import type { SpecimenCV } from "@/lib/vada/cv";
import type { VadaMetrics } from "@/lib/vada/science";
import { round } from "@/lib/vada/science";

interface Props {
  imageDataUrl: string;
  width: number;
  height: number;
  specimens: { cv: SpecimenCV; metrics: VadaMetrics; label: string }[];
  activeIndex?: number;
  className?: string;
}

export function Overlay({
  imageDataUrl,
  width,
  height,
  specimens,
  activeIndex = 0,
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      specimens.forEach(({ cv, metrics, label }, i) => {
        const active = i === activeIndex;
        const gold = active ? "#ffd257" : "rgba(255,210,87,0.45)";
        const cyan = active ? "#5fe0ff" : "rgba(95,224,255,0.4)";

        ctx.lineWidth = active ? 2 : 1.2;
        ctx.strokeStyle = gold;
        ctx.shadowColor = gold;
        ctx.shadowBlur = active ? 8 : 0;
        if (cv.outerContour.length > 2) {
          ctx.beginPath();
          cv.outerContour.forEach((p, idx) =>
            idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
          );
          ctx.closePath();
          ctx.stroke();
        }

        if (cv.holeContour.length > 2) {
          ctx.strokeStyle = cyan;
          ctx.shadowColor = cyan;
          ctx.beginPath();
          cv.holeContour.forEach((p, idx) =>
            idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
          );
          ctx.closePath();
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        const { x: cx, y: cy } = cv.centroid;
        const r = cv.outerDiameterPx / 2;

        // diameter line
        ctx.strokeStyle = gold;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
        // radius line
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - r);
        ctx.stroke();
        ctx.setLineDash([]);

        const unit = metrics.unit;
        const fmt = (v: number) => `${round(v, 2)} ${unit}`;

        ctx.font = "600 11px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        const tag = (text: string, x: number, y: number, color: string) => {
          const w = ctx.measureText(text).width + 10;
          ctx.fillStyle = "rgba(15,14,12,0.82)";
          ctx.fillRect(x - w / 2, y - 12, w, 16);
          ctx.fillStyle = color;
          ctx.fillText(text, x, y);
        };

        tag(fmt(metrics.outerDiameter), cx, cy - 6, "#ffd257");
        tag(`r ${round(metrics.radius, 2)}`, cx + 34, cy - r + 12, "#ffffff");
        if (metrics.holeDiameter > 0) {
          const hc = cv.holeCentroid ?? cv.centroid;
          const hr = cv.holeDiameterPx / 2;
          ctx.strokeStyle = cyan;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(hc.x - hr, hc.y);
          ctx.lineTo(hc.x + hr, hc.y);
          ctx.stroke();
          ctx.setLineDash([]);
          tag(`⌀hole ${round(metrics.holeDiameter, 2)}`, hc.x, hc.y + 22, "#5fe0ff");
        }
        tag(label, cx, cv.bbox.y - 6, active ? "#ffd257" : "rgba(255,255,255,0.6)");
      });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, width, height, specimens, activeIndex]);

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className={className}
      aria-label="Analyzed vada with computer-vision overlay"
    />
  );
}
