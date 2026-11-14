import { MusicalScaleId, RootNote } from '../types/jukebox';

export const SCALE_DEFINITIONS: Record<
  MusicalScaleId,
  { label: string; intervals: number[]; description: string }
> = {
  minor_pentatonic: {
    label: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    description: 'Contemplative, zero dissonant half-steps; ideal for atmospheric & polar data.',
  },
  dorian: {
    label: 'Dorian Mode',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Balanced minor-major inflection suited for global temperature transitions.',
  },
  lydian: {
    label: 'Lydian Mode',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: 'Expansive raised fourth resonance suited for oceanic & orbital elevation.',
  },
  major_pentatonic: {
    label: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    description: 'Open, bright harmonic spacing for current velocity and solar irradiance.',
  },
  continuous: {
    label: 'Unquantized Continuous',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: 'Direct microtonal pitch mapping without harmonic quantization.',
  },
};

export const ROOT_MIDI_MAP: Record<RootNote, number> = {
  C: 48, // C3
  D: 50,
  Eb: 51,
  F: 53,
  G: 55,
  A: 57,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${note}${octave}`;
}

export function quantizeToScale(
  normalizedValue: number,
  scaleId: MusicalScaleId,
  rootNote: RootNote,
  octaveOffset = 0,
  octaveSpan = 2
): { hz: number; midi: number; noteName: string } {
  const clamped = Math.max(0, Math.min(1, normalizedValue));
  const baseMidi = ROOT_MIDI_MAP[rootNote] + octaveOffset * 12;

  if (scaleId === 'continuous') {
    const midi = baseMidi + clamped * octaveSpan * 12;
    return {
      hz: midiToFrequency(midi),
      midi,
      noteName: `${midiToNoteName(midi)} (~${Math.round(midiToFrequency(midi))} Hz)`,
    };
  }

  const intervals = SCALE_DEFINITIONS[scaleId].intervals;
  const totalSteps = intervals.length * octaveSpan;
  const stepIndex = Math.min(totalSteps - 1, Math.floor(clamped * totalSteps));
  const octave = Math.floor(stepIndex / intervals.length);
  const interval = intervals[stepIndex % intervals.length];
  const midi = baseMidi + octave * 12 + interval;

  return {
    hz: midiToFrequency(midi),
    midi,
    noteName: midiToNoteName(midi),
  };
}
