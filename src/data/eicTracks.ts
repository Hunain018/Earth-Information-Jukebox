import { EicTrack, LayerId, LayerState } from '../types/jukebox';

export const EIC_TRACKS: EicTrack[] = [
  {
    id: 'global-temp-anomaly',
    index: 1,
    kind: 'temperature',
    title: 'Global Surface Temperature Anomaly',
    missionSource: 'NASA GISS GISTEMP',
    datasetCode: 'EIC-TEMP-2025',
    yearMin: 1880,
    yearMax: 2025,
    defaultYear: 2024,
    metricLabel: 'Global Anomaly vs 1951–1980 Baseline',
    metricUnit: '°C',
    summary:
      'Spatial distribution of surface warming across continents and ocean basins. Warm amber and crimson zones elevate harmonic filter cutoff and pad pitch, while cooler polar basins anchor lower registers.',
    accessibilityScript:
      'Global Surface Temperature Anomaly from NASA Goddard Institute for Space Studies. The frame shows a global projection where deep blue represents negative temperature anomalies and bright red-amber highlights warming zones, peaking at plus 1.28 degrees Celsius in 2024 and plus 1.19 degrees Celsius in 2025. Higher temperatures raise harmonic brightness and pitch.',
    recommendedScanMode: 'raster',
    recommendedScale: 'dorian',
    legendMinLabel: '-2.0 °C',
    legendMaxLabel: '+3.0 °C',
    legendStops: [
      { color: '#1d4ed8', label: '-2.0 °C' },
      { color: '#38bdf8', label: '-0.5 °C' },
      { color: '#e2e8f0', label: '0.0 °C' },
      { color: '#f59e0b', label: '+1.5 °C' },
      { color: '#dc2626', label: '+3.0 °C' },
    ],
  },
  {
    id: 'sea-level-contributors',
    index: 2,
    kind: 'sealevel',
    title: 'Sea-Level Rise & Thermal Expansion',
    missionSource: 'NASA / JPL-Caltech Sentinel-6',
    datasetCode: 'EIC-SLR-2024',
    yearMin: 1993,
    yearMax: 2024,
    defaultYear: 2024,
    metricLabel: 'Cumulative Global Mean Sea Level',
    metricUnit: 'mm',
    summary:
      'Radial telemetry pairing the 2024 contributor ratio (two-thirds thermal expansion of warming seawater, one-third melting land ice) with coastal basin elevation gradients.',
    accessibilityScript:
      'Main Contributors to Sea-Level Rise from NASA JPL-Caltech satellite altimetry, 1993 to 2024. The concentric visual ring encodes two-thirds thermal expansion in ocean cyan and one-third land ice melt in glacial amber, totaling plus 101 millimeters of mean sea-level rise. Radial sweep rotates clockwise around the ring.',
    recommendedScanMode: 'radial',
    recommendedScale: 'lydian',
    legendMinLabel: '0 mm',
    legendMaxLabel: '+120 mm',
    legendStops: [
      { color: '#0f172a', label: 'Baseline' },
      { color: '#0284c7', label: 'Thermal Expansion (2/3)' },
      { color: '#22d3ee', label: 'Basin Rise' },
      { color: '#f59e0b', label: 'Land Ice Melt (1/3)' },
    ],
  },
  {
    id: 'arctic-sea-ice',
    index: 3,
    kind: 'seaice',
    title: 'Arctic Sea Ice Minimum Extent',
    missionSource: 'NASA / NSIDC Polar Observation',
    datasetCode: 'EIC-ICE-2025',
    yearMin: 1979,
    yearMax: 2025,
    defaultYear: 2024,
    metricLabel: 'September Minimum Sea Ice Extent',
    metricUnit: 'M km²',
    summary:
      'Polar stereographic view contrasting bright multi-year sea ice albedo against dark open Arctic ocean. Crystalline FM chimes trigger along ice-edge melt boundaries.',
    accessibilityScript:
      'Arctic Sea Ice Minimum Extent from 1979 to 2025. Bright cyan-white regions at the center represent dense multi-year sea ice, while dark navy surrounding waters indicate open ocean absorption. Scrubbing the year slider from 1979 toward 2025 contracts the ice sheet and increases crystalline ice-edge chime density.',
    recommendedScanMode: 'radial',
    recommendedScale: 'minor_pentatonic',
    legendMinLabel: 'Open Ocean (0%)',
    legendMaxLabel: 'Dense Ice (100%)',
    legendStops: [
      { color: '#09152b', label: '0% Ice' },
      { color: '#0e7490', label: '40% Edge' },
      { color: '#67e8f9', label: '75% Pack' },
      { color: '#f8fafc', label: '100% Core' },
    ],
  },
  {
    id: 'oceanic-currents-sst',
    index: 4,
    kind: 'currents',
    title: 'Oceanic Currents & Surface Velocity',
    missionSource: 'NASA ECCO-2 / SWOT',
    datasetCode: 'EIC-CURR-2025',
    yearMin: 2000,
    yearMax: 2025,
    defaultYear: 2025,
    metricLabel: 'Western Boundary Current Velocity',
    metricUnit: 'm/s',
    summary:
      'Vector stream-field of the Gulf Stream and global thermohaline eddies paired with sea surface temperature gradients. Eddy edge density modulates atmospheric kinetic rhythm.',
    accessibilityScript:
      'Oceanic Currents and Surface Velocity from NASA ECCO-2 model. Flowing cyan and warm amber streamlines trace high-velocity boundary currents and swirling eddies. High spatial gradient regions drive kinetic rhythmic pulses while sea surface warmth modulates harmonic pad resonance.',
    recommendedScanMode: 'raster',
    recommendedScale: 'major_pentatonic',
    legendMinLabel: '0.1 m/s',
    legendMaxLabel: '2.2 m/s',
    legendStops: [
      { color: '#0c1b33', label: '0.1 m/s' },
      { color: '#0891b2', label: '0.8 m/s' },
      { color: '#38bdf8', label: '1.4 m/s' },
      { color: '#fbbf24', label: '2.2 m/s' },
    ],
  },
  {
    id: 'co2-methane-plumes',
    index: 5,
    kind: 'emissions',
    title: 'Atmospheric CO₂ & Methane Hotspots',
    missionSource: 'NASA OCO-2 & EMIT Imaging',
    datasetCode: 'EIC-GHG-2025',
    yearMin: 2015,
    yearMax: 2025,
    defaultYear: 2025,
    metricLabel: 'Global Column-Averaged CO₂',
    metricUnit: 'ppm',
    summary:
      'Hyperspectral atmospheric carbon concentrations and localized methane super-emitter plumes. Centroid Lock tracks peak concentration clusters in real time.',
    accessibilityScript:
      'Atmospheric Carbon Dioxide and Methane Hotspots from NASA OCO-2 and EMIT spectrometers. Bright amber and magenta-red nodes highlight concentrated emission centroids over background atmospheric concentrations near 424 parts per million. Centroid Lock mode automatically orbits peak emission clusters.',
    recommendedScanMode: 'centroid',
    recommendedScale: 'minor_pentatonic',
    legendMinLabel: '395 ppm',
    legendMaxLabel: '440+ ppm',
    legendStops: [
      { color: '#0f172a', label: '395 ppm' },
      { color: '#0d9488', label: '410 ppm' },
      { color: '#f59e0b', label: '424 ppm' },
      { color: '#ef4444', label: 'Plume Peak' },
    ],
  },
  {
    id: 'custom-eic-frame',
    index: 6,
    kind: 'custom',
    title: 'Custom EIC Frame / Image Sonifier',
    missionSource: 'User-Supplied Visual Matrix',
    datasetCode: 'CV-MATRIX-CUSTOM',
    yearMin: 2024,
    yearMax: 2025,
    defaultYear: 2025,
    metricLabel: 'Active Luminance Intensity',
    metricUnit: '%',
    summary:
      'Upload any NASA Earth Observatory satellite image, EIC chart, or environmental visualization. Computer vision extracts RGB ratios, luminance, and edge density into live sound.',
    accessibilityScript:
      'Custom Earth Information Center frame mode. Upload any satellite image or scientific chart from your device. The computer vision analyzer samples pixel luminance, color warmth, and structural edges to synthesize a corresponding soundscape in real time.',
    recommendedScanMode: 'raster',
    recommendedScale: 'dorian',
    legendMinLabel: '0% Lum',
    legendMaxLabel: '100% Lum',
    legendStops: [
      { color: '#0f172a', label: 'Shadow' },
      { color: '#06b6d4', label: 'Cool Hue' },
      { color: '#f59e0b', label: 'Warm Hue' },
      { color: '#f8fafc', label: 'Peak Lum' },
    ],
  },
];

