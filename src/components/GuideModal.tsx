import { useEffect } from 'react';
import { X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const METHODOLOGY_ITEMS = [
  {
    title: '01. Data Mapping Logic',
    body: 'Pixel color attributes (RGB channels, relative luminance, and warm-to-cool thermal ratios) are extracted from an isolated offscreen canvas matrix and scaled mathematically into fundamental oscillator pitch, lowpass filter cutoff (280–3180 Hz), and stereo panorama without producing unscaled static noise.',
  },
  {
    title: '02. Spatial Scanning Strategy',
    body: 'Supports four distinct spatial trajectories: Left-to-Right Raster Sweep for global longitudinal projections, 360° Radial Sweep for polar ice and sea-level contributor rings, Centroid Lock to orbit peak anomaly clusters, and Manual Probe for direct coordinate inspection.',
  },
  {
    title: '03. Harmonic Quantization',
    body: 'Continuous luminance telemetry is constrained to selectable musical scales (Minor Pentatonic, Dorian, Lydian, Major Pentatonic) or toggled to Unquantized Continuous mode so listeners can compare musical consonance against raw microtonal data fidelity.',
  },
  {
    title: '04. Performance Optimization',
    body: 'Frame pixel sampling operates over localized 20×20 neighborhood kernels on a 60fps requestAnimationFrame loop while audio DSP nodes run natively on the browser Web Audio thread via smooth setTargetAtTime exponential ramps, avoiding main-thread stuttering.',
  },
  {
    title: '05. Universal Accessibility',
    body: 'Engineered to WCAG 2.2 AA standards with full keyboard transport and directional probe navigation, ARIA live data announcements, spoken Web Speech API audio descriptions, and a dedicated High Contrast display toggle.',
  },
  {
    title: '06. Multi-Layer Data Handling',
    body: 'Separates environmental signals into four distinct timbres with independent Mute, Solo, and Gain controls: Thermal Harmonic Pad (detuned analog), Cryo & Hydro Chimes (FM bell), Atmospheric Kinetic Pulse (filtered pink noise), and Planetary Sub-Bass Drone.',
  },
];

const SHORTCUTS = [
  { key: 'Space', action: 'Play or pause real-time sonification' },
  { key: 'Arrow Keys', action: 'Move manual probe cursor across the EIC frame' },
  { key: '1 – 6', action: 'Switch between NASA EIC visual datasets' },
  { key: 'S', action: 'Cycle spatial scanning mode (Raster, Radial, Centroid, Probe)' },
  { key: 'A', action: 'Speak or stop accessible audio description' },
  { key: 'M', action: 'Toggle master mute' },
  { key: 'Escape', action: 'Close open modal dialogs' },
];

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-700 bg-[#0B0F19] p-6 text-slate-100 hc-panel">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <p className="text-xs font-mono text-cyan-400 mb-1">
              NASA International Space Apps Challenge · Challenge #14
            </p>
            <h2 id="guide-modal-title" className="text-xl font-semibold text-slate-50">
              Sonification Architecture & Accessibility Guide
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close guide"
            onClick={onClose}
            className="rounded-md border border-slate-700 p-2 text-slate-300 hover:text-white hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {METHODOLOGY_ITEMS.map((item) => (
            <div key={item.title} className="rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel">
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-300 hc-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Keyboard Navigation Reference
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 py-1 border-b border-slate-800/60">
                <span className="text-slate-300">{s.action}</span>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-300 shrink-0">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
