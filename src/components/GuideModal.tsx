import { useEffect, useRef } from 'react';
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
  { key: 'Space',      action: 'Play or pause real-time sonification' },
  { key: 'Arrow Keys', action: 'Move manual probe cursor across the EIC frame' },
  { key: '1 – 6',     action: 'Switch between NASA EIC visual datasets' },
  { key: 'S',          action: 'Cycle spatial scanning mode (Raster, Radial, Centroid, Probe)' },
  { key: 'A',          action: 'Speak or stop accessible audio description' },
  { key: 'M',          action: 'Toggle master mute' },
  { key: 'Escape',     action: 'Close open modal dialogs' },
];

/** Modal ke andar tamam focusable elements ka list return karta hai */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ✅ FIX 2: Modal open hone pe focus andar move karo,
  //    aur close hone pe pehle wala focus restore karo
  useEffect(() => {
    if (!isOpen) return;

    // Jis element par focus tha use capture karo — closure mein store hoga
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Modal ke pehle focusable element par focus do
    const firstFocusable = getFocusableElements(modalRef.current!)[0];
    firstFocusable?.focus();

    // ✅ FIX 4: Body scroll lock — modal ke peechhe page scroll nahi karega
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      // Scroll restore
      document.body.style.overflow = originalOverflow;
      // ✅ FIX 2 cont: Modal band hone par pehla focus wapas do
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  // ✅ FIX 1: Focus trap + Escape handler — ek saath
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape se close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab cycling — focus modal se bahar nahi jaayega
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(modalRef.current!);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: agar pehle element par hain to last par jao
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: agar last element par hain to pehle par jao
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // ✅ FIX 3: Backdrop click se modal close — onClick on overlay div
    <div
      role="presentation"
      onClick={(e) => {
        // Sirf backdrop click pe close karo — modal content click ignore karo
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        aria-describedby="guide-modal-desc"
        // tabIndex taake modal khud bhi focusable ho (fallback)
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()} // ✅ Bubble rokna — content click se backdrop fire na ho
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-700 bg-[#0B0F19] p-6 text-slate-100 hc-panel focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div>
            <p
              id="guide-modal-desc"
              className="text-xs font-mono text-cyan-400 mb-1"
            >
              NASA International Space Apps Challenge · Challenge #14
            </p>
            <h2 id="guide-modal-title" className="text-xl font-semibold text-slate-50">
              Sonification Architecture &amp; Accessibility Guide
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
            <div
              key={item.title}
              className="rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel"
            >
              <h3 className="text-sm font-semibold text-slate-100 mb-1.5">{item.title}</h3>
              <p className="text-xs text-slate-300 hc-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-slate-800 bg-[#07090E] p-4 hc-panel">
          <h3
            id="shortcuts-heading"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3"
          >
            Keyboard Navigation Reference
          </h3>
          {/* ✅ role="list" for semantic shortcuts list */}
          <ul
            aria-labelledby="shortcuts-heading"
            className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs list-none m-0 p-0"
          >
            {SHORTCUTS.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 py-1 border-b border-slate-800/60"
              >
                <span className="text-slate-300">{s.action}</span>
                <kbd className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-cyan-300 shrink-0">
                  {s.key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