export const DEFAULT_LAYERS: Record<LayerId, LayerState> = {
  thermal: {
    id: 'thermal',
    name: 'Thermal Harmonic Pad',
    timbre: 'Dual Detuned Analog Low-Pass',
    dataBinding: 'Luminance → Pitch · Warmth → Filter',
    gain: 0.72,
    muted: false,
    solo: false,
  },
  hydro: {
    id: 'hydro',
    name: 'Cryo & Hydro Chimes',
    timbre: 'FM Crystalline Harmonic Pluck',
    dataBinding: 'Cool Hue & Ice Edge → Upper Arpeggio',
    gain: 0.65,
    muted: false,
    solo: false,
  },
  kinetic: {
    id: 'kinetic',
    name: 'Atmospheric Kinetic Pulse',
    timbre: 'Bandpass Modulated Air Texture',
    dataBinding: 'Edge & Vector Density → Modulation',
    gain: 0.48,
    muted: false,
    solo: false,
  },
  baseline: {
    id: 'baseline',
    name: 'Planetary Sub-Bass Drone',
    timbre: 'Fundamental Root Sine + Fifth',
    dataBinding: 'Annual Global Baseline → Sub Resonance',
    gain: 0.55,
    muted: false,
    solo: false,
  },
};

export function getTrackScientificBaseline(kind: EicTrack['kind'], year: number): {
  value: string;
  unit: string;
} {
  switch (kind) {
    case 'temperature': {
      // Anchored to NASA GISS historical curve with 2024 = +1.28 °C and 2025 = +1.19 °C (per PDF page 6)
      if (year === 2024) return { value: '+1.28', unit: '°C' };
      if (year === 2025) return { value: '+1.19', unit: '°C' };
      const t = (year - 1880) / (2025 - 1880);
      const val = -0.22 + 1.44 * Math.pow(t, 2.2) + Math.sin(year * 0.7) * 0.08;
      const sign = val >= 0 ? '+' : '';
      return { value: `${sign}${val.toFixed(2)}`, unit: '°C' };
    }
    case 'sealevel': {
      const t = (year - 1993) / (2024 - 1993);
      const mm = Math.max(0, t * 101.4 + Math.sin(year * 0.9) * 1.5);
      return { value: `+${mm.toFixed(1)}`, unit: 'mm' };
    }
    case 'seaice': {
      const t = (year - 1979) / (2025 - 1979);
      const extent = 7.2 - 2.95 * t + Math.sin(year * 1.1) * 0.25;
      return { value: extent.toFixed(2), unit: 'M km²' };
    }
    case 'currents': {
      const t = (year - 2000) / 25;
      const vel = 1.65 - 0.14 * t + Math.cos(year * 0.8) * 0.06;
      return { value: vel.toFixed(2), unit: 'm/s' };
    }
    case 'emissions': {
      const t = (year - 2015) / 10;
      const ppm = 400.8 + t * 24.1 + Math.sin(year * 0.5) * 0.4;
      return { value: ppm.toFixed(1), unit: 'ppm' };
    }
    default:
      return { value: '100', unit: '%' };
  }
}
