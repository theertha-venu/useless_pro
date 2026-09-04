import { Button } from "@/components/ui/button";
import { finalVerdict, personality, round, type VadaMetrics } from "@/lib/vada/science";

function drawCertificate(id: string, m: VadaMetrics, name: string) {
  const w = 1400;
  const h = 990;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#141310";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#e0b048";
  ctx.lineWidth = 6;
  ctx.strokeRect(38, 38, w - 76, h - 76);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, w - 116, h - 116);

  ctx.textAlign = "center";
  ctx.fillStyle = "#9c8f78";
  ctx.font = "500 20px 'IBM Plex Mono', monospace";
  ctx.fillText("V.A.D.A.  ·  VISUAL ANALYSIS & DIMENSIONAL ASSESSMENT", w / 2, 130);

  ctx.fillStyle = "#f2c25b";
  ctx.font = "700 58px Georgia, serif";
  ctx.fillText("CERTIFICATE OF VADA EXCELLENCE", w / 2, 215);

  ctx.fillStyle = "#efe7d8";
  ctx.font = "300 24px Georgia, serif";
  ctx.fillText("This certifies that", w / 2, 290);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 66px 'IBM Plex Mono', monospace";
  ctx.fillText(name || id, w / 2, 375);

  ctx.fillStyle = "#efe7d8";
  ctx.font = "300 24px Georgia, serif";
  ctx.fillText("has achieved a Vada Quality Score of", w / 2, 435);

  ctx.fillStyle = "#f2c25b";
  ctx.font = "700 96px 'IBM Plex Mono', monospace";
  ctx.fillText(`${m.score.overall} / 100`, w / 2, 535);

  ctx.fillStyle = "#efe7d8";
  ctx.font = "300 24px Georgia, serif";
  ctx.fillText("in the field of Unnecessarily Advanced Vada Science", w / 2, 590);

  ctx.fillStyle = "#7fd8f5";
  ctx.font = "600 30px 'IBM Plex Mono', monospace";
  ctx.fillText(
    `CLASSIFICATION: ${m.score.overall >= 90 ? "GOLDEN VADA" : finalVerdict(m.score.overall)}`,
    w / 2,
    650,
  );

  ctx.fillStyle = "#9c8f78";
  ctx.font = "400 20px 'IBM Plex Mono', monospace";
  const u = m.unit;
  ctx.fillText(
    `⌀ ${round(m.outerDiameter, 2)} ${u}   ·   HOLE ${round(m.holeDiameter, 2)} ${u}   ·   CIRCULARITY ${round(m.circularity, 0)}%   ·   SYMMETRY ${round(m.symmetry, 0)}%`,
    w / 2,
    706,
  );
  ctx.fillText(`PERSONALITY: ${personality(m).name}`, w / 2, 740);
  if (!m.calibrated)
    ctx.fillText("MEASUREMENTS ESTIMATED — NO SCALE CALIBRATION SUPPLIED", w / 2, 774);

  ctx.textAlign = "left";
  ctx.fillStyle = "#efe7d8";
  ctx.font = "italic 30px Georgia, serif";
  ctx.fillText("Dr. K. Vadamurthy", 130, 880);
  ctx.strokeStyle = "#5a5346";
  ctx.beginPath();
  ctx.moveTo(130, 895);
  ctx.lineTo(560, 895);
  ctx.stroke();
  ctx.fillStyle = "#9c8f78";
  ctx.font = "400 17px 'IBM Plex Mono', monospace";
  ctx.fillText("Director of Completely Unnecessary Food Science", 130, 922);

  ctx.textAlign = "right";
  ctx.fillText(`SPECIMEN ID: ${id}`, w - 130, 880);
  ctx.fillText(`ISSUED: ${new Date().toLocaleString()}`, w - 130, 906);
  ctx.fillText("SCIENTIFIC NECESSITY: 0%", w - 130, 932);

  return canvas.toDataURL("image/png");
}

export function CertificateButton({
  id,
  metrics,
  name,
}: {
  id: string;
  metrics: VadaMetrics;
  name: string;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => {
        const url = drawCertificate(id, metrics, name);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${id}-certificate.png`;
        a.click();
      }}
    >
      Generate certificate
    </Button>
  );
}
