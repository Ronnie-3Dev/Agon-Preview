export type Unit = 'cm' | 'm' | 'ft' | 'in';

export function cmToUnit(cm: number, unit: Unit): { value: number; label: string } {
  switch (unit) {
    case 'cm':
      return { value: cm, label: 'cm' };
    case 'm':
      return { value: cm / 100, label: 'm' };
    case 'ft':
      return { value: cm / 30.48, label: 'ft' };
    case 'in':
      return { value: cm / 2.54, label: 'in' };
  }
}

export function formatHeight(cm: number, unit: Unit): string {
  if (!isFinite(cm) || cm <= 0) return '—';
  if (unit === 'ft') {
    const totalIn = cm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inch = totalIn - ft * 12;
    return `${ft}' ${inch.toFixed(1)}"`;
  }
  const { value, label } = cmToUnit(cm, unit);
  if (unit === 'm') return `${value.toFixed(2)} ${label}`;
  if (unit === 'cm') return `${value.toFixed(1)} ${label}`;
  return `${value.toFixed(1)} ${label}`;
}

export function parseUnitInput(text: string, unit: Unit): number {
  const v = parseFloat(text.replace(',', '.'));
  if (!isFinite(v) || v <= 0) return NaN;
  switch (unit) {
    case 'cm':
      return v;
    case 'm':
      return v * 100;
    case 'ft':
      return v * 30.48;
    case 'in':
      return v * 2.54;
  }
}

// Two-angle trig height: d in cm, angles in degrees from horizontal.
// height = d * (tan(top) - tan(bottom))
export function heightFromAngles(distanceCm: number, topDeg: number, bottomDeg: number): number {
  const t = (topDeg * Math.PI) / 180;
  const b = (bottomDeg * Math.PI) / 180;
  return distanceCm * (Math.tan(t) - Math.tan(b));
}

// Single-angle (bottom assumed at ground): height = camH + d * tan(top)
export function heightFromTopOnly(distanceCm: number, camHeightCm: number, topDeg: number): number {
  const t = (topDeg * Math.PI) / 180;
  return camHeightCm + distanceCm * Math.tan(t);
}

export function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}
