import { EicTrack, FrameTelemetry, MusicalScaleId, RootNote } from '../types/jukebox';
import { quantizeToScale } from '../audio/scales';
import { getTrackScientificBaseline } from '../data/eicTracks';

// Simplified continent polygons (normalized [lon: 0..1, lat: 0..1]) for authentic EIC Earth projection framing
const CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  // North America
  [
    [0.14, 0.22], [0.22, 0.18], [0.30, 0.20], [0.33, 0.28], [0.29, 0.36],
    [0.24, 0.44], [0.21, 0.42], [0.18, 0.34], [0.13, 0.28],
  ],
  // South America
  [
    [0.26, 0.50], [0.33, 0.52], [0.37, 0.60], [0.34, 0.72], [0.29, 0.84],
    [0.26, 0.78], [0.25, 0.62],
  ],
  // Greenland
  [
    [0.37, 0.12], [0.43, 0.11], [0.45, 0.18], [0.40, 0.22], [0.37, 0.17],
  ],
  // Europe
  [
    [0.46, 0.21], [0.55, 0.19], [0.59, 0.25], [0.56, 0.34], [0.48, 0.35],
    [0.45, 0.28],
  ],
  // Africa
  [
    [0.46, 0.39], [0.57, 0.39], [0.62, 0.48], [0.59, 0.62], [0.54, 0.76],
    [0.49, 0.68], [0.47, 0.52], [0.43, 0.46],
  ],
  // Asia
  [
    [0.58, 0.18], [0.76, 0.17], [0.87, 0.24], [0.85, 0.36], [0.78, 0.45],
    [0.70, 0.49], [0.64, 0.43], [0.59, 0.34],
  ],
  // Australia
  [
    [0.77, 0.63], [0.86, 0.62], [0.89, 0.71], [0.84, 0.77], [0.76, 0.73],
  ],
  // Antarctica
  [
    [0.12, 0.90], [0.35, 0.88], [0.65, 0.89], [0.88, 0.90], [0.90, 0.96],
    [0.10, 0.96],
  ],
];

