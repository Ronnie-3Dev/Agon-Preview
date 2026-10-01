// Physiological PPG model + peak-detection BPM estimator.

export function ppgWave(phase: number): number {
  const g = (c: number, w: number) => Math.exp(-((phase - c) * (phase - c)) / w);
  return g(0.16, 0.0045) + 0.42 * g(0.38, 0.008) + 0.12 * g(0.6, 0.02);
}

export interface PpgState {
  t: number;
  trueBpm: number;
  baseline: number;
  quality: number;
}

export function nextTrueBpm(prev: number, t: number, rng: () => number): number {
  const target = 72 + 6 * Math.sin(t / 9) + 2.5 * Math.sin(t / 3.7 + 1.3);
  return prev + (target - prev) * 0.03 + (rng() - 0.5) * 0.35;
}

export function samplePpg(state: PpgState, rng: () => number): number {
  const phase = ((state.t * state.trueBpm) / 60) % 1;
  const pulse = ppgWave(phase);
  const resp = 0.06 * Math.sin((2 * Math.PI * state.t) / 4.5);
  const noise = (rng() - 0.5) * 0.09 * (1.2 - state.quality * 0.7);
  const drift = 0.05 * Math.sin(state.t / 12);
  return state.baseline + resp + drift + pulse * (0.55 + state.quality * 0.65) + noise;
}

export class BpmEstimator {
  private lastVal = 0;
  private rising = false;
  private lastPeakT = -10;
  private intervals: number[] = [];
  private threshold = 0.35;
  private maxPeak = 0.6;

  reset() {
    this.lastVal = 0;
    this.rising = false;
    this.lastPeakT = -10;
    this.intervals = [];
    this.threshold = 0.35;
    this.maxPeak = 0.6;
  }

  push(v: number, t: number): number | null {
    this.maxPeak = Math.max(this.maxPeak * 0.999, v);
    this.threshold = this.threshold * 0.995 + this.maxPeak * 0.55 * 0.005;
    const thr = Math.max(0.18, this.threshold);
    let bpm: number | null = null;
    if (v > this.lastVal) {
      this.rising = true;
    } else if (this.rising) {
      this.rising = false;
      const peak = this.lastVal;
      if (peak > thr && t - this.lastPeakT > 0.38) {
        if (this.lastPeakT > 0) {
          const iv = t - this.lastPeakT;
          if (iv > 0.35 && iv < 1.8) {
            this.intervals.push(iv);
            if (this.intervals.length > 12) this.intervals.shift();
          }
        }
        this.lastPeakT = t;
        bpm = this.current();
      }
    }
    this.lastVal = v;
    return bpm;
  }

  current(): number | null {
    if (this.intervals.length < 2) return null;
    const s = [...this.intervals].sort((a, b) => a - b);
    const mid = s[Math.floor(s.length / 2)];
    const kept = s.filter((x) => Math.abs(x - mid) < 0.25);
    if (!kept.length) return null;
    const avg = kept.reduce((a, b) => a + b, 0) / kept.length;
    const bpm = 60 / avg;
    if (bpm < 35 || bpm > 200) return null;
    return bpm;
  }

  count() {
    return this.intervals.length;
  }
}

export function bpmZone(bpm: number): { label: string; color: string; tip: string } {
  if (bpm < 50) return { label: 'Low resting', color: '#7DD3FC', tip: 'Athletes often rest here. If dizzy, check with a clinician.' };
  if (bpm < 60) return { label: 'Calm · Resting', color: '#34D399', tip: 'Great resting range. Breathe easy and stay hydrated.' };
  if (bpm <= 100) return { label: 'Normal resting', color: '#34D399', tip: 'Within the typical adult resting range (60–100 bpm).' };
  if (bpm <= 120) return { label: 'Elevated', color: '#FBBF24', tip: 'Slightly high — rest 5 min, relax shoulders, re-measure.' };
  return { label: 'High', color: '#F87171', tip: 'High for rest. Sit down, breathe slowly. Seek care if symptoms persist.' };
}
