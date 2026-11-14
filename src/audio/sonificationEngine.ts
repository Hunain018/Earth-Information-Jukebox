import { FrameTelemetry, LayerId, SonificationSettings } from '../types/jukebox';
import { quantizeToScale, ROOT_MIDI_MAP, midiToFrequency } from './scales';

function createImpulseResponse(ctx: BaseAudioContext, duration = 1.9, decay = 2.6): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function createPinkNoiseBuffer(ctx: BaseAudioContext, seconds = 3): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const output = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
    b6 = white * 0.115926;
  }
  return buffer;
}

export class EarthSonificationEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private dryBus: GainNode | null = null;
  private wetBus: GainNode | null = null;

  // Thermal layer
  private thermalOscA: OscillatorNode | null = null;
  private thermalOscB: OscillatorNode | null = null;
  private thermalFilter: BiquadFilterNode | null = null;
  private thermalGain: GainNode | null = null;
  private thermalPan: StereoPannerNode | null = null;

  // Kinetic layer
  private kineticSource: AudioBufferSourceNode | null = null;
  private kineticFilter: BiquadFilterNode | null = null;
  private kineticGain: GainNode | null = null;
  private kineticPan: StereoPannerNode | null = null;

  // Baseline layer
  private baseOscRoot: OscillatorNode | null = null;
  private baseOscFifth: OscillatorNode | null = null;
  private baseGain: GainNode | null = null;

  private lastChimeTime = 0;
  private isStarted = false;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async start(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.setupGraph();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.08);
    }
    this.isStarted = true;
  }

  public async pause(): Promise<void> {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    this.isStarted = false;
  }

  private setupGraph(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.2;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.0001;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    this.dryBus = ctx.createGain();
    this.dryBus.gain.value = 0.85;

    this.wetBus = ctx.createGain();
    this.wetBus.gain.value = 0.34;

    const convolver = ctx.createConvolver();
    convolver.buffer = createImpulseResponse(ctx, 1.9, 2.5);

    this.dryBus.connect(compressor);
    this.wetBus.connect(convolver);
    convolver.connect(compressor);
    compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // 1. Thermal Harmonic Pad
    this.thermalOscA = ctx.createOscillator();
    this.thermalOscA.type = 'sawtooth';
    this.thermalOscA.frequency.value = 196;

    this.thermalOscB = ctx.createOscillator();
    this.thermalOscB.type = 'triangle';
    this.thermalOscB.frequency.value = 196;
    this.thermalOscB.detune.value = 7;

    this.thermalFilter = ctx.createBiquadFilter();
    this.thermalFilter.type = 'lowpass';
    this.thermalFilter.frequency.value = 720;
    this.thermalFilter.Q.value = 1.8;

    this.thermalGain = ctx.createGain();
    this.thermalGain.gain.value = 0.0001;

    this.thermalPan = ctx.createStereoPanner();
    this.thermalPan.pan.value = 0;

    this.thermalOscA.connect(this.thermalFilter);
    this.thermalOscB.connect(this.thermalFilter);
    this.thermalFilter.connect(this.thermalGain);
    this.thermalGain.connect(this.thermalPan);
    this.thermalPan.connect(this.dryBus);
    this.thermalPan.connect(this.wetBus);

    this.thermalOscA.start();
    this.thermalOscB.start();

    // 2. Kinetic Atmospheric Texture
    this.kineticSource = ctx.createBufferSource();
    this.kineticSource.buffer = createPinkNoiseBuffer(ctx, 3);
    this.kineticSource.loop = true;

    this.kineticFilter = ctx.createBiquadFilter();
    this.kineticFilter.type = 'bandpass';
    this.kineticFilter.frequency.value = 600;
    this.kineticFilter.Q.value = 3.2;

    this.kineticGain = ctx.createGain();
    this.kineticGain.gain.value = 0.0001;

    this.kineticPan = ctx.createStereoPanner();
    this.kineticPan.pan.value = 0;

    this.kineticSource.connect(this.kineticFilter);
    this.kineticFilter.connect(this.kineticGain);
    this.kineticGain.connect(this.kineticPan);
    this.kineticPan.connect(this.dryBus);
    this.kineticPan.connect(this.wetBus);

    this.kineticSource.start();

    // 3. Planetary Sub-Bass Drone
    this.baseOscRoot = ctx.createOscillator();
    this.baseOscRoot.type = 'sine';
    this.baseOscRoot.frequency.value = 65.41;

    this.baseOscFifth = ctx.createOscillator();
    this.baseOscFifth.type = 'triangle';
    this.baseOscFifth.frequency.value = 98.0;

    const baseFilter = ctx.createBiquadFilter();
    baseFilter.type = 'lowpass';
    baseFilter.frequency.value = 260;

    this.baseGain = ctx.createGain();
    this.baseGain.gain.value = 0.0001;

    this.baseOscRoot.connect(baseFilter);
    this.baseOscFifth.connect(baseFilter);
    baseFilter.connect(this.baseGain);
    this.baseGain.connect(this.dryBus);

    this.baseOscRoot.start();
    this.baseOscFifth.start();
  }

  private getEffectiveLayerGain(id: LayerId, settings: SonificationSettings): number {
    const layers = Object.values(settings.layers);
    const anySolo = layers.some((l) => l.solo);
    const target = settings.layers[id];
    if (target.muted) return 0;
    if (anySolo && !target.solo) return 0;
    return target.gain;
  }

  public update(telemetry: FrameTelemetry, settings: SonificationSettings, isPlaying: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (!isPlaying || !this.isStarted) {
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.08);
      return;
    }

    this.masterGain.gain.setTargetAtTime(settings.masterVolume * 0.85, now, 0.08);

    // 1. Thermal Harmonic Pad
    const thermalMix = this.getEffectiveLayerGain('thermal', settings);
    if (this.thermalOscA && this.thermalOscB && this.thermalFilter && this.thermalGain && this.thermalPan) {
      this.thermalOscA.frequency.setTargetAtTime(telemetry.activePitchHz, now, 0.06);
      this.thermalOscB.frequency.setTargetAtTime(telemetry.activePitchHz * 1.003, now, 0.06);
      this.thermalFilter.frequency.setTargetAtTime(telemetry.filterCutoffHz, now, 0.08);
      this.thermalPan.pan.setTargetAtTime(telemetry.stereoPan, now, 0.06);
      const padLevel = thermalMix * (0.08 + telemetry.luminance * 0.16);
      this.thermalGain.gain.setTargetAtTime(padLevel, now, 0.08);
    }

    // 2. Kinetic Atmospheric Texture
    const kineticMix = this.getEffectiveLayerGain('kinetic', settings);
    if (this.kineticFilter && this.kineticGain && this.kineticPan) {
      const centerFreq = 320 + telemetry.edgeDensity * 2400;
      this.kineticFilter.frequency.setTargetAtTime(centerFreq, now, 0.08);
      this.kineticPan.pan.setTargetAtTime(-telemetry.stereoPan * 0.6, now, 0.08);
      const noiseLevel = kineticMix * (0.04 + telemetry.edgeDensity * 0.45);
      this.kineticGain.gain.setTargetAtTime(noiseLevel, now, 0.08);
    }

    // 3. Planetary Sub-Bass Drone
    const baseMix = this.getEffectiveLayerGain('baseline', settings);
    if (this.baseOscRoot && this.baseOscFifth && this.baseGain) {
      const rootMidi = ROOT_MIDI_MAP[settings.rootNote] - 12;
      const rootHz = midiToFrequency(rootMidi);
      const fifthHz = midiToFrequency(rootMidi + 7);
      this.baseOscRoot.frequency.setTargetAtTime(rootHz, now, 0.12);
      this.baseOscFifth.frequency.setTargetAtTime(fifthHz, now, 0.12);
      const droneLevel = baseMix * 0.16;
      this.baseGain.gain.setTargetAtTime(droneLevel, now, 0.1);
    }

    // 4. Cryo & Hydro Crystalline Chime — beat grid trigger
    const hydroMix = this.getEffectiveLayerGain('hydro', settings);
    const beatInterval = 60 / Math.max(40, settings.tempoBpm) / 2;
    if (hydroMix > 0.02 && now - this.lastChimeTime >= beatInterval) {
      const hydroEnergy = Math.max(
        telemetry.blue,
        telemetry.edgeDensity * 0.85,
        telemetry.luminance * 0.65
      );
      if (hydroEnergy > 0.18) {
        this.triggerHydroChime(telemetry, settings, hydroMix, now);
      }
      this.lastChimeTime = now;
    }
  }

  private triggerHydroChime(
    telemetry: FrameTelemetry,
    settings: SonificationSettings,
    mix: number,
    now: number
  ): void {
    if (!this.ctx || !this.dryBus || !this.wetBus) return;
    const ctx = this.ctx;

    const noteVal = Math.min(1, Math.max(0, telemetry.blue * 0.65 + telemetry.edgeDensity * 0.35));
    const quantized = quantizeToScale(noteVal, settings.scale, settings.rootNote, 1, 2);

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(quantized.hz, now);

    const modulator = ctx.createOscillator();
    modulator.type = 'triangle';
    modulator.frequency.setValueAtTime(quantized.hz * 2, now);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(quantized.hz * 0.35, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + 0.35);

    const env = ctx.createGain();
    const peak = Math.min(0.24, mix * (0.08 + telemetry.blue * 0.18));
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(telemetry.stereoPan * 0.85, now);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(panner);
    panner.connect(this.dryBus);
    panner.connect(this.wetBus);

    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + 0.7);
    modulator.stop(now + 0.7);
  }

  public async renderWavBlob(
    durationSeconds: number,
    sampleTelemetryAtProgress: (progress: number) => FrameTelemetry,
    settings: SonificationSettings
  ): Promise<Blob> {
    const sampleRate = 44100;
    const offline = new OfflineAudioContext(2, Math.floor(sampleRate * durationSeconds), sampleRate);

    const compressor = offline.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;

    const master = offline.createGain();
    master.gain.value = settings.masterVolume * 0.85;

    const dry = offline.createGain();
    dry.gain.value = 0.85;

    const wet = offline.createGain();
    wet.gain.value = 0.34;

    const convolver = offline.createConvolver();
    convolver.buffer = createImpulseResponse(offline, 1.8, 2.5);

    dry.connect(compressor);
    wet.connect(convolver);
    convolver.connect(compressor);
    compressor.connect(master);
    master.connect(offline.destination);

    // Thermal pad
    const oscA = offline.createOscillator();
    oscA.type = 'sawtooth';
    const oscB = offline.createOscillator();
    oscB.type = 'triangle';
    oscB.detune.value = 7;
    const filter = offline.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 1.8;
    const padGain = offline.createGain();
    const padPan = offline.createStereoPanner();

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(padGain);
    padGain.connect(padPan);
    padPan.connect(dry);
    padPan.connect(wet);
    oscA.start(0);
    oscB.start(0);

    // Sub-bass drone
    const rootMidi = ROOT_MIDI_MAP[settings.rootNote] - 12;
    const subRoot = offline.createOscillator();
    subRoot.type = 'sine';
    subRoot.frequency.value = midiToFrequency(rootMidi);
    const subFifth = offline.createOscillator();
    subFifth.type = 'triangle';
    subFifth.frequency.value = midiToFrequency(rootMidi + 7);
    const subFilter = offline.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 260;
    const subGain = offline.createGain();
    const baseMix = this.getEffectiveLayerGain('baseline', settings);
    subGain.gain.value = baseMix * 0.16;
    subRoot.connect(subFilter);
    subFifth.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(dry);
    subRoot.start(0);
    subFifth.start(0);

    // Kinetic noise
    const noiseSrc = offline.createBufferSource();
    noiseSrc.buffer = createPinkNoiseBuffer(offline, durationSeconds);
    noiseSrc.loop = true;
    const noiseFilter = offline.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.value = 3.2;
    const noiseGain = offline.createGain();
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dry);
    noiseGain.connect(wet);
    noiseSrc.start(0);

    const thermalMix = this.getEffectiveLayerGain('thermal', settings);
    const hydroMix = this.getEffectiveLayerGain('hydro', settings);
    const kineticMix = this.getEffectiveLayerGain('kinetic', settings);

    const stepSec = 0.08;
    const beatInterval = 60 / Math.max(40, settings.tempoBpm) / 2;
    let nextBeat = 0;

    for (let t = 0; t < durationSeconds; t += stepSec) {
      const progress = t / durationSeconds;
      const tel = sampleTelemetryAtProgress(progress);

      oscA.frequency.setTargetAtTime(tel.activePitchHz, t, 0.04);
      oscB.frequency.setTargetAtTime(tel.activePitchHz * 1.003, t, 0.04);
      filter.frequency.setTargetAtTime(tel.filterCutoffHz, t, 0.04);
      padPan.pan.setTargetAtTime(tel.stereoPan, t, 0.04);
      padGain.gain.setTargetAtTime(thermalMix * (0.08 + tel.luminance * 0.16), t, 0.04);

      noiseFilter.frequency.setTargetAtTime(320 + tel.edgeDensity * 2400, t, 0.04);
      noiseGain.gain.setTargetAtTime(kineticMix * (0.04 + tel.edgeDensity * 0.45), t, 0.04);

      // ✅ FIX 1 & 2: hydroEnergy threshold check add kiya — live engine se match karta hai
      //    aur FM modulator bhi add kiya taake WAV aur live sound same rahe
      if (hydroMix > 0.02 && t >= nextBeat) {
        const hydroEnergy = Math.max(
          tel.blue,
          tel.edgeDensity * 0.85,
          tel.luminance * 0.65
        );
        if (hydroEnergy > 0.18) {
          const noteVal = Math.min(1, Math.max(0, tel.blue * 0.65 + tel.edgeDensity * 0.35));
          const q = quantizeToScale(noteVal, settings.scale, settings.rootNote, 1, 2);

          // FM carrier (live engine jaisa)
          const carrier = offline.createOscillator();
          carrier.type = 'sine';
          carrier.frequency.setValueAtTime(q.hz, t);

          // FM modulator — ✅ pehle ye missing tha, sirf plain sine tha
          const modulator = offline.createOscillator();
          modulator.type = 'triangle';
          modulator.frequency.setValueAtTime(q.hz * 2, t);

          const modGain = offline.createGain();
          modGain.gain.setValueAtTime(q.hz * 0.35, t);
          modGain.gain.exponentialRampToValueAtTime(1, t + 0.35);

          const env = offline.createGain();
          const peak = Math.min(0.24, hydroMix * (0.08 + tel.blue * 0.18));
          env.gain.setValueAtTime(0.0001, t);
          env.gain.linearRampToValueAtTime(peak, t + 0.015);
          env.gain.exponentialRampToValueAtTime(
            0.0001,
            Math.min(durationSeconds, t + 0.6)
          );

          const pan = offline.createStereoPanner();
          pan.pan.setValueAtTime(tel.stereoPan * 0.85, t);

          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(env);
          env.connect(pan);
          pan.connect(dry);
          pan.connect(wet);

          carrier.start(t);
          modulator.start(t);
          carrier.stop(Math.min(durationSeconds, t + 0.7));
          modulator.stop(Math.min(durationSeconds, t + 0.7));
        }
        nextBeat += beatInterval;
      }
    }

    // Fade out
    master.gain.setValueAtTime(settings.masterVolume * 0.85, Math.max(0, durationSeconds - 0.25));
    master.gain.linearRampToValueAtTime(0.0001, durationSeconds);

    const rendered = await offline.startRendering();
    return audioBufferToWavBlob(rendered);
  }

  // ✅ FIX 3: dispose() mein sab node references null kar diye — memory leak prevent
  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.analyser = null;
    this.masterGain = null;
    this.dryBus = null;
    this.wetBus = null;
    this.thermalOscA = null;
    this.thermalOscB = null;
    this.thermalFilter = null;
    this.thermalGain = null;
    this.thermalPan = null;
    this.kineticSource = null;
    this.kineticFilter = null;
    this.kineticGain = null;
    this.kineticPan = null;
    this.baseOscRoot = null;
    this.baseOscFifth = null;
    this.baseGain = null;
    this.isStarted = false;
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, buffer.length * numChannels * 2, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