function drawContinentOutlines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokeColor = 'rgba(226, 232, 240, 0.38)',
  fillColor = 'rgba(15, 23, 42, 0.18)'
): void {
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = 1.25;
  for (const poly of CONTINENT_POLYGONS) {
    ctx.beginPath();
    poly.forEach(([nx, ny], idx) => {
      const px = nx * w;
      const py = ny * h;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawLatLonGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    const x = (w * i) / 12;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let j = 1; j < 6; j++) {
    const y = (h * j) / 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // Equator subtle highlight
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.restore();
}

export function renderEicSourceFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  track: EicTrack,
  year: number,
  animPhase: number,
  customImage: HTMLImageElement | null
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  if (track.kind === 'custom') {
    if (customImage) {
      const scale = Math.min(w / customImage.width, h / customImage.height);
      const dw = customImage.width * scale;
      const dh = customImage.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(customImage, dx, dy, dw, dh);
    } else {
      // Default procedural hyperspectral Earth calibration frame when no file uploaded yet
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.42);
      grad.addColorStop(0, '#0ea5e9');
      grad.addColorStop(0.55, '#0f172a');
      grad.addColorStop(1, '#07090e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      drawLatLonGrid(ctx, w, h);
      drawContinentOutlines(ctx, w, h, 'rgba(34, 211, 238, 0.55)', 'rgba(6, 182, 212, 0.14)');
      ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
      ctx.font = '600 15px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload any NASA EIC visual frame or satellite image to sonify its pixel matrix', w / 2, h / 2);
    }
    return;
  }

  switch (track.kind) {
    case 'temperature':
      renderTemperatureFrame(ctx, w, h, year, animPhase);
      break;
    case 'sealevel':
      renderSeaLevelFrame(ctx, w, h, year, animPhase);
      break;
    case 'seaice':
      renderSeaIceFrame(ctx, w, h, year, animPhase);
      break;
    case 'currents':
      renderOceanCurrentsFrame(ctx, w, h, year, animPhase);
      break;
    case 'emissions':
      renderEmissionsFrame(ctx, w, h, year, animPhase);
      break;
  }
}

function renderTemperatureFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  year: number,
  phase: number
): void {
  const t = Math.max(0, Math.min(1, (year - 1880) / (2025 - 1880)));

  // Ocean thermal background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0c1f3f');
  bg.addColorStop(0.5, '#091529');
  bg.addColorStop(1, '#0c1f3f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Thermal anomaly clusters shifting strongly warmer in recent decades + Arctic amplification
  const hotZones = [
    { x: 0.48, y: 0.15, r: 0.28, intensity: 0.35 + t * 0.95 }, // Arctic Amplification
    { x: 0.56, y: 0.27, r: 0.18, intensity: 0.25 + t * 0.85 }, // Eurasia warming
    { x: 0.23, y: 0.29, r: 0.17, intensity: 0.2 + t * 0.78 }, // North America
    { x: 0.54, y: 0.49, r: 0.16, intensity: 0.22 + t * 0.72 }, // Sahara / Sahel
    { x: 0.32, y: 0.58, r: 0.15, intensity: 0.18 + t * 0.65 }, // Amazon Basin
    { x: 0.74, y: 0.36, r: 0.16, intensity: 0.2 + t * 0.75 }, // East Asia
    { x: 0.82, y: 0.69, r: 0.14, intensity: 0.18 + t * 0.68 }, // Australia
  ];

  // Cooler oceanic upwelling & earlier baseline cooling spots
  const coolSpots = [
    { x: 0.41, y: 0.24, r: 0.11, intensity: 0.75 - t * 0.35 }, // North Atlantic Cold Blob
    { x: 0.20, y: 0.53, r: 0.16, intensity: 0.65 - t * 0.3 }, // Equatorial Pacific ENSO
    { x: 0.60, y: 0.82, r: 0.22, intensity: 0.7 - t * 0.35 }, // Southern Ocean
  ];

  for (const spot of coolSpots) {
    const cx = spot.x * w;
    const cy = spot.y * h;
    const rad = spot.r * w;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    g.addColorStop(0, `rgba(37, 99, 235, ${0.65 * spot.intensity})`);
    g.addColorStop(0.5, `rgba(56, 189, 248, ${0.3 * spot.intensity})`);
    g.addColorStop(1, 'rgba(9, 21, 41, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  for (let i = 0; i < hotZones.length; i++) {
    const z = hotZones[i];
    const pulse = 1 + Math.sin(phase * 1.4 + i) * 0.04;
    const cx = z.x * w;
    const cy = z.y * h;
    const rad = z.r * w * pulse;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    const alpha = Math.min(0.92, z.intensity * 0.78);
    if (t > 0.45) {
      g.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);
      g.addColorStop(0.45, `rgba(245, 158, 11, ${alpha * 0.72})`);
      g.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      g.addColorStop(0, `rgba(148, 163, 184, ${alpha * 0.5})`);
      g.addColorStop(0.5, `rgba(56, 189, 248, ${alpha * 0.3})`);
      g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawLatLonGrid(ctx, w, h);
  drawContinentOutlines(ctx, w, h, 'rgba(248, 250, 252, 0.45)', 'rgba(255, 255, 255, 0.04)');
}

function renderSeaLevelFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  year: number,
  phase: number
): void {
  const t = Math.max(0, Math.min(1, (year - 1993) / (2024 - 1993)));
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.37;

  // Deep ocean bathymetry rings
  for (let i = 5; i >= 1; i--) {
    const r = (maxR * 1.35 * i) / 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Concentric sea-level wave glow scaled by year progress
  const waveGlow = ctx.createRadialGradient(cx, cy, maxR * 0.35, cx, cy, maxR * (1.1 + 0.2 * t));
  waveGlow.addColorStop(0, 'rgba(6, 182, 212, 0.06)');
  waveGlow.addColorStop(0.65, `rgba(14, 165, 233, ${0.18 + t * 0.22})`);
  waveGlow.addColorStop(1, 'rgba(7, 11, 20, 0)');
  ctx.fillStyle = waveGlow;
  ctx.fillRect(0, 0, w, h);

  // Donut chart matching NASA/JPL-Caltech 2024 contributors (2/3 Thermal Expansion, 1/3 Land Ice Melt)
  const thickness = Math.max(28, maxR * (0.28 + t * 0.12));
  const startAngle = -Math.PI * 0.5 + Math.sin(phase * 0.6) * 0.03;
  const splitAngle = startAngle + Math.PI * 2 * (2 / 3);

  // 2/3 Thermal Expansion of Warming Seawater (Cyan/Cobalt)
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, startAngle, splitAngle);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = thickness;
  ctx.stroke();

  // Inner thermal shimmer arc
  ctx.beginPath();
  ctx.arc(cx, cy, maxR - thickness * 0.18, startAngle, splitAngle);
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.65)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 1/3 Melting Land Ice (Telemetry Amber)
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, splitAngle + 0.03, startAngle + Math.PI * 2 - 0.03);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = thickness;
  ctx.stroke();

  // Center telemetry labels inside donut
  const mm = (t * 101.4).toFixed(1);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 28px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`+${mm} mm`, cx, cy - 4);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px "IBM Plex Sans", sans-serif';
  ctx.fillText(`NASA/JPL ${year} SEA-LEVEL RISE`, cx, cy + 20);

  // Contributor callouts along outer arc
  ctx.fillStyle = '#38bdf8';
  ctx.font = '500 12px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('THERMAL EXPANSION · 66.7%', cx + maxR + 28, cy + 20);

  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'right';
  ctx.fillText('MELTING LAND ICE · 33.3%', cx - maxR - 28, cy - 34);
}

function renderSeaIceFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  year: number,
  phase: number
): void {
  const t = Math.max(0, Math.min(1, (year - 1979) / (2025 - 1979)));
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxPolarR = Math.min(w, h) * 0.42;

  // Polar ocean backdrop
  const oceanGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxPolarR * 1.4);
  oceanGrad.addColorStop(0, '#0c2340');
  oceanGrad.addColorStop(1, '#050b16');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Concentric latitude circles (80N, 70N, 60N)
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (maxPolarR * i) / 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 1981-2010 Median Reference Extent Outline (dashed amber)
  ctx.save();
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.12) {
    const wobble = 1 + 0.12 * Math.sin(a * 3 + 0.5) + 0.08 * Math.cos(a * 5 - 1.1);
    const r = maxPolarR * 0.78 * wobble;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Active Year Sea Ice Sheet (contracts sharply as year -> 2025)
  const extentScale = 0.84 - t * 0.36;
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.1) {
    const irregular =
      1 +
      0.14 * Math.sin(a * 3 + 0.4) +
      0.09 * Math.cos(a * 5 + phase * 0.3) +
      0.05 * Math.sin(a * 7);
    const r = maxPolarR * extentScale * irregular;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const iceGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, maxPolarR * extentScale * 1.1);
  iceGrad.addColorStop(0, '#f8fafc');
  iceGrad.addColorStop(0.55, '#a5f3fc');
  iceGrad.addColorStop(0.88, '#0891b2');
  iceGrad.addColorStop(1, 'rgba(14, 116, 144, 0.35)');
  ctx.fillStyle = iceGrad;
  ctx.fill();

  ctx.strokeStyle = '#67e8f9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Legend annotations
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '500 11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SOLID CYAN: ${year} MINIMUM EXTENT`, 22, h - 22);
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'right';
  ctx.fillText('DASHED AMBER: 1981–2010 MEDIAN', w - 22, h - 22);
}

function renderOceanCurrentsFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  year: number,
  phase: number
): void {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#061124');
  bg.addColorStop(0.5, '#091b34');
  bg.addColorStop(1, '#061124');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Warm Western Boundary Currents (Gulf Stream & Kuroshio)
  const warmJets = [
    { x: 0.34, y: 0.34, r: 0.22 },
    { x: 0.80, y: 0.36, r: 0.20 },
  ];
  for (const jet of warmJets) {
    const g = ctx.createRadialGradient(jet.x * w, jet.y * h, 4, jet.x * w, jet.y * h, jet.r * w);
    g.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
    g.addColorStop(0.5, 'rgba(14, 165, 233, 0.28)');
    g.addColorStop(1, 'rgba(6, 17, 36, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawLatLonGrid(ctx, w, h);

  // Flowing streamline particles (ECCO-2 style)
  const rows = 14;
  const cols = 22;
  const yearOffset = (year - 2000) * 0.25;
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const ny = r / rows;
      const vx = Math.cos(ny * Math.PI * 2.2 + nx * 3.1 + yearOffset) * 18;
      const vy = Math.sin(nx * Math.PI * 3.0 + ny * 2.4 + phase * 1.5) * 12;
      const speed = Math.hypot(vx, vy) / 22;

      const shift = ((phase * 0.6 + c * 0.13) % 1) * 14;
      const px = nx * w + (vx / 22) * shift;
      const py = ny * h + (vy / 22) * shift;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + vx * 1.15, py + vy * 1.15);
      ctx.strokeStyle =
        speed > 0.72
          ? 'rgba(251, 191, 36, 0.82)'
          : speed > 0.45
          ? 'rgba(34, 211, 238, 0.75)'
          : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = speed > 0.7 ? 2.2 : 1.3;
      ctx.stroke();
    }
  }

  drawContinentOutlines(ctx, w, h, 'rgba(226, 232, 240, 0.55)', '#0b1220');
}

function renderEmissionsFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  year: number,
  phase: number
): void {
  const t = Math.max(0, Math.min(1, (year - 2015) / (2025 - 2015)));
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, w, h);

  // Background CO2 latitude band (stronger in Northern Hemisphere)
  const band = ctx.createLinearGradient(0, 0, 0, h);
  band.addColorStop(0, `rgba(13, 148, 136, ${0.18 + t * 0.16})`);
  band.addColorStop(0.38, `rgba(245, 158, 11, ${0.16 + t * 0.24})`);
  band.addColorStop(0.65, `rgba(13, 148, 136, ${0.14 + t * 0.14})`);
  band.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);

  drawLatLonGrid(ctx, w, h);
  drawContinentOutlines(ctx, w, h, 'rgba(226, 232, 240, 0.35)', 'rgba(15, 23, 42, 0.35)');

  // Localized methane / industrial emission hotspots (EMIT & OCO-2)
  const plumes = [
    { x: 0.22, y: 0.32, r: 0.11, name: 'Permian Basin' },
    { x: 0.52, y: 0.28, r: 0.10, name: 'Central Europe' },
    { x: 0.63, y: 0.36, r: 0.12, name: 'Persian Gulf' },
    { x: 0.77, y: 0.34, r: 0.14, name: 'East Asia' },
    { x: 0.54, y: 0.54, r: 0.09, name: 'Congo Basin' },
  ];

  plumes.forEach((p, idx) => {
    const pulse = 1 + 0.14 * Math.sin(phase * 2.1 + idx * 1.3);
    const cx = p.x * w;
    const cy = p.y * h;
    const rad = p.r * w * (0.78 + t * 0.35) * pulse;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
    g.addColorStop(0, 'rgba(239, 68, 68, 0.92)');
    g.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)');
    g.addColorStop(0.7, 'rgba(20, 184, 166, 0.22)');
    g.addColorStop(1, 'rgba(7, 11, 20, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function findIntensityCentroid(
  sourceCtx: CanvasRenderingContext2D,
  w: number,
  h: number
): { cx: number; cy: number } {
  const img = sourceCtx.getImageData(0, 0, w, h).data;
  const stride = 8;
  let sumWeight = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const i = (y * w + x) * 4;
      const r = img[i] / 255;
      const g = img[i + 1] / 255;
      const b = img[i + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const weight = Math.pow(lum, 2) + Math.max(0, r - b) * 0.6;
      sumWeight += weight;
      sumX += (x / w) * weight;
      sumY += (y / h) * weight;
    }
  }

  if (sumWeight < 0.001) return { cx: 0.5, cy: 0.5 };
  return { cx: sumX / sumWeight, cy: sumY / sumWeight };
}

