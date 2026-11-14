import { useCallback, useEffect, useRef, useState } from 'react';
import { EIC_TRACKS, DEFAULT_LAYERS } from './data/eicTracks';
import {
  EicTrack,
  FrameTelemetry,
  LayerId,
  MusicalScaleId,
  RootNote,
  ScanMode,
  SonificationSettings,
} from './types/jukebox';
import { EarthSonificationEngine } from './audio/sonificationEngine';
import {
  analyzeFrameAtCursor,
  drawScanheadOverlay,
  findIntensityCentroid,
  renderEicSourceFrame,
} from './vision/frameRenderer';
import { TopBar } from './components/TopBar';
import { CalibrationPanel } from './components/CalibrationPanel';
import { CanvasStage } from './components/CanvasStage';
import { TelemetryTray } from './components/TelemetryTray';
import { GuideModal } from './components/GuideModal';

const CANVAS_W = 920;
const CANVAS_H = 440;

const INITIAL_TELEMETRY: FrameTelemetry = {
  cursorX: 0.5,
  cursorY: 0.5,
  luminance: 0.42,
  red: 0.48,
  green: 0.38,
  blue: 0.52,
  thermalIndex: 0.05,
  edgeDensity: 0.24,
  centroidX: 0.5,
  centroidY: 0.5,
  activePitchHz: 261.63,
  activeNoteName: 'C4',
  filterCutoffHz: 1120,
  stereoPan: 0,
  scientificValue: '+1.28',
  scientificUnit: '°C',
  regionLabel: '0°N, 0°E',
};

