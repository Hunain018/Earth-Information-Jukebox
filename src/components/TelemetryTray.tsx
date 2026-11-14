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
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let rafId = 0;

    const draw = () => {
      const waveCanvas = waveCanvasRef.current;
      const fftCanvas = fftCanvasRef.current;

      if (waveCanvas) {
        const ctx = waveCanvas.getContext('2d');
        if (ctx) {
          const w = waveCanvas.width;
          const h = waveCanvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#07090E';
          ctx.fillRect(0, 0, w, h);

          // Center axis line
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          if (analyser && isPlaying) {
            const bufferLen = analyser.fftSize;
            const data = new Uint8Array(bufferLen);
            analyser.getByteTimeDomainData(data);

            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            const slice = w / bufferLen;
            for (let i = 0; i < bufferLen; i++) {
              const v = data[i] / 128.0;
              const y = (v * h) / 2;
              if (i === 0) ctx.moveTo(0, y);
              else ctx.lineTo(i * slice, y);
            }
            ctx.stroke();
          } else {
            // Flat quiescent calibration line
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
          }
        }
      }

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
            const freqData = new Uint8Array(freqCount);
            analyser.getByteFrequencyData(freqData);

            // Display lower ~35% of spectrum where harmonic sonification lives
            const usableBins = Math.floor(freqCount * 0.35);
            const barWidth = w / usableBins;
            for (let i = 0; i < usableBins; i++) {
              const amp = freqData[i] / 255;
              const barH = amp * (h - 8);
              ctx.fillStyle = i < usableBins * 0.25 ? '#f59e0b' : '#06b6d4';
              ctx.fillRect(i * barWidth, h - barH, Math.max(1.5, barWidth - 1), barH);
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
      input: `${Math.round(telemetry.luminance * 100)}%`,
      acoustic: 'Quantized Pitch',
      output: `${telemetry.activePitchHz.toFixed(1)} Hz (${telemetry.activeNoteName})`,
    },
    {
      feature: 'Thermal R–B Ratio',
      input: `${telemetry.thermalIndex >= 0 ? '+' : ''}${telemetry.thermalIndex.toFixed(2)}`,
      acoustic: 'Lowpass Filter Cutoff',
      output: `${telemetry.filterCutoffHz} Hz`,
    },
    {
      feature: 'Spatial Edge Density',
      input: `${Math.round(telemetry.edgeDensity * 100)}%`,
      acoustic: 'Kinetic Bandpass Sweep',
      output: `${Math.round(320 + telemetry.edgeDensity * 2400)} Hz`,
    },
    {
      feature: 'Horizontal Position X',
      input: `${Math.round(telemetry.cursorX * 100)}%`,
      acoustic: 'Stereo Panorama',
      output: `${telemetry.stereoPan >= 0 ? 'R ' : 'L '}${Math.abs(Math.round(telemetry.stereoPan * 100))}%`,
    },
  ];

  return (
    <section
      id="mapping-logic-panel"
      aria-label="Acoustic telemetry and parameter mapping"
      className="border-t border-slate-800 bg-[#0B0F19] hc-panel px-6 py-5"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Live Oscilloscope + FFT Spectrum */}
        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md border border-slate-800 bg-[#07090E] p-3.5 hc-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Time-Domain Waveform
              </span>
              <span className="text-[11px] font-mono text-cyan-400 tabular-nums">
                {isPlaying ? 'Audio Active' : 'Standby'}
              </span>
            </div>
            <canvas
              ref={waveCanvasRef}
              width={360}
              height={96}
              aria-label="Real-time audio waveform oscilloscope"
              className="w-full h-24 rounded border border-slate-800/80"
            />
          </div>

          <div className="rounded-md border border-slate-800 bg-[#07090E] p-3.5 hc-panel">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">
                Harmonic FFT Spectrum
              </span>
              <span className="text-[11px] font-mono text-amber-400 tabular-nums">
                {settings.scale.replace('_', ' ')}
              </span>
            </div>
            <canvas
              ref={fftCanvasRef}
              width={360}
              height={96}
              aria-label="Real-time audio frequency spectrum"
              className="w-full h-24 rounded border border-slate-800/80"
            />
          </div>
        </div>

        {/* Parameter Mapping Sonification (PMS) Matrix */}
        <div className="xl:col-span-6 rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted">
              Parameter Mapping Sonification Matrix
            </h2>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {telemetry.regionLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 hc-muted">
                  <th className="py-1.5 pr-3 font-medium">Visual Feature</th>
                  <th className="py-1.5 pr-3 font-medium">CV Readout</th>
                  <th className="py-1.5 pr-3 font-medium">Acoustic Dimension</th>
                  <th className="py-1.5 font-medium text-right">DSP Output</th>
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
