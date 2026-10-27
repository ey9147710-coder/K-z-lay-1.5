class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  // Continuous 1920s Truck Engine Audio Nodes
  private truckEngineRunning: boolean = false;
  private truckMainOsc: OscillatorNode | null = null;
  private truckSubOsc: OscillatorNode | null = null;
  private truckChugLfo: OscillatorNode | null = null;
  private truckChugDepth: GainNode | null = null;
  private truckFilter: BiquadFilterNode | null = null;
  private truckMasterGain: GainNode | null = null;
  private lastGearPlayed: number = 1;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopTruckEngine();
    }
    return this.isMuted;
  }

  public startTruckEngine(): void {
    if (this.isMuted || this.truckEngineRunning) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.11, now + 0.25);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);
      filter.Q.setValueAtTime(3.2, now);

      // Primary 4-cylinder sawtooth combustion oscillator
      const mainOsc = ctx.createOscillator();
      mainOsc.type = 'sawtooth';
      mainOsc.frequency.setValueAtTime(36, now);

      // Sub-octave triangle torque rumble oscillator
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(18, now);

      // Cylinder firing chug LFO modulating filter frequency
      const chugLfo = ctx.createOscillator();
      chugLfo.type = 'sine';
      chugLfo.frequency.setValueAtTime(8.5, now);

      const chugDepth = ctx.createGain();
      chugDepth.gain.setValueAtTime(48, now);

      chugLfo.connect(chugDepth);
      chugDepth.connect(filter.frequency);

      mainOsc.connect(filter);
      subOsc.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      mainOsc.start(now);
      subOsc.start(now);
      chugLfo.start(now);

      this.truckMainOsc = mainOsc;
      this.truckSubOsc = subOsc;
      this.truckChugLfo = chugLfo;
      this.truckChugDepth = chugDepth;
      this.truckFilter = filter;
      this.truckMasterGain = masterGain;
      this.truckEngineRunning = true;
      this.lastGearPlayed = 1;
    } catch {
      // Ignore audio context restrictions
    }
  }

  public updateTruckEngine(
    speedSigned: number,
    maxForwardSpeed: number,
    isThrottleOn: boolean,
    isBraking: boolean
  ): void {
    if (this.isMuted) {
      if (this.truckEngineRunning) this.stopTruckEngine();
      return;
    }
    if (!this.truckEngineRunning) {
      this.startTruckEngine();
    }
    if (
      !this.ctx ||
      !this.truckMainOsc ||
      !this.truckSubOsc ||
      !this.truckChugLfo ||
      !this.truckFilter ||
      !this.truckMasterGain
    ) {
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const absSpeed = Math.abs(speedSigned);
      const normSpeed = Math.min(1, absSpeed / Math.max(1, maxForwardSpeed));

      // Determine simulated 3-speed gearbox ratio & RPM curve
      let gear = 1;
      let gearLocalRatio = 0;
      if (speedSigned < -0.25) {
        gear = -1; // Reverse gear
        gearLocalRatio = Math.min(1, absSpeed / 9.0);
      } else if (normSpeed < 0.34) {
        gear = 1;
        gearLocalRatio = normSpeed / 0.34;
      } else if (normSpeed < 0.68) {
        gear = 2;
        gearLocalRatio = (normSpeed - 0.34) / 0.34;
      } else {
        gear = 3;
        gearLocalRatio = (normSpeed - 0.68) / 0.32;
      }

      // Subtle mechanical clunk when shifting up a forward gear
      if (gear > 0 && gear !== this.lastGearPlayed && absSpeed > 1.5) {
        this.lastGearPlayed = gear;
        this.playSfx('gear_shift');
      }

      // Combine overall speed pitch climb + per-gear RPM sawtooth curve + throttle boost
      const throttleBoost = isThrottleOn ? 0.14 : 0;
      const effectiveRpmRatio = Math.min(
        1.15,
        normSpeed * 0.62 + gearLocalRatio * 0.38 + throttleBoost
      );

      // Pitch shifts from 34 Hz at idle up to 118 Hz at top speed
      const baseFreq = 34 + effectiveRpmRatio * 82;
      const subFreq = baseFreq * 0.5;
      const chugRate = 8.0 + effectiveRpmRatio * 26.0;
      const cutoffFreq = (isThrottleOn ? 230 : 155) + effectiveRpmRatio * 510;
      const targetVol = isBraking && absSpeed > 2 ? 0.14 : isThrottleOn ? 0.135 : 0.085;

      this.truckMainOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.truckSubOsc.frequency.setTargetAtTime(subFreq, now, 0.05);
      this.truckChugLfo.frequency.setTargetAtTime(chugRate, now, 0.05);
      this.truckFilter.frequency.setTargetAtTime(cutoffFreq, now, 0.06);
      this.truckMasterGain.gain.setTargetAtTime(targetVol, now, 0.08);
    } catch {
      // Ignore audio update errors
    }
  }

  public stopTruckEngine(): void {
    if (!this.truckEngineRunning) return;
    this.truckEngineRunning = false;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.truckMasterGain && this.ctx) {
        this.truckMasterGain.gain.setTargetAtTime(0.0001, now, 0.04);
      }
      const mainOsc = this.truckMainOsc;
      const subOsc = this.truckSubOsc;
      const chugLfo = this.truckChugLfo;
      window.setTimeout(() => {
        try {
          mainOsc?.stop();
          mainOsc?.disconnect();
          subOsc?.stop();
          subOsc?.disconnect();
          chugLfo?.stop();
          chugLfo?.disconnect();
        } catch {
          // Ignore
        }
      }, 120);
    } catch {
      // Ignore
    }
    this.truckMainOsc = null;
    this.truckSubOsc = null;
    this.truckChugLfo = null;
    this.truckChugDepth = null;
    this.truckFilter = null;
    this.truckMasterGain = null;
  }

  public playSfx(
    type:
      | 'shot'
      | 'punch'
      | 'cannon'
      | 'whistle'
      | 'pickup'
      | 'surgery_step'
      | 'rescued'
      | 'reload'
      | 'martyr'
      | 'hoof'
      | 'heartbeat'
      | 'lockpick'
      | 'heist_success'
      | 'build'
      | 'gear_shift'
      | 'brake_hiss'
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'gear_shift') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(72, now + 0.075);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.085);
        return;
      }

      if (type === 'brake_hiss') {
        const bufferSize = Math.floor(ctx.sampleRate * 0.16);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        return;
      }

      if (type === 'hoof') {
        [0, 0.13].forEach((off, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 0 ? 185 : 230, now + off);
          osc.frequency.exponentialRampToValueAtTime(65, now + off + 0.055);
          gain.gain.setValueAtTime(0.11, now + off);
          gain.gain.exponentialRampToValueAtTime(0.001, now + off + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + off);
          osc.stop(now + off + 0.065);
        });
        return;
      }

      if (type === 'heartbeat') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.055, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        return;
      }

      if (type === 'shot') {
        const bufferSize = ctx.sampleRate * 0.14;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.035));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.26, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'cannon') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 0.45);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'punch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'whistle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1480, now);
        osc.frequency.setValueAtTime(1620, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'pickup' || type === 'lockpick') {
        const freqs = type === 'lockpick' ? [520, 780] : [440, 587.33];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.06);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.13);
        });
      } else if (type === 'rescued' || type === 'heist_success' || type === 'build') {
        const chord = type === 'heist_success' ? [392, 493.88, 587.33, 783.99] : [261.63, 329.63, 392.0, 523.25];
        chord.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + idx * 0.055);
          gain.gain.setValueAtTime(0.13, now + idx * 0.055);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.32);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.055);
          osc.stop(now + idx * 0.055 + 0.34);
        });
      } else if (type === 'surgery_step' || type === 'reload') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'reload' ? 660 : 523.25, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.11);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'martyr') {
        [196, 155.56, 130.81].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + idx * 0.18);
          gain.gain.setValueAtTime(0.15, now + idx * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.18);
          osc.stop(now + idx * 0.18 + 0.58);
        });
      }
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundEngine = new SoundEngine();
