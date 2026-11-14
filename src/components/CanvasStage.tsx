import React, { useRef } from 'react';
import { Play, Pause, Upload, Calendar, RotateCcw } from 'lucide-react';
import { EicTrack, FrameTelemetry, ScanMode } from '../types/jukebox';

interface CanvasStageProps {
  tracks: EicTrack[];
  activeTrack: EicTrack;
  onSelectTrack: (track: EicTrack) => void;
  year: number;
  onChangeYear: (year: number) => void;
  isTimeLapsing: boolean;
  onToggleTimeLapse: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  scanMode: ScanMode;
  telemetry: FrameTelemetry;
  displayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCanvasPointerDown: (normX: number, normY: number) => void;
  onCanvasPointerMove: (normX: number, normY: number) => void;
  onCanvasPointerUp: () => void;
  onUploadCustomImage: (file: File) => void;
  customImageName: string | null;
}

// ✅ FIX 1: Tab panel ka ID — tab buttons isko aria-controls se reference karenge
const PANEL_ID = 'eic-visual-panel';

export function CanvasStage({
  tracks,
  activeTrack,
  onSelectTrack,
  year,
  onChangeYear,
  isTimeLapsing,
  onToggleTimeLapse,
  isPlaying,
  onTogglePlay,
  scanMode,
  telemetry,
  displayCanvasRef,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onUploadCustomImage,
  customImageName,
}: CanvasStageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { nx, ny };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadCustomImage(file);
    }
  };

  return (
    <main id="jukebox-stage" className="flex-1 min-w-0 flex flex-col bg-[#07090E] hc-panel">
      {/* Jukebox Track Selector Strip */}
      <div
        role="tablist"
        aria-label="NASA Earth Information Center visualizations"
        className="border-b border-slate-800 bg-[#0B0F19] hc-panel px-5 py-2.5 flex items-center gap-2 overflow-x-auto"
      >
        {tracks.map((track) => {
          const active = track.id === activeTrack.id;
          return (
            <button
              key={track.id}
              role="tab"
              type="button"
              aria-selected={active}
              // ✅ FIX 1: aria-controls se tab panel se linked — WCAG 4.1.2
              aria-controls={PANEL_ID}
              id={`tab-${track.id}`}
              onClick={() => onSelectTrack(track)}
              className={`px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                active
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 border border-transparent hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              {/* ✅ FIX 4: padStart se "01." "10." — index size-safe */}
              <span className="font-mono text-slate-500 mr-1.5 tabular-nums">
                {String(track.index).padStart(2, '0')}.
              </span>
              {track.title}
            </button>
          );
        })}
      </div>

      {/* Active Track Header + Primary Transport & Metric Readout */}
      <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 hc-muted mb-1">
            <span>{activeTrack.missionSource}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{activeTrack.datasetCode}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {activeTrack.yearMin === activeTrack.yearMax
                ? activeTrack.yearMax
                : `${activeTrack.yearMin}–${activeTrack.yearMax}`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-50 tracking-tight text-balance">
            {activeTrack.title}
          </h1>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          {/* Primary Metric Readout */}
          <div className="text-right" aria-live="polite" aria-atomic="true">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 hc-muted">
              {activeTrack.metricLabel}
            </div>
            <div className="flex items-baseline justify-end">
              <span className="text-2xl font-mono font-semibold text-slate-50 tabular-nums">
                {activeTrack.kind === 'custom'
                  ? Math.round(telemetry.luminance * 100)
                  : telemetry.scientificValue}
              </span>
              <span className="text-xs font-mono uppercase text-slate-400 ml-1.5">
                {telemetry.scientificUnit}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label={isPlaying ? 'Pause sonification' : 'Play sonification'}
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-2.5 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            )}
            <span aria-hidden="true">{isPlaying ? 'Pause Audio' : 'Play Sonification'}</span>
          </button>
        </div>
      </div>

      {/* ✅ FIX 1: role="tabpanel" aur aria-labelledby — tab panel properly declared */}
      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={`tab-${activeTrack.id}`}
        className="p-6 flex-1 flex flex-col gap-4"
      >
        {/* Visual Canvas Viewport */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          aria-label="Visual frame viewport. Drag and drop an image here to load a custom frame."
          className="relative rounded-md border border-slate-800 bg-[#05070C] overflow-hidden hc-panel"
        >
          {/* Top-left coordinate HUD */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-3 rounded bg-[#07090E]/85 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-200 tabular-nums"
          >
            <span>{telemetry.regionLabel}</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300">{telemetry.activePitchHz.toFixed(1)} Hz</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300">{telemetry.activeNoteName}</span>
          </div>

          {/* Top-right RGB CV channels */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 z-10 hidden sm:flex items-center gap-3 rounded bg-[#07090E]/85 border border-slate-800 px-2.5 py-1 text-[11px] font-mono tabular-nums"
          >
            <span className="text-rose-400">R {Math.round(telemetry.red * 255)}</span>
            <span className="text-emerald-400">G {Math.round(telemetry.green * 255)}</span>
            <span className="text-sky-400">B {Math.round(telemetry.blue * 255)}</span>
            <span className="text-slate-300">Lum {Math.round(telemetry.luminance * 100)}%</span>
          </div>

          <canvas
            ref={displayCanvasRef}
            width={920}
            height={440}
            tabIndex={0}
            aria-label={`${activeTrack.title} interactive visual frame. Use arrow keys to move the sonification probe across the image.`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const { nx, ny } = getNormalizedCoords(e);
              onCanvasPointerDown(nx, ny);
            }}
            onPointerMove={(e) => {
              const { nx, ny } = getNormalizedCoords(e);
              onCanvasPointerMove(nx, ny);
            }}
            onPointerUp={(e) => {
              // ✅ FIX 3: pointer capture explicitly release karo
              e.currentTarget.releasePointerCapture(e.pointerId);
              onCanvasPointerUp();
            }}
            className="w-full aspect-[920/440] block cursor-crosshair focus-visible:outline-2 focus-visible:outline-cyan-400"
          />

          {/* Custom frame upload bar when Track 6 is active */}
          {activeTrack.kind === 'custom' && (
            <div className="border-t border-slate-800 bg-[#0B0F19] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-300">
                {customImageName
                  ? `Active frame: ${customImageName}`
                  : 'Drop an image onto the viewport or upload a NASA EIC frame.'}
              </span>
              <div className="flex items-center gap-2">
                {/* ✅ FIX 2: value reset kiya — same file dobara select ho sake */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadCustomImage(file);
                      e.target.value = ''; // ✅ reset so same file re-selectable hoti hai
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label="Upload a custom image frame for sonification"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload Image Frame</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Scrubber & Color Scale Legend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Temporal Scrubber */}
          <div className="lg:col-span-7 rounded-md border border-slate-800 bg-[#0B0F19] hc-panel px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Calendar className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-300">Observation Year</span>
              <span
                className="text-sm font-mono font-semibold text-slate-50 tabular-nums ml-1"
                aria-hidden="true"
              >
                {year}
              </span>
            </div>

            <input
              aria-label="Observation year timeline scrubber"
              aria-valuetext={`Year ${year}`}
              type="range"
              min={activeTrack.yearMin}
              max={activeTrack.yearMax}
              step={1}
              disabled={activeTrack.yearMin === activeTrack.yearMax}
              value={year}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className="flex-1 min-w-[140px] disabled:opacity-40"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={activeTrack.yearMin === activeTrack.yearMax}
                aria-pressed={isTimeLapsing}
                aria-label={isTimeLapsing ? 'Stop time-lapse animation' : 'Start time-lapse animation through years'}
                onClick={onToggleTimeLapse}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isTimeLapsing
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-[#07090E] border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span aria-hidden="true">
                  {isTimeLapsing ? 'Stop Time-Lapse' : 'Animate Years'}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Reset to default year ${activeTrack.defaultYear}`}
                onClick={() => onChangeYear(activeTrack.defaultYear)}
                className="p-1.5 rounded border border-slate-800 bg-[#07090E] text-slate-400 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Calibrated Pseudocolor Legend */}
          <div
            className="lg:col-span-5 rounded-md border border-slate-800 bg-[#0B0F19] hc-panel px-4 py-3"
            aria-label={`Color scale: ${activeTrack.legendMinLabel} to ${activeTrack.legendMaxLabel}`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5 tabular-nums">
              <span>{activeTrack.legendMinLabel}</span>
              <span className="text-slate-300 font-sans">
                Mode: {scanMode === 'probe' ? 'Interactive Probe' : `${scanMode} scan`}
              </span>
              <span>{activeTrack.legendMaxLabel}</span>
            </div>
            <div
              className="h-2 w-full rounded-sm overflow-hidden flex"
              aria-hidden="true"
            >
              {activeTrack.legendStops.map((stop, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-full"
                  style={{ backgroundColor: stop.color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scientific Context Caption */}
        <p className="text-sm text-slate-300 hc-muted leading-relaxed max-w-4xl">
          {activeTrack.summary}
        </p>
      </div>
    </main>
  );
}
