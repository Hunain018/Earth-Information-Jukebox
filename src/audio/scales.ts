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

/** MIDI number ko Hz frequency mein convert karta hai (A4 = 440 Hz = MIDI 69) */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * MIDI number ko readable note name mein convert karta hai.
 * Float MIDI values ko nearest integer par round karta hai.
 * Valid range: 0–127 (C-1 to G9). Is range se bahar defensive clamp lagta hai.
 */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(Math.max(0, Math.min(127, midi))); // ✅ defensive clamp
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${note}${octave}`;
}

/**
 * Normalized value (0–1) ko selected musical scale ke ek note par quantize karta hai.
 * @param normalizedValue  - 0.0 (lowest) se 1.0 (highest) tak input
 * @param scaleId          - Musical scale jisse quantize karna hai
 * @param rootNote         - Root key (C, D, Eb, F, G, A)
 * @param octaveOffset     - Base octave se kitne octave upar shuru ho (default 0)
 * @param octaveSpan       - Kitne octaves cover karne hain (default 2)
 */
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
    // Microtonal: seedha linear interpolation, koi quantization nahi
    const midi = baseMidi + clamped * octaveSpan * 12;
    return {
      hz: midiToFrequency(midi),
      midi,
      noteName: `${midiToNoteName(midi)} (~${Math.round(midiToFrequency(midi))} Hz)`,
    };
  }

  const intervals = SCALE_DEFINITIONS[scaleId].intervals;
  const totalSteps = intervals.length * octaveSpan;
  // clamped=1.0 par bhi last step se bahar na jaye
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