export default function App() {
  const [activeTrack, setActiveTrack] = useState<EicTrack>(EIC_TRACKS[0]);
  const [year, setYear] = useState<number>(EIC_TRACKS[0].defaultYear);
  const [isTimeLapsing, setIsTimeLapsing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'jukebox' | 'mapping' | 'accessibility' | 'guide'>('jukebox');
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const [customImageName, setCustomImageName] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<FrameTelemetry>(INITIAL_TELEMETRY);

  const [settings, setSettings] = useState<SonificationSettings>({
    scanMode: EIC_TRACKS[0].recommendedScanMode,
    scale: EIC_TRACKS[0].recommendedScale,
    rootNote: 'C',
    tempoBpm: 90,
    masterVolume: 0.78,
    layers: DEFAULT_LAYERS,
  });

  const engineRef = useRef<EarthSonificationEngine | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customImageRef = useRef<HTMLImageElement | null>(null);

  const probePosRef = useRef({ x: 0.5, y: 0.45 });
  const isPointerDraggingRef = useRef(false);
  const scanProgressRef = useRef(0);
  const centroidRef = useRef({ cx: 0.5, cy: 0.5 });
  const lastUiSyncRef = useRef(0);

  // Latest state refs for 60fps requestAnimationFrame access
  const stateRef = useRef({
    activeTrack,
    year,
    isPlaying,
    settings,
  });
  stateRef.current = { activeTrack, year, isPlaying, settings };

  useEffect(() => {
    const engine = new EarthSonificationEngine();
    engineRef.current = engine;

    const source = document.createElement('canvas');
    source.width = CANVAS_W;
    source.height = CANVAS_H;
    sourceCanvasRef.current = source;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      engine.dispose();
    };
  }, []);

  const announce = useCallback((message: string) => {
    setAriaAnnouncement(message);
  }, []);

  const handleTogglePlay = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (stateRef.current.isPlaying) {
      await engine.pause();
      setIsPlaying(false);
      announce('Sonification paused.');
    } else {
      await engine.start();
      setIsPlaying(true);
      announce(`Playing sonification for ${stateRef.current.activeTrack.title}.`);
    }
  }, [announce]);

  const handleSelectTrack = useCallback(
    (track: EicTrack) => {
      setActiveTrack(track);
      setYear(track.defaultYear);
      setIsTimeLapsing(false);
      setSettings((prev) => ({
        ...prev,
        scanMode: track.recommendedScanMode,
        scale: track.recommendedScale,
      }));
      announce(`Selected track ${track.index}: ${track.title}.`);
    },
    [announce]
  );

  const handleUploadCustomImage = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        customImageRef.current = img;
        setCustomImageName(file.name);
        const customTrack = EIC_TRACKS.find((t) => t.kind === 'custom');
        if (customTrack) {
          setActiveTrack(customTrack);
          setYear(customTrack.defaultYear);
        }
        announce(`Loaded custom visual frame ${file.name} for sonification.`);
      };
      img.src = url;
    },
    [announce]
  );

  // Time-lapse year progression
  useEffect(() => {
    if (!isTimeLapsing) return;
    const span = activeTrack.yearMax - activeTrack.yearMin;
    if (span <= 0) return;

    const intervalMs = Math.max(120, Math.round(1800 / Math.min(20, span)));
    const timer = window.setInterval(() => {
      setYear((prev) => (prev >= activeTrack.yearMax ? activeTrack.yearMin : prev + 1));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isTimeLapsing, activeTrack]);

  // Main 60fps CV + Canvas Render + Audio DSP Loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const { activeTrack: trk, year: yr, isPlaying: playing, settings: cfg } = stateRef.current;
      const sourceCanvas = sourceCanvasRef.current;
      const displayCanvas = displayCanvasRef.current;

      if (sourceCanvas && displayCanvas) {
        const sCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const dCtx = displayCanvas.getContext('2d');

        if (sCtx && dCtx) {
          const phase = now * 0.001;
          renderEicSourceFrame(sCtx, CANVAS_W, CANVAS_H, trk, yr, phase, customImageRef.current);

          // Advance spatial scan trajectory when playing or animating
          const speedCyclesPerSec = (cfg.tempoBpm / 90) * 0.12;
          if (playing) {
            scanProgressRef.current = (scanProgressRef.current + dt * speedCyclesPerSec) % 1;
          }

          // Recompute centroid occasionally (~6 Hz)
          if (Math.floor(now / 160) !== Math.floor((now - dt * 1000) / 160)) {
            centroidRef.current = findIntensityCentroid(sCtx, CANVAS_W, CANVAS_H);
          }

          let cursorX = probePosRef.current.x;
          let cursorY = probePosRef.current.y;
          const radialAngle = scanProgressRef.current * Math.PI * 2 - Math.PI / 2;

          if (!isPointerDraggingRef.current && cfg.scanMode !== 'probe') {
            if (cfg.scanMode === 'raster') {
              cursorX = scanProgressRef.current;
              cursorY = 0.5 + Math.sin(scanProgressRef.current * Math.PI * 6) * 0.28;
            } else if (cfg.scanMode === 'radial') {
              const rNorm = 0.26 + Math.sin(scanProgressRef.current * Math.PI * 4) * 0.08;
              cursorX = 0.5 + Math.cos(radialAngle) * rNorm;
              cursorY = 0.5 + Math.sin(radialAngle) * rNorm * (CANVAS_W / CANVAS_H) * 0.55;
            } else if (cfg.scanMode === 'centroid') {
              const orbitR = 0.08;
              cursorX = centroidRef.current.cx + Math.cos(radialAngle * 2) * orbitR;
              cursorY = centroidRef.current.cy + Math.sin(radialAngle * 2) * orbitR;
            }
          }

          const frameTel = analyzeFrameAtCursor(
            sCtx,
            CANVAS_W,
            CANVAS_H,
            cursorX,
            cursorY,
            trk,
            yr,
            cfg.scale,
            cfg.rootNote,
            centroidRef.current
          );

          // Copy clean EIC source frame to display canvas, then render scanhead HUD
          dCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
          dCtx.drawImage(sourceCanvas, 0, 0);
          drawScanheadOverlay(dCtx, CANVAS_W, CANVAS_H, cfg.scanMode, frameTel, radialAngle);

          // Update Web Audio API DSP nodes at full frame rate
          engineRef.current?.update(frameTel, cfg, playing);

          // Throttle React UI state sync (~15fps)
          if (now - lastUiSyncRef.current > 66) {
            setTelemetry(frameTel);
            lastUiSyncRef.current = now;
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleSpeakDescription = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      announce('Speech synthesis is unavailable in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const liveSummary = `${activeTrack.accessibilityScript} Currently viewing year ${year}, active coordinate ${telemetry.regionLabel}, reading ${telemetry.scientificValue} ${telemetry.scientificUnit}, mapped to ${telemetry.activeNoteName} at ${Math.round(telemetry.activePitchHz)} Hertz.`;
    const utterance = new SpeechSynthesisUtterance(liveSummary);
    utterance.rate = 0.98;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [activeTrack, year, telemetry, isSpeaking, announce]);

  const handleExportWav = useCallback(async () => {
    const engine = engineRef.current;
    const sCanvas = sourceCanvasRef.current;
    if (!engine || !sCanvas || isExporting) return;

    const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
    if (!sCtx) return;

    setIsExporting(true);
    announce(`Rendering 10-second WAV sonification for ${activeTrack.title}.`);

    try {
      renderEicSourceFrame(sCtx, CANVAS_W, CANVAS_H, activeTrack, year, 0, customImageRef.current);
      const centroid = findIntensityCentroid(sCtx, CANVAS_W, CANVAS_H);

      const blob = await engine.renderWavBlob(
        10,
        (progress) => {
          let cx = probePosRef.current.x;
          let cy = probePosRef.current.y;
          const ang = progress * Math.PI * 2 - Math.PI / 2;

          if (settings.scanMode === 'raster') {
            cx = progress;
            cy = 0.5 + Math.sin(progress * Math.PI * 6) * 0.28;
          } else if (settings.scanMode === 'radial') {
            const rNorm = 0.26;
            cx = 0.5 + Math.cos(ang) * rNorm;
            cy = 0.5 + Math.sin(ang) * rNorm * (CANVAS_W / CANVAS_H) * 0.55;
          } else if (settings.scanMode === 'centroid') {
            cx = centroid.cx + Math.cos(ang * 2) * 0.08;
            cy = centroid.cy + Math.sin(ang * 2) * 0.08;
          }

          return analyzeFrameAtCursor(
            sCtx,
            CANVAS_W,
            CANVAS_H,
            cx,
            cy,
            activeTrack,
            year,
            settings.scale,
            settings.rootNote,
            centroid
          );
        },
        settings
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earth-jukebox-${activeTrack.id}-${year}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      announce('WAV sonification export complete.');
    } finally {
      setIsExporting(false);
    }
  }, [activeTrack, year, settings, isExporting, announce]);

  // Global keyboard shortcuts for full accessibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        void handleTogglePlay();
      } else if (e.key >= '1' && e.key <= '6') {
        const idx = Number(e.key) - 1;
        if (EIC_TRACKS[idx]) handleSelectTrack(EIC_TRACKS[idx]);
      } else if (e.key.toLowerCase() === 's') {
        const modes: ScanMode[] = ['raster', 'radial', 'centroid', 'probe'];
        setSettings((prev) => {
          const next = modes[(modes.indexOf(prev.scanMode) + 1) % modes.length];
          announce(`Scan mode changed to ${next}.`);
          return { ...prev, scanMode: next };
        });
      } else if (e.key.toLowerCase() === 'a') {
        handleSpeakDescription();
      } else if (e.key.toLowerCase() === 'm') {
        setSettings((prev) => ({
          ...prev,
          masterVolume: prev.masterVolume > 0 ? 0 : 0.78,
        }));
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown'
      ) {
        e.preventDefault();
        const step = 0.035;
        setSettings((prev) => (prev.scanMode === 'probe' ? prev : { ...prev, scanMode: 'probe' }));
        if (e.key === 'ArrowLeft') probePosRef.current.x = Math.max(0.02, probePosRef.current.x - step);
        if (e.key === 'ArrowRight') probePosRef.current.x = Math.min(0.98, probePosRef.current.x + step);
        if (e.key === 'ArrowUp') probePosRef.current.y = Math.max(0.02, probePosRef.current.y - step);
        if (e.key === 'ArrowDown') probePosRef.current.y = Math.min(0.98, probePosRef.current.y + step);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleSelectTrack, handleSpeakDescription, announce]);

  const handleNavSection = (section: 'jukebox' | 'mapping' | 'accessibility' | 'guide') => {
    setActiveSection(section);
    if (section === 'guide') {
      setGuideOpen(true);
      return;
    }
    const targetId =
      section === 'jukebox'
        ? 'jukebox-stage'
        : section === 'mapping'
        ? 'mapping-logic-panel'
        : 'accessibility-panel';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#07090E] text-slate-100 ${
        highContrast ? 'high-contrast' : ''
      }`}
    >
      {/* Screen-Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <TopBar
        activeSection={activeSection}
        onSelectSection={handleNavSection}
        onExportWav={() => void handleExportWav()}
        isExporting={isExporting}
      />

      {/* Asymmetric Split Instrument Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto border-x border-slate-800/80">
        <CalibrationPanel
          settings={settings}
          onChangeScanMode={(scanMode) => {
            setSettings((prev) => ({ ...prev, scanMode }));
            announce(`Spatial scan mode set to ${scanMode}.`);
          }}
          onChangeScale={(scale: MusicalScaleId) => setSettings((prev) => ({ ...prev, scale }))}
          onChangeRoot={(rootNote: RootNote) => setSettings((prev) => ({ ...prev, rootNote }))}
          onChangeTempo={(tempoBpm) => setSettings((prev) => ({ ...prev, tempoBpm }))}
          onChangeMasterVolume={(masterVolume) =>
            setSettings((prev) => ({ ...prev, masterVolume }))
          }
          onUpdateLayerGain={(id: LayerId, gain: number) =>
            setSettings((prev) => ({
              ...prev,
              layers: {
                ...prev.layers,
                [id]: { ...prev.layers[id], gain },
              },
            }))
          }
          onToggleLayerMute={(id: LayerId) =>
            setSettings((prev) => ({
              ...prev,
              layers: {
                ...prev.layers,
                [id]: { ...prev.layers[id], muted: !prev.layers[id].muted },
              },
            }))
          }
          onToggleLayerSolo={(id: LayerId) =>
            setSettings((prev) => ({
              ...prev,
              layers: {
                ...prev.layers,
                [id]: { ...prev.layers[id], solo: !prev.layers[id].solo },
              },
            }))
          }
          onSpeakDescription={handleSpeakDescription}
          isSpeaking={isSpeaking}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          onOpenShortcuts={() => setGuideOpen(true)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <CanvasStage
            tracks={EIC_TRACKS}
            activeTrack={activeTrack}
            onSelectTrack={handleSelectTrack}
            year={year}
            onChangeYear={setYear}
            isTimeLapsing={isTimeLapsing}
            onToggleTimeLapse={() => setIsTimeLapsing((v) => !v)}
            isPlaying={isPlaying}
            onTogglePlay={() => void handleTogglePlay()}
            scanMode={settings.scanMode}
            telemetry={telemetry}
            displayCanvasRef={displayCanvasRef}
            onCanvasPointerDown={(nx, ny) => {
              isPointerDraggingRef.current = true;
              probePosRef.current = { x: nx, y: ny };
              setSettings((prev) =>
                prev.scanMode === 'probe' ? prev : { ...prev, scanMode: 'probe' }
              );
            }}
            onCanvasPointerMove={(nx, ny) => {
              if (!isPointerDraggingRef.current) return;
              probePosRef.current = { x: nx, y: ny };
            }}
            onCanvasPointerUp={() => {
              isPointerDraggingRef.current = false;
            }}
            onUploadCustomImage={handleUploadCustomImage}
            customImageName={customImageName}
          />

          <TelemetryTray
            analyser={engineRef.current?.getAnalyser() ?? null}
            isPlaying={isPlaying}
            telemetry={telemetry}
            settings={settings}
          />
        </div>
      </div>

      {/* Minimal Quiet Footer */}
      <footer className="border-t border-slate-800 bg-[#07090E] hc-panel px-6 py-3">
        <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 hc-muted">
          <span>
            NASA Space Apps Challenge #14 · Earth Information Jukebox · Web Audio DSP & Computer Vision
          </span>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="text-slate-300 hover:text-cyan-400 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            Sonification Methodology & Keyboard Shortcuts
          </button>
        </div>
      </footer>

      <GuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