export function analyzeFrameAtCursor(
  sourceCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  normX: number,
  normY: number,
  track: EicTrack,
  year: number,
  scale: MusicalScaleId,
  rootNote: RootNote,
  centroid: { cx: number; cy: number }
): FrameTelemetry {
  const clampedX = Math.max(0.02, Math.min(0.98, normX));
  const clampedY = Math.max(0.02, Math.min(0.98, normY));

  const px = Math.floor(clampedX * w);
  const py = Math.floor(clampedY * h);
  const radius = 10;
  const sx = Math.max(0, px - radius);
  const sy = Math.max(0, py - radius);
  const sw = Math.min(w - sx, radius * 2);
  const sh = Math.min(h - sy, radius * 2);

  const data = sourceCtx.getImageData(sx, sy, sw, sh).data;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let lumSum = 0;
  let edgeSum = 0;
  const count = sw * sh;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = (y * sw + x) * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      rSum += r;
      gSum += g;
      bSum += b;
      lumSum += lum;

      if (x > 0 && y > 0) {
        const leftIdx = (y * sw + (x - 1)) * 4;
        const upIdx = ((y - 1) * sw + x) * 4;
        const lumLeft =
          (0.2126 * data[leftIdx] + 0.7152 * data[leftIdx + 1] + 0.0722 * data[leftIdx + 2]) / 255;
        const lumUp =
          (0.2126 * data[upIdx] + 0.7152 * data[upIdx + 1] + 0.0722 * data[upIdx + 2]) / 255;
        edgeSum += Math.abs(lum - lumLeft) + Math.abs(lum - lumUp);
      }
    }
  }

  const red = rSum / Math.max(1, count);
  const green = gSum / Math.max(1, count);
  const blue = bSum / Math.max(1, count);
  const luminance = lumSum / Math.max(1, count);
  const edgeDensity = Math.min(1, (edgeSum / Math.max(1, count)) * 7.5);
  const thermalIndex = Math.max(-1, Math.min(1, (red - blue) * 1.6));

  // Map luminance + thermal lift into musical pitch via Harmonic Quantization
  const pitchDriver = Math.max(0, Math.min(1, luminance * 0.65 + (thermalIndex + 1) * 0.175));
  const quantized = quantizeToScale(pitchDriver, scale, rootNote, 0, 2);

  // Filter cutoff tracks warm-to-cool ratio smoothly (280 Hz to 3200 Hz)
  const filterCutoffHz = Math.round(280 + ((thermalIndex + 1) * 0.5) * 2900);
  const stereoPan = Math.max(-1, Math.min(1, (clampedX - 0.5) * 1.8));

  const baseline = getTrackScientificBaseline(track.kind, year);
  const latDeg = Math.round((0.5 - clampedY) * 180);
  const lonDeg = Math.round((clampedX - 0.5) * 360);
  const latStr = `${Math.abs(latDeg)}°${latDeg >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lonDeg)}°${lonDeg >= 0 ? 'E' : 'W'}`;

  return {
    cursorX: clampedX,
    cursorY: clampedY,
    luminance,
    red,
    green,
    blue,
    thermalIndex,
    edgeDensity,
    centroidX: centroid.cx,
    centroidY: centroid.cy,
    activePitchHz: quantized.hz,
    activeNoteName: quantized.noteName,
    filterCutoffHz,
    stereoPan,
    scientificValue: baseline.value,
    scientificUnit: baseline.unit,
    regionLabel: `${latStr}, ${lonStr}`,
  };
}

export function drawScanheadOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scanMode: 'raster' | 'radial' | 'centroid' | 'probe',
  telemetry: FrameTelemetry,
  radialAngle: number
): void {
  const px = telemetry.cursorX * w;
  const py = telemetry.cursorY * h;
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();

  if (scanMode === 'raster') {
    // Vertical raster scanline + horizontal probe line
    const grad = ctx.createLinearGradient(px - 24, 0, px + 4, 0);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - 24, 0, 28, h);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  } else if (scanMode === 'radial') {
    const maxR = Math.min(w, h) * 0.44;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(radialAngle) * maxR, cy + Math.sin(radialAngle) * maxR);
    ctx.stroke();
  } else if (scanMode === 'centroid') {
    const centX = telemetry.centroidX * w;
    const centY = telemetry.centroidY * h;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(centX, centY, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Connect centroid to orbiting probe
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.beginPath();
    ctx.moveTo(centX, centY);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // Crosshair reticle at active sampling coordinate
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(px, py, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Crisp coordinate ticks
  const tick = 18;
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(px - tick, py);
  ctx.lineTo(px - 8, py);
  ctx.moveTo(px + 8, py);
  ctx.lineTo(px + tick, py);
  ctx.moveTo(px, py - tick);
  ctx.lineTo(px, py - 8);
  ctx.moveTo(px, py + 8);
  ctx.lineTo(px, py + tick);
  ctx.stroke();

  ctx.restore();
}
