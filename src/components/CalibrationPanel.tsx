import { Volume2, VolumeX, Eye, Keyboard } from 'lucide-react';
import {
  LayerId,
  MusicalScaleId,
  RootNote,
  ScanMode,
  SonificationSettings,
} from '../types/jukebox';
import { SCALE_DEFINITIONS } from '../audio/scales';

interface CalibrationPanelProps {
  settings: SonificationSettings;
  onChangeScanMode: (mode: ScanMode) => void;
  onChangeScale: (scale: MusicalScaleId) => void;
  onChangeRoot: (root: RootNote) => void;
  onChangeTempo: (bpm: number) => void;
  onChangeMasterVolume: (vol: number) => void;
  onUpdateLayerGain: (id: LayerId, gain: number) => void;
  onToggleLayerMute: (id: LayerId) => void;
  onToggleLayerSolo: (id: LayerId) => void;
  onSpeakDescription: () => void;
  isSpeaking: boolean;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onOpenShortcuts: () => void;
}

const SCAN_MODES: Array<{ id: ScanMode; label: string; hint: string }> = [
  { id: 'raster', label: 'Raster Sweep', hint: 'Left-to-right spatial column scan' },
  { id: 'radial', label: 'Radial Sweep', hint: '360° polar rotation from center' },
  { id: 'centroid', label: 'Centroid Lock', hint: 'Orbits peak anomaly intensity cluster' },
  { id: 'probe', label: 'Manual Probe', hint: 'Cursor or arrow-key coordinate inspection' },
];

const ROOT_NOTES: RootNote[] = ['C', 'D', 'Eb', 'F', 'G', 'A'];

export function CalibrationPanel({
  settings,
  onChangeScanMode,
  onChangeScale,
  onChangeRoot,
  onChangeTempo,
  onChangeMasterVolume,
  onUpdateLayerGain,
  onToggleLayerMute,
  onToggleLayerSolo,
  onSpeakDescription,
  isSpeaking,
  highContrast,
  onToggleHighContrast,
  onOpenShortcuts,
}: CalibrationPanelProps) {
  const layerOrder: LayerId[] = ['thermal', 'hydro', 'kinetic', 'baseline'];

  return (
    <aside
      aria-label="Sonification calibration controls"
      className="w-full lg:w-[350px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0B0F19] hc-panel flex flex-col"
    >
      {/* Spatial Scanning Strategy */}
      <section className="p-5 border-b border-slate-800/90">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted">
            Spatial Scanning Strategy
          </h2>
          <span className="text-xs font-mono text-cyan-400 tabular-nums">
            {SCAN_MODES.find((m) => m.id === settings.scanMode)?.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#07090E] border border-slate-800">
          {SCAN_MODES.map((mode) => {
            const active = settings.scanMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeScanMode(mode.id)}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs text-slate-400 hc-muted leading-relaxed">
          {SCAN_MODES.find((m) => m.id === settings.scanMode)?.hint}
        </p>
      </section>

      {/* Harmonic Quantization & Tempo */}
      <section className="p-5 border-b border-slate-800/90 space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted">
            Harmonic Quantization
          </h2>
          <span className="text-xs font-mono text-amber-400 tabular-nums">
            Root {settings.rootNote}
          </span>
        </div>

        <div>
          <label htmlFor="scale-select" className="block text-xs text-slate-300 mb-1.5">
            Musical Scale Constraint
          </label>
          <select
            id="scale-select"
            value={settings.scale}
            onChange={(e) => onChangeScale(e.target.value as MusicalScaleId)}
            className="w-full rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {(Object.keys(SCALE_DEFINITIONS) as MusicalScaleId[]).map((id) => (
              <option key={id} value={id}>
                {SCALE_DEFINITIONS[id].label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400 hc-muted leading-snug">
            {SCALE_DEFINITIONS[settings.scale].description}
          </p>
        </div>

        <div>
          <span className="block text-xs text-slate-300 mb-1.5">Harmonic Root Key</span>
          <div className="grid grid-cols-6 gap-1">
            {ROOT_NOTES.map((note) => {
              const active = settings.rootNote === note;
              return (
                <button
                  key={note}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChangeRoot(note)}
                  className={`py-1.5 rounded text-xs font-mono font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'bg-[#07090E] text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {note}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <label htmlFor="tempo-slider" className="text-slate-300">
                Scan Tempo
              </label>
              <span className="font-mono text-slate-200 tabular-nums">{settings.tempoBpm} BPM</span>
            </div>
            <input
              id="tempo-slider"
              type="range"
              min={45}
              max={150}
              step={5}
              value={settings.tempoBpm}
              onChange={(e) => onChangeTempo(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <label htmlFor="master-vol-slider" className="text-slate-300">
                Master Gain
              </label>
              <span className="font-mono text-slate-200 tabular-nums">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              id="master-vol-slider"
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={settings.masterVolume}
              onChange={(e) => onChangeMasterVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Multi-Layer Data Timbre Mixer */}
      <section className="p-5 border-b border-slate-800/90 space-y-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted">
          Multi-Layer Acoustic Mixer
        </h2>

        <div className="space-y-3">
          {layerOrder.map((id) => {
            const layer = settings.layers[id];
            return (
              <div
                key={id}
                className="rounded-md border border-slate-800/90 bg-[#07090E] p-3 hc-panel"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-100 truncate">
                    {layer.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Mute ${layer.name}`}
                      aria-pressed={layer.muted}
                      onClick={() => onToggleLayerMute(id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                        layer.muted
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      aria-label={`Solo ${layer.name}`}
                      aria-pressed={layer.solo}
                      onClick={() => onToggleLayerSolo(id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                        layer.solo
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      S
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 hc-muted mb-2">{layer.dataBinding}</p>

                <div className="flex items-center gap-3">
                  <input
                    aria-label={`${layer.name} gain`}
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={layer.gain}
                    onChange={(e) => onUpdateLayerGain(id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-9 text-right text-[11px] font-mono text-slate-300 tabular-nums">
                    {Math.round(layer.gain * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Universal Accessibility Controls */}
      <section id="accessibility-panel" className="p-5 space-y-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 hc-muted mb-2">
          Universal Accessibility
        </h2>

        <button
          type="button"
          onClick={onSpeakDescription}
          className={`w-full flex items-center justify-center gap-2 rounded-md border px-3.5 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
            isSpeaking
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
              : 'border-slate-700 bg-[#07090E] text-slate-200 hover:border-slate-500'
          }`}
        >
          {isSpeaking ? (
            <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{isSpeaking ? 'Stop Audio Description' : 'Speak Audio Description (A)'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={highContrast}
            onClick={onToggleHighContrast}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              highContrast
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-700 bg-[#07090E] text-slate-300 hover:border-slate-500'
            }`}
          >
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>High Contrast</span>
          </button>

          <button
            type="button"
            onClick={onOpenShortcuts}
            className="flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-[#07090E] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Keyboard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Shortcuts</span>
          </button>
        </div>
      </section>
    </aside>
  );
}
