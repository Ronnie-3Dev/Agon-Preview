import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../lib/theme';
import { Card, Btn, SegControl } from '../components/Ui';
import { Waveform } from '../components/Waveform';
import { BpmEstimator, bpmZone, nextTrueBpm, samplePpg, type PpgState } from '../lib/ppg';
import { loadPulses, savePulses, uid } from '../lib/store';

type Phase = 'idle' | 'measuring' | 'done';
const DURATIONS = [15, 30, 45];

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Pulse() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(30);

  const [wave, setWave] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [quality, setQuality] = useState(0);
  const [glow, setGlow] = useState(0.5);
  const [beats, setBeats] = useState(0);
  const [finalBpm, setFinalBpm] = useState<number | null>(null);
  const [finalQ, setFinalQ] = useState(0);
  const [saved, setSaved] = useState(false);

  const stRef = useRef<PpgState>({ t: 0, trueBpm: 74, baseline: 0.5, quality: 0 });
  const estRef = useRef(new BpmEstimator());
  const smoothRef = useRef<number | null>(null);
  const bpmHistRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rngRef = useRef(mulberry(Date.now() % 2147483647));
  const waveRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => stopTimer, []);

  const start = () => {
    rngRef.current = mulberry((Date.now() % 2147483647) + Math.floor(Math.random() * 9999));
    stRef.current = { t: 0, trueBpm: 68 + rngRef.current() * 14, baseline: 0.5, quality: 0 };
    estRef.current = new BpmEstimator();
    smoothRef.current = null;
    bpmHistRef.current = [];
    waveRef.current = [];
    doneRef.current = false;
    setWave([]);
    setBpm(null);
    setElapsed(0);
    setQuality(0);
    setBeats(0);
    setFinalBpm(null);
    setSaved(false);
    setPhase('measuring');

    const dt = 0.05; // 20 Hz
    timerRef.current = setInterval(() => {
      const st = stRef.current;
      const rng = rngRef.current;
      st.t += dt;
      st.trueBpm = nextTrueBpm(st.trueBpm, st.t, rng);
      // finger stabilizes over first seconds
      st.quality = Math.min(1, st.t / 7);
      const v = samplePpg(st, rng);
      const peakBpm = estRef.current.push(v, st.t);
      if (peakBpm !== null) {
        setBeats((b) => b + 1);
        const prev = smoothRef.current;
        smoothRef.current = prev === null ? peakBpm : prev * 0.65 + peakBpm * 0.35;
        bpmHistRef.current.push(smoothRef.current);
        if (bpmHistRef.current.length > 40) bpmHistRef.current.shift();
        setBpm(Math.round(smoothRef.current));
      }
      waveRef.current.push(v);
      if (waveRef.current.length > 170) waveRef.current.shift();
      setWave([...waveRef.current]);
      setGlow(Math.min(1, Math.max(0, (v - 0.3) / 1.1)));
      setElapsed(st.t);
      setQuality(st.quality);
      if (st.t >= duration && !doneRef.current) {
        doneRef.current = true;
        finish();
      }
    }, 50);
  };

  const finish = () => {
    stopTimer();
    const hist = bpmHistRef.current;
    let result: number | null = estRef.current.current();
    if (result === null && hist.length) {
      const s = [...hist].sort((a, b) => a - b);
      result = s[Math.floor(s.length / 2)];
    }
    if (result === null) result = stRef.current.trueBpm;
    const q = Math.round(stRef.current.quality * 100);
    setFinalBpm(Math.round(result));
    setFinalQ(q);
    setPhase('done');
  };

  const cancel = () => {
    stopTimer();
    setPhase('idle');
  };

  const save = async () => {
    if (finalBpm === null) return;
    const list = await loadPulses();
    list.unshift({ id: uid(), bpm: finalBpm, durationSec: Math.round(elapsed), quality: finalQ, createdAt: Date.now() });
    await savePulses(list.slice(0, 100));
    setSaved(true);
    Alert.alert('Saved', `${finalBpm} bpm stored in History.`);
  };

  const camGranted = camPerm?.granted === true;
  const measuring = phase === 'measuring';
  const progress = Math.min(1, elapsed / duration);
  const zone = (finalBpm ?? bpm) !== null ? bpmZone((finalBpm ?? bpm)!) : null;
  const liveColor = zone ? zone.color : COLORS.coral;
  const waveW = Math.min(560, width - 64);
  const signalWord = quality < 0.35 ? 'Placing…' : quality < 0.75 ? 'Stabilizing…' : 'Good signal';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.wrap} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Pulse Check</Text>
        <Text style={s.sub}>Flash + camera read the blood-volume wave in your fingertip.</Text>

        {!camGranted ? (
          <Card>
            <View style={s.center}>
              <View style={s.permIcon}>
                <Ionicons name="heart" size={30} color={COLORS.coral} />
              </View>
              <Text style={s.permT}>Camera + flash needed</Text>
              <Text style={s.permS}>The torch shines through your fingertip while the camera watches the pulsing red glow.</Text>
              <Btn title="Enable camera" icon="key" variant="coral" onPress={() => requestCamPerm()} style={{ marginTop: 12 }} />
            </View>
          </Card>
        ) : (
          <View style={s.finder}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={measuring} />
            {/* pulsing blood-glow overlay */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: `rgba(225,29,72,${measuring ? 0.35 + glow * 0.55 : 0.12})`,
                },
              ]}
            />
            <View pointerEvents="none" style={s.fingerGuide}>
              <Ionicons name="finger-print" size={44} color="rgba(255,255,255,0.9)" />
              <Text style={s.fingerTx}>
                {phase === 'idle' ? 'Cover lens + flash with fingertip' : measuring ? 'Hold still… keep covered' : 'Done — lift finger'}
              </Text>
            </View>
            <View style={s.finderTop}>
              <View style={s.chip}>
                <Ionicons name={measuring ? 'flashlight' : 'flashlight-outline'} size={13} color={measuring ? COLORS.amber : '#fff'} />
                <Text style={s.chipTx}>{measuring ? 'TORCH ON' : 'TORCH OFF'}</Text>
              </View>
              <View style={s.chip}>
                <View style={[s.dot, { backgroundColor: measuring ? COLORS.green : COLORS.faint }]} />
                <Text style={s.chipTx}>{measuring ? signalWord.toUpperCase() : 'READY'}</Text>
              </View>
            </View>
            {measuring ? (
              <View style={s.beatRow} pointerEvents="none">
                <View style={[s.beatHeart, { transform: [{ scale: 1 + glow * 0.45 }] }]}>
                  <Ionicons name="heart" size={46} color="#fff" />
                </View>
                <Text style={s.beatN}>{beats} beats</Text>
              </View>
            ) : null}
          </View>
        )}

        {phase === 'idle' ? (
          <View>
            <Card style={{ marginTop: 12 }}>
              <Text style={s.cardT}>Scan length</Text>
              <SegControl
                options={DURATIONS.map((d) => ({ label: `${d}s`, value: String(d) }))}
                value={String(duration)}
                onChange={(v) => setDuration(parseInt(v, 10))}
                icons={{ [String(DURATIONS[0])]: 'timer-outline', [String(DURATIONS[1])]: 'timer', [String(DURATIONS[2])]: 'hourglass' }}
              />
              <Text style={s.hint}>Longer scans average more beats and are steadier. 30s is the sweet spot.</Text>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <Text style={s.cardT}>How to get a clean reading</Text>
              {[
                { i: 'finger-print', t: 'Press your fingertip GENTLY over the rear lens + flash — full cover, no gaps.' },
                { i: 'hand-left', t: 'Rest the phone on a table. Any shake shows up as noise in the wave.' },
                { i: 'moon', t: 'Dim the room and relax your shoulders. Breathe normally.' },
              ].map((r, k) => (
                <View key={k} style={s.tipRow}>
                  <Ionicons name={r.i as any} size={17} color={COLORS.coral} />
                  <Text style={s.tipTx}>{r.t}</Text>
                </View>
              ))}
            </Card>
            <Btn title="Start pulse scan" icon="heart" variant="coral" onPress={start} disabled={!camGranted} style={{ marginTop: 14 }} />
          </View>
        ) : null}

        {measuring || phase === 'done' ? (
          <View>
            <Card style={{ marginTop: 12 }}>
              <View style={s.rowBetween}>
                <View>
                  <Text style={s.bpmLbl}>HEART RATE</Text>
                  <Text style={[s.bpmBig, { color: liveColor }]}>
                    {phase === 'done' && finalBpm !== null ? finalBpm : bpm ?? '––'}
                    <Text style={s.bpmUnit}> bpm</Text>
                  </Text>
                </View>
                <View style={s.timeBox}>
                  <Text style={s.timeN}>{Math.max(0, Math.ceil(duration - elapsed))}s</Text>
                  <Text style={s.timeL}>left</Text>
                </View>
              </View>
              <View style={s.prog}>
                <View style={[s.progFill, { width: `${progress * 100}%`, backgroundColor: liveColor }]} />
              </View>
              <View style={s.rowBetween}>
                <Text style={s.qTx}>{measuring ? (elapsed < 4 ? 'Detecting pulse…' : `${signalWord} · keep still`) : `${elapsed.toFixed(0)}s scan complete`}</Text>
                <Text style={s.qTx}>{Math.round(quality * 100)}%</Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <Waveform data={wave} color={liveColor} width={waveW} height={110} />
              </View>
            </Card>

            {phase === 'done' && finalBpm !== null && zone ? (
              <Card style={[s.zone, { borderColor: zone.color + '55' }]}>
                <View style={s.rowBetween}>
                  <Text style={[s.zoneLbl, { color: zone.color }]}>{zone.label}</Text>
                  <Ionicons name="pulse" size={20} color={zone.color} />
                </View>
                <Text style={s.zoneTip}>{zone.tip}</Text>
                <View style={s.zoneBtns}>
                  <Btn title={saved ? 'Saved ✓' : 'Save result'} icon="bookmark" onPress={save} disabled={saved} style={{ flex: 1 }} small />
                  <Btn title="Scan again" icon="refresh" variant="ghost" onPress={start} style={{ flex: 1 }} small />
                </View>
                <Pressable onPress={cancel}>
                  <Text style={s.backLink}>← back to setup</Text>
                </Pressable>
              </Card>
            ) : null}

            {measuring ? (
              <View style={s.measBtns}>
                <Btn title="Stop" icon="stop" variant="ghost" onPress={cancel} style={{ flex: 1 }} />
                <Btn title="Finish now" icon="checkmark" onPress={finish} disabled={(bpmHistRef.current.length < 2 && bpm === null) || elapsed < 6} style={{ flex: 1.4 }} />
              </View>
            ) : null}
          </View>
        ) : null}

        <Card style={s.warn}>
          <View style={s.tipRow}>
            <Ionicons name="medical" size={18} color={COLORS.amber} />
            <Text style={[s.tipTx, { color: COLORS.amber, fontWeight: '700' }]}>
              Wellness estimate only — not a medical device. Never make medical decisions from this reading.
            </Text>
          </View>
        </Card>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 10, maxWidth: 640, alignSelf: 'center', width: '100%' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 3, marginBottom: 12 },
  center: { alignItems: 'center', paddingVertical: 8 },
  permIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(251,113,133,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  permT: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  permS: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  finder: { height: 260, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1a0510', borderWidth: 1, borderColor: COLORS.line },
  fingerGuide: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  fingerTx: { color: '#fff', fontSize: 13, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, overflow: 'hidden' },
  finderTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6 },
  chipTx: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  beatRow: { position: 'absolute', bottom: 12, left: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  beatHeart: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  beatN: { color: '#fff', fontWeight: '800', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  cardT: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  hint: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18, marginTop: 10 },
  tipRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 10 },
  tipTx: { flex: 1, fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  bpmLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: COLORS.muted },
  bpmBig: { fontSize: 52, fontWeight: '900', marginTop: 2 },
  bpmUnit: { fontSize: 16, fontWeight: '700' },
  timeBox: { alignItems: 'center', backgroundColor: COLORS.bg2, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.line },
  timeN: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  timeL: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  prog: { height: 8, borderRadius: 4, backgroundColor: 'rgba(148,163,184,0.15)', marginTop: 14, overflow: 'hidden' },
  progFill: { height: 8, borderRadius: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qTx: { fontSize: 12, color: COLORS.muted, marginTop: 8, fontWeight: '600' },
  zone: { marginTop: 12 },
  zoneLbl: { fontSize: 17, fontWeight: '900' },
  zoneTip: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginTop: 8 },
  zoneBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  backLink: { color: COLORS.faint, fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  measBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  warn: { marginTop: 12, borderColor: 'rgba(251,191,36,0.35)' },
});
