import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HeightRecord {
  id: string;
  cm: number;
  label: string;
  method: 'angle' | 'photo';
  distanceCm: number;
  topDeg?: number;
  bottomDeg?: number;
  createdAt: number;
}

export interface PulseRecord {
  id: string;
  bpm: number;
  durationSec: number;
  quality: number;
  createdAt: number;
}

const H_KEY = 'mm_height_history_v1';
const P_KEY = 'mm_pulse_history_v1';
const U_KEY = 'mm_unit_v1';

export async function loadHeights(): Promise<HeightRecord[]> {
  try {
    const s = await AsyncStorage.getItem(H_KEY);
    return s ? (JSON.parse(s) as HeightRecord[]) : [];
  } catch {
    return [];
  }
}
export async function saveHeights(list: HeightRecord[]) {
  try {
    await AsyncStorage.setItem(H_KEY, JSON.stringify(list));
  } catch {}
}
export async function loadPulses(): Promise<PulseRecord[]> {
  try {
    const s = await AsyncStorage.getItem(P_KEY);
    return s ? (JSON.parse(s) as PulseRecord[]) : [];
  } catch {
    return [];
  }
}
export async function savePulses(list: PulseRecord[]) {
  try {
    await AsyncStorage.setItem(P_KEY, JSON.stringify(list));
  } catch {}
}
export async function loadUnit(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(U_KEY)) || 'cm';
  } catch {
    return 'cm';
  }
}
export async function persistUnit(u: string) {
  try {
    await AsyncStorage.setItem(U_KEY, u);
  } catch {}
}

export function uid() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
