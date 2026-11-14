export type ScanMode = 'raster' | 'radial' | 'centroid' | 'probe';

export type MusicalScaleId =
  | 'minor_pentatonic'
  | 'dorian'
  | 'lydian'
  | 'major_pentatonic'
  | 'continuous';

export type RootNote = 'C' | 'D' | 'Eb' | 'F' | 'G' | 'A';

export type LayerId = 'thermal' | 'hydro' | 'kinetic' | 'baseline';

export type EicTrackKind =
  | 'temperature'
  | 'sealevel'
  | 'seaice'
  | 'currents'
  | 'emissions'
  | 'custom';

export interface LayerState {
  id: LayerId;
  name: string;
  timbre: string;
  dataBinding: string;
  gain: number;
  muted: boolean;
  solo: boolean;
}

export interface ColorLegendStop {
  color: string;
  label: string;
}

export interface EicTrack {
  id: string;
  index: number;
  kind: EicTrackKind;
  title: string;
  missionSource: string;
  datasetCode: string;
  yearMin: number;
  yearMax: number;
  defaultYear: number;
  metricLabel: string;
  metricUnit: string;
  summary: string;
  accessibilityScript: string;
  recommendedScanMode: ScanMode;
  recommendedScale: MusicalScaleId;
  legendMinLabel: string;
  legendMaxLabel: string;
  legendStops: ColorLegendStop[];
}

export interface FrameTelemetry {
  cursorX: number;
  cursorY: number;
  luminance: number;
  red: number;
  green: number;
  blue: number;
  thermalIndex: number;
  edgeDensity: number;
  centroidX: number;
  centroidY: number;
  activePitchHz: number;
  activeNoteName: string;
  filterCutoffHz: number;
  stereoPan: number;
  scientificValue: string;
  scientificUnit: string;
  regionLabel: string;
}

export interface SonificationSettings {
  scanMode: ScanMode;
  scale: MusicalScaleId;
  rootNote: RootNote;
  tempoBpm: number;
  masterVolume: number;
  layers: Record<LayerId, LayerState>;
}
