import { useEffect, useRef } from 'react';
import { FrameTelemetry, SonificationSettings } from '../types/jukebox';

interface TelemetryTrayProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  telemetry: FrameTelemetry;
  settings: SonificationSettings;
}

export function TelemetryTray({
  analyser,
  isPlaying,
  telemetry,
  settings,
}: TelemetryTrayProps) {
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef  = useRef<HTMLCanvasElement | null>(null);

  // ✅ FIX 1: Uint8Array refs — har frame pe new allocation ki jagah reuse
  const waveDataRef = useRef<Uint8Array | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  // ✅ FIX 2: HiDPI canvas sizing — ResizeObserver se canvas buffer display size se match karta hai
  useEffect(() => {
    const canvases = [waveCanvasRef.current, fftCanvasRef.current].filter(Boolean) as HTMLCanvasElement[];

    const syncSize = (canvas: HTMLCanvasElement) => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = Math.round(window.devicePixelRatio || 1);
      const targetW = Math.round(width  * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width  = targetW;
        canvas.height = targetH;
      }
    };

    // Pehli baar sync karo
    canvases.forEach(syncSize);

    // Resize hone par bhi sync karo
    const observer = new ResizeObserver(() => canvases.forEach(syncSize));
    canvases.forEach((c) => observer.observe(c));

    return () => observer.disconnect();
  }, []);

  // Main 60fps draw loop
  useEffect(() => {
    let rafId = 0;

    const draw = () => {
      // ─── Waveform Oscilloscope ───────────────────────────────────────────
      const waveCanvas = waveCanvasRef.current;
      if (waveCanvas) {
        const ctx = waveCanvas.getContext('2d');
        if (ctx) {
          const w = waveCanvas.width;
          const h = waveCanvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#07090E';
          ctx.fillRect(0, 0, w, h);

          // Center axis
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          if (analyser && isPlaying) {
            const bufferLen = analyser.fftSize;

            // ✅ FIX 1a: Array reuse — size change hone par hi naya banao
            if (!waveDataRef.current || waveDataRef.current.length !== bufferLen) {
              waveDataRef.current = new Uint8Array(bufferLen);
            }
            analyser.getByteTimeDomainData(waveDataRef.current);

            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            const slice = w / bufferLen;
            for (let i = 0; i < bufferLen; i++) {
              // v: 0.0 (min) → 1.0 (silence) → 2.0 (max)
              // y: 0 (top) → h/2 (center, silence) → h (bottom)
              const v = waveDataRef.current[i] / 128.0;
              const y = (v * h) / 2;
              if (i === 0) ctx.moveTo(0, y);
              else ctx.lineTo(i * slice, y);
            }
            ctx.stroke();
          } else {
            // Quiescent flat calibration line
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
          }
        }
      }

      // ─── FFT Spectrum ────────────────────────────────────────────────────
      const fftCanvas = fftCanvasRef.current;
      if (fftCanvas) {
        const ctx = fftCanvas.getContext('2d');
        if (ctx) {
          const w = fftCanvas.width;
          const h = fftCanvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#07090E';
          ctx.fillRect(0, 0, w, h);

          if (analyser && isPlaying) {
            const freqCount = analyser.frequencyBinCount;

            // ✅ FIX 1b: Array reuse — har frame naya nahi
            if (!freqDataRef.current || freqDataRef.current.length !== freqCount) {
              freqDataRef.current = new Uint8Array(freqCount);
            }
            analyser.getByteFrequencyData(freqDataRef.current);

            // Lower ~35% of spectrum where harmonic sonification lives
            const usableBins = Math.floor(freqCount * 0.35);
            const barWidth = w / usableBins;
            for (let i = 0; i < usableBins; i++) {
              const amp  = freqDataRef.current[i] / 255;
              const barH = amp * (h - 8);
              ctx.fillStyle = i < usableBins * 0.25 ? '#f59e0b' : '#06b6d4';
              ctx.fillRect(
                i * barWidth,
                h - barH,
                Math.max(1.5, barWidth - 1),
                barH
              );
            }
          } else {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
            ctx.beginPath();
            ctx.moveTo(0, h - 4);
            ctx.lineTo(w, h - 4);
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [analyser, isPlaying]);

  const mappingRows = [
    {
      feature: 'Pixel Luminance',
      input:   `${Math.round(telemetry.luminance * 100)}%`,
      acoustic: 'Quantized Pitch',
      output:  `${telemetry.activePitchHz.toFixed(1)} Hz (${telemetry.activeNoteName})`,
    },
    {
      feature: 'Thermal R–B Ratio',
      input:   `${telemetry.thermalIndex >= 0 ? '+' : ''}${telemetry.thermalIndex.toFixed(2)}`,
      acoustic: 'Lowpass Filter Cutoff',
      output:  `${telemetry.filterCutoffHz} Hz`,
    },
    {
      feature: 'Spatial Edge Density',
      input:   `${Math.round(telemetry.edgeDensity * 100)}%`,
      acoustic: 'Kinetic Bandpass Sweep',
      output:  `${Math.round(320 + telemetry.edgeDensity * 2400)} Hz`,
    },
    {
      feature: 'Horizontal Position X',
      input:   `${Math.round(telemetry.cursorX * 100)}%`,
      acoustic: 'Stereo Panorama',
      output:  `${telemetry.stereoPan >= 0 ? 'R ' : 'L '}${Math.abs(Math.round(telemetry.stereoPan * 100))}%`,
    },
  ];

  return (
    <section
      id="mapping-logic-panel"
      aria-labelledby="telemetry-heading"
      className="border-t border-slate-800 bg-[#0B0F19] hc-panel px-6 py-5"
    >
      {/* Screen-reader only heading for the section */}
      <h2 id="telemetry-heading" className="sr-only">
        Acoustic telemetry and parameter mapping
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Live Oscilloscope + FFT Spectrum */}
        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md border border-slate-800 bg-[#07090E] p-3.5 hc-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Time-Domain Waveform
              </span>
              <span className="text-[11px] font-mono text-cyan-400 tabular-nums" aria-hidden="true">
                {isPlaying ? 'Audio Active' : 'Standby'}
              </span>
            </div>
            {/* ✅ FIX 4a: role="img" add kiya — screen readers aria-label properly read karengi */}
            <canvas
              ref={waveCanvasRef}
              role="img"
              aria-label={
                isPlaying
                  ? 'Live audio waveform oscilloscope — audio is active'
                  : 'Audio waveform oscilloscope — standby'
              }
              className="w-full h-24 rounded border border-slate-800/80 block"
            />
          </div>

          <div className="rounded-md border border-slate-800 bg-[#07090E] p-3.5 hc-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Harmonic FFT Spectrum
              </span>
              {/* ✅ FIX 3: replaceAll — har underscore replace hoga, sirf pehla nahi */}
              <span className="text-[11px] font-mono text-amber-400 tabular-nums" aria-hidden="true">
                {settings.scale.replaceAll('_', ' ')}
              </span>
            </div>
            {/* ✅ FIX 4a: role="img" */}
            <canvas
              ref={fftCanvasRef}
              role="img"
              aria-label={
                isPlaying
                  ? `Harmonic frequency spectrum — scale: ${settings.scale.replaceAll('_', ' ')}`
                  : 'Frequency spectrum — standby'
              }
              className="w-full h-24 rounded border border-slate-800/80 block"
            />
          </div>
        </div>

        {/* Parameter Mapping Sonification (PMS) Matrix */}
        <div className="xl:col-span-6 rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted">
              Parameter Mapping Sonification Matrix
            </h3>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums" aria-hidden="true">
              {telemetry.regionLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* ✅ FIX 4c: caption — screen readers ko table ka context milta hai */}
              <caption className="sr-only">
                Live parameter mapping: visual feature inputs to acoustic DSP outputs
                at coordinate {telemetry.regionLabel}
              </caption>
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 hc-muted">
                  {/* ✅ FIX 4b: scope="col" — screen readers cells ko headers se properly associate karein */}
                  <th scope="col" className="py-1.5 pr-3 font-medium">Visual Feature</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">CV Readout</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Acoustic Dimension</th>
                  <th scope="col" className="py-1.5 font-medium text-right">DSP Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {mappingRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-1.5 pr-3 text-slate-200 whitespace-nowrap">{row.feature}</td>
                    <td className="py-1.5 pr-3 font-mono text-cyan-300 tabular-nums whitespace-nowrap">
                      {row.input}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-400 hc-muted whitespace-nowrap">
                      {row.acoustic}
                    </td>
                    <td className="py-1.5 font-mono text-amber-300 tabular-nums text-right whitespace-nowrap">
                      {row.output}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
