import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

export function Waveform({
  data,
  color,
  height = 110,
  width,
  glow = true,
}: {
  data: number[];
  color: string;
  height?: number;
  width: number;
  glow?: boolean;
}) {
  const points = useMemo(() => {
    if (data.length < 2 || width <= 0) return '';
    let min = Infinity;
    let max = -Infinity;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = Math.max(1e-6, max - min);
    const n = data.length;
    const pad = 8;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const norm = (data[i] - min) / span;
      const y = height - pad - norm * (height - pad * 2);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [data, width, height]);

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(148,163,184,0.18)" strokeWidth={1} strokeDasharray="5,6" />
        {glow && points ? (
          <Polyline points={points} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {points ? (
          <Polyline points={points} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
      </Svg>
    </View>
  );
}
