import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../lib/theme';
import { Card, Btn, SegControl, UnitPicker, Field } from '../components/Ui';
import { useUnits } from '../lib/unit';
import { clamp, formatHeight, heightFromAngles, heightFromTopOnly, parseUnitInput } from '../lib/measureMath';
import { loadHeights, saveHeights, uid } from '../lib/store';

type Mode = 'live' | 'manual';
type Method = 'both' | 'top';

export default function Measure() {
  const { unit, setUnit } = useUnits();
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('live');
  const [method, setMethod] = useState<Method>('both');
  const [distanceText, setDistanceText] = useState('300');
  const [camHeightText, setCamHeightText] = useState('140');
  const [manTop, setManTop] = useState(18);
  const [manBottom, setManBottom] = useState(-22);

  const [pitch, setPitch] = useState(0);
  const [sensorOk, setSensorOk] = useState<boolean | null>(null);
  const smoothRef = useRef(0);
  const firstRef = useRef(true);

  const [topDeg, setTopDeg] = useState<number | null>(null);
  const [bottomDeg, setBottomDeg] = useState<number | null>(null);
  const [torch, setTorch] = useState(false);
  const [label, setLabel] = useState('');
  const [savedTick, setSavedTick] = useState(0);

  // ---- tilt from accelerometer gravity vector ----
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    (async () => {
      try {
        const avail = await Accelerometer.isAvailableAsync();
        setSensorOk(avail);
        if (!avail) return;
        Accelerometer.setUpdateInterval(100);
        sub = Accelerometer.addListener(({ x, y, z }) => {
          const n = Math.sqrt(x * x + y * y + z * z) || 1;
          // elevation of back-camera axis above horizontal
          const raw = (Math.asin(clamp(z / n, -1, 1)) * 180) / Math.PI;
          if (firstRef.current) {
            smoothRef.current = raw;
            firstRef.current = false;
          } else {
            smoothRef.current = smoothRef.current * 0.82 + raw * 0.18;
          }
          setPitch(smoothRef.current);
        });
      } catch {
        setSensorOk(false);
      }
    })();
    return () => sub?.remove();
  }, []);

  const distCm = parseUnitInput(distanceText, unit);
  const camHCm = parseUnitInput(camHeightText, unit);
  const distValid = isFinite(distCm) && distCm > 20 && distCm <= 5000;

  const effTop = mode === 'live' ? topDeg : manTop;
  const effBottom = mode === 'live' ? bottomDeg : manBottom;

  let resultCm: number | null = null;
  if (distValid && effTop !== null) {
    if (method === 'both' && effBottom !== null) {
      resultCm = heightFromAngles(distCm, effTop, effBottom);
    } else if (method === 'top' && isFinite(camHCm) && camHCm > 30 && camHCm < 300) {
      resultCm = heightFromTopOnly(distCm, camHCm, effTop);
    }
  }
  const resultSane = resultCm !== null && resultCm > 3 && resultCm < 3000;

  const liveAimCm =
    mode === 'live' && distValid && method === 'both' && bottomDeg !== null
      ? heightFromAngles(distCm, pitch, bottomDeg)
      : null;

  const lockTop = () => setTopDeg(Math.round(pitch * 10) / 10);
  const lockBottom = () => setBottomDeg(Math.round(pitch * 10) / 10);

  const loadDemo = () => {
    setDistanceText(unit === 'cm' ? '300' : unit === 'm' ? '3' : unit === 'ft' ? '9.8' : '118');
    setManTop(18);
    setManBottom(-22);
    setTopDeg(18);
    setBottomDeg(-22);
    setLabel('Demo doorway');
  };

  const save = async () => {
    if (!resultSane || resultCm === null) {
      Alert.alert('Nothing to save', 'Lock valid angles first so a height can be computed.');
      return;
    }
    const list = await loadHeights();
    list.unshift({
      id: uid(),
      cm: Math.round(resultCm * 10) / 10,
      label: label.trim() || (resultCm >= 100 ? 'Person' : 'Object'),
      method: 'angle',
      distanceCm: Math.round(distCm),
      topDeg: effTop ?? undefined,
      bottomDeg: method === 'both' ? effBottom ?? undefined : undefined,
      createdAt: Date.now(),
    });
    await saveHeights(list.slice(0, 100));
    setSavedTick((t) => t + 1);
    setLabel('');
    Alert.alert('Saved', `Height ${formatHeight(resultCm, unit)} stored in History.`);
  };

  const camGranted = camPerm?.granted === true;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Height Measure</Text>
          <Text style={s.sub}>Aim with the camera, lock two tilt angles, get the height.</Text>

          <SegControl
            options={[
              { label: 'Live camera', value: 'live' },
              { label: 'Manual entry', value: 'manual' },
            ]}
            value={mode}
            onChange={setMode}
            icons={{ live: 'camera', manual: 'create' }}
          />

          {mode === 'live' ? (
            <View style={{ marginTop: 12 }}>
              {!camGranted ? (
                <Card>
                  <View style={s.center}>
                    <View style={s.permIcon}>
                      <Ionicons name="camera" size={30} color={COLORS.teal} />
                    </View>
                    <Text style={s.permT}>Camera access needed</Text>
                    <Text style={s.permS}>The viewfinder helps you aim precisely at the top and bottom of your target.</Text>
                    <Btn title="Enable camera" icon="key" onPress={() => requestCamPerm()} style={{ marginTop: 12 }} />
                  </View>
                </Card>
              ) : (
                <View style={s.finder}>
                  <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <View style={s.hLine} />
                    <View style={s.vLine} />
                    <View style={s.reticle}>
                      <View style={s.retDot} />
                    </View>
                  </View>
                  <View style={s.finderTop}>
                    <View style={s.pitchChip}>
                      <Ionicons name="compass" size={14} color={COLORS.teal} />
                      <Text style={s.pitchTx}>
                        {pitch >= 0 ? '+' : ''}
                        {pitch.toFixed(1)}°
                      </Text>
                    </View>
                    <Pressable onPress={() => setTorch((t) => !t)} style={[s.iconBtn, torch && s.iconBtnOn]}>
                      <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={18} color={torch ? '#06281F' : COLORS.text} />
                    </Pressable>
                  </View>
                  <View style={s.finderBottom}>
                    <Text style={s.aimHint}>
                      {topDeg === null ? 'Aim at the TOP, then lock' : bottomDeg === null && method === 'both' ? 'Now aim at the BOTTOM, then lock' : 'Locked — see result below'}
                    </Text>
                  </View>
                </View>
              )}

              {sensorOk === false ? (
                <Card style={s.noteCard}>
                  <View style={s.noteRow}>
                    <Ionicons name="warning" size={18} color={COLORS.amber} />
                    <Text style={s.noteTx}>No motion sensor detected on this device — switch to Manual entry, or type angles below.</Text>
                  </View>
                </Card>
              ) : null}

              <Card style={{ marginTop: 12 }}>
                <Text style={s.cardT}>Method</Text>
                <SegControl
                  options={[
                    { label: 'Top + Bottom', value: 'both' },
                    { label: 'Top only', value: 'top' },
                  ]}
                  value={method}
                  onChange={setMethod}
                  icons={{ both: 'swap-vertical', top: 'arrow-up' }}
                />
                <Text style={s.hint}>
                  {method === 'both'
                    ? 'Most accurate. Stand back, lock the crown, then lock the floor. h = d·(tan top − tan bottom).'
                    : 'One aim only. Enter your camera height (eye level). h = cam + d·tan top.'}
                </Text>
              </Card>

              <Card style={{ marginTop: 12 }}>
                <View style={s.rowBetween}>
                  <Text style={s.cardT}>Distance to target</Text>
                  <UnitPicker value={unit} onChange={setUnit} />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Field label={`STAND-BACK DISTANCE (${unit})`} value={distanceText} onChange={setDistanceText} suffix={unit} placeholder="e.g. 300" />
                </View>
                {!distValid ? <Text style={s.err}>Enter a distance between 20 cm and 50 m (heel to target).</Text> : null}
                {method === 'top' ? (
                  <View style={{ marginTop: 6 }}>
                    <Field label={`CAMERA HEIGHT / EYE LEVEL (${unit})`} value={camHeightText} onChange={setCamHeightText} suffix={unit} placeholder="e.g. 140" />
                  </View>
                ) : null}
              </Card>

              <Card style={{ marginTop: 12 }}>
                <Text style={s.cardT}>Lock angles</Text>
                <Text style={s.hint}>Hold the phone upright at eye level. Elbows tucked. Tap when the crosshair sits exactly on target.</Text>
                <View style={s.lockRow}>
                  <Pressable onPress={lockTop} style={[s.lockBtn, topDeg !== null && s.lockBtnDone]}>
                    <Ionicons name="arrow-up-circle" size={22} color={topDeg !== null ? '#06281F' : COLORS.amber} />
                    <Text style={[s.lockT, topDeg !== null && { color: '#06281F' }]}>Lock TOP</Text>
                    <Text style={[s.lockV, topDeg !== null && { color: '#06281F' }]}>
                      {topDeg === null ? `${pitch.toFixed(1)}° now` : `${topDeg.toFixed(1)}° locked`}
                    </Text>
                  </Pressable>
                  {method === 'both' ? (
                    <Pressable onPress={lockBottom} style={[s.lockBtn, bottomDeg !== null && s.lockBtnDoneB]}>
                      <Ionicons name="arrow-down-circle" size={22} color={bottomDeg !== null ? '#06281F' : COLORS.teal} />
                      <Text style={[s.lockT, bottomDeg !== null && { color: '#06281F' }]}>Lock BOTTOM</Text>
                      <Text style={[s.lockV, bottomDeg !== null && { color: '#06281F' }]}>
                        {bottomDeg === null ? `${pitch.toFixed(1)}° now` : `${bottomDeg.toFixed(1)}° locked`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {liveAimCm !== null && liveAimCm > 0 && liveAimCm < 3000 ? (
                  <View style={s.liveAim}>
                    <Ionicons name="locate" size={14} color={COLORS.violet} />
                    <Text style={s.liveAimTx}>Aiming now: {formatHeight(liveAimCm, unit)} above locked base</Text>
                  </View>
                ) : null}
                <Btn title="Clear locks" icon="refresh" variant="ghost" small onPress={() => { setTopDeg(null); setBottomDeg(null); }} style={{ marginTop: 10 }} />
              </Card>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <Card>
                <Text style={s.cardT}>Method</Text>
                <SegControl
                  options={[
                    { label: 'Top + Bottom', value: 'both' },
                    { label: 'Top only', value: 'top' },
                  ]}
                  value={method}
                  onChange={setMethod}
                  icons={{ both: 'swap-vertical', top: 'arrow-up' }}
                />
              </Card>
              <Card style={{ marginTop: 12 }}>
                <View style={s.rowBetween}>
                  <Text style={s.cardT}>Inputs</Text>
                  <UnitPicker value={unit} onChange={setUnit} />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Field label={`DISTANCE (${unit})`} value={distanceText} onChange={setDistanceText} suffix={unit} />
                </View>
                {method === 'top' ? (
                  <Field label={`CAMERA HEIGHT (${unit})`} value={camHeightText} onChange={setCamHeightText} suffix={unit} />
                ) : null}
                <Stepper label="TOP ANGLE" value={manTop} step={0.5} min={-80} max={80} onChange={setManTop} />
                {method === 'both' ? (
                  <Stepper label="BOTTOM ANGLE" value={manBottom} step={0.5} min={-80} max={80} onChange={setManBottom} />
                ) : null}
                <Btn title="Load demo values" icon="flask" variant="ghost" small onPress={loadDemo} style={{ marginTop: 6 }} />
              </Card>
            </View>
          )}

          <Card style={[s.result, resultSane && s.resultGood]}>
            <Text style={s.resLbl}>MEASURED HEIGHT</Text>
            <Text style={s.resBig}>{resultSane && resultCm ? formatHeight(resultCm, unit) : '—'}</Text>
            {!resultSane && effTop !== null ? (
              <Text style={s.err}>Angles look off — top must aim above the bottom. Re-aim and re-lock.</Text>
            ) : (
              <Text style={s.resSub}>
                {resultCm ? `${resultCm.toFixed(1)} cm · ${(resultCm / 100).toFixed(2)} m · ${(resultCm / 2.54).toFixed(1)} in · ${Math.floor(resultCm / 2.54 / 12)}' ${((resultCm / 2.54) % 12).toFixed(1)}"` : 'Lock angles to compute'}
              </Text>
            )}
            <View style={s.saveRow}>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Label e.g. Maya, Doorway…"
                placeholderTextColor={COLORS.faint}
                style={s.labelInput}
                returnKeyType="done"
              />
              <Pressable onPress={save} style={[s.saveBtn, !resultSane && { opacity: 0.45 }]}>
                <Ionicons name="bookmark" size={17} color="#06281F" />
                <Text style={s.saveTx}>Save</Text>
              </Pressable>
            </View>
            {savedTick > 0 ? <Text style={s.savedNote}>Saved to History ✓ view it in the History tab</Text> : null}
          </Card>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.round(clamp(value - step, min, max) * 10) / 10);
  const inc = () => onChange(Math.round(clamp(value + step, min, max) * 10) / 10);
  return (
    <View style={s.stepWrap}>
      <Text style={s.stepLbl}>{label}</Text>
      <View style={s.stepBox}>
        <Pressable onPress={dec} style={s.stepBtn}>
          <Ionicons name="remove" size={18} color={COLORS.text} />
        </Pressable>
        <Text style={s.stepVal}>{value.toFixed(1)}°</Text>
        <Pressable onPress={inc} style={s.stepBtn}>
          <Ionicons name="add" size={18} color={COLORS.text} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 10, maxWidth: 640, alignSelf: 'center', width: '100%' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 3, marginBottom: 12 },
  center: { alignItems: 'center', paddingVertical: 8 },
  permIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(45,212,191,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  permT: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  permS: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  finder: { height: 320, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: COLORS.line },
  hLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(45,212,191,0.55)' },
  vLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(45,212,191,0.55)' },
  reticle: { position: 'absolute', top: '50%', left: '50%', width: 54, height: 54, marginLeft: -27, marginTop: -27, borderRadius: 27, borderWidth: 2, borderColor: COLORS.teal, alignItems: 'center', justifyContent: 'center' },
  retDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.teal },
  finderTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pitchChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(7,13,26,0.72)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  pitchTx: { color: COLORS.teal, fontWeight: '800', fontSize: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(7,13,26,0.72)', alignItems: 'center', justifyContent: 'center' },
  iconBtnOn: { backgroundColor: COLORS.teal },
  finderBottom: { position: 'absolute', bottom: 12, left: 12, right: 12, alignItems: 'center' },
  aimHint: { color: '#fff', fontSize: 12.5, fontWeight: '700', backgroundColor: 'rgba(7,13,26,0.72)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden' },
  noteCard: { marginTop: 12, borderColor: 'rgba(251,191,36,0.35)' },
  noteRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  noteTx: { flex: 1, fontSize: 13, color: COLORS.amber, lineHeight: 18 },
  cardT: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  hint: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18, marginTop: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  err: { fontSize: 12.5, color: COLORS.red, marginTop: 8, fontWeight: '600' },
  lockRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  lockBtn: { flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(148,163,184,0.3)', paddingVertical: 13, alignItems: 'center', gap: 3, backgroundColor: COLORS.bg2 },
  lockBtnDone: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  lockBtnDoneB: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  lockT: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  lockV: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  liveAim: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 10, padding: 10 },
  liveAimTx: { fontSize: 12.5, color: COLORS.violet, fontWeight: '700' },
  result: { marginTop: 12, borderColor: COLORS.line, alignItems: 'center' },
  resultGood: { borderColor: 'rgba(45,212,191,0.5)' },
  resLbl: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: COLORS.muted },
  resBig: { fontSize: 44, fontWeight: '900', color: COLORS.teal, marginTop: 4 },
  resSub: { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
  saveRow: { flexDirection: 'row', gap: 8, marginTop: 14, width: '100%' },
  labelInput: { flex: 1, backgroundColor: COLORS.bg2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 13, color: COLORS.text, fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.teal, borderRadius: 12, paddingHorizontal: 18 },
  saveTx: { fontWeight: '800', color: '#06281F', fontSize: 14 },
  savedNote: { fontSize: 12, color: COLORS.green, marginTop: 8, fontWeight: '600' },
  stepWrap: { marginTop: 12 },
  stepLbl: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 7, letterSpacing: 0.4 },
  stepBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg2, borderRadius: 13, borderWidth: 1, borderColor: COLORS.line },
  stepBtn: { padding: 13, paddingHorizontal: 18 },
  stepVal: { flex: 1, textAlign: 'center', color: COLORS.text, fontSize: 17, fontWeight: '700' },
});
