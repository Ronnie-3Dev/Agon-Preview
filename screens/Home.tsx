import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { COLORS } from '../lib/theme';
import { Card, Btn, UnitPicker, EmptyState } from '../components/Ui';
import { useUnits } from '../lib/unit';
import { formatHeight } from '../lib/measureMath';
import { loadHeights, loadPulses, timeAgo, type HeightRecord, type PulseRecord } from '../lib/store';

export default function Home() {
  const { unit, setUnit } = useUnits();
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [heights, setHeights] = useState<HeightRecord[]>([]);
  const [pulses, setPulses] = useState<PulseRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    const [h, p] = await Promise.all([loadHeights(), loadPulses()]);
    setHeights(h);
    setPulses(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const lastH = heights[0];
  const lastP = pulses[0];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={[s.wrap, { width }]}>
            <View style={s.hero}>
              <View style={s.heroBadge}>
                <Ionicons name="scan" size={14} color="#06281F" />
                <Text style={s.heroBadgeTx}>CAMERA • TILT • TORCH PPG</Text>
              </View>
              <Text style={s.heroTitle}>MeasureMate</Text>
              <Text style={s.heroSub}>Point the camera to measure anyone or anything — then hold a finger to the flash to read your pulse.</Text>
              <View style={s.heroRow}>
                <Btn title="Measure height" icon="resize" onPress={() => nav.navigate('Measure')} style={{ flex: 1 }} />
                <Btn title="Check pulse" icon="heart" variant="coral" onPress={() => nav.navigate('Pulse')} style={{ flex: 1 }} />
              </View>
            </View>

            <View style={s.grid}>
              <Card style={[s.mini, { borderLeftWidth: 3, borderLeftColor: COLORS.teal }]}>
                <Ionicons name="triangle" size={20} color={COLORS.teal} />
                <Text style={s.miniVal}>{lastH ? formatHeight(lastH.cm, unit) : '—'}</Text>
                <Text style={s.miniLbl}>Last height</Text>
                <Text style={s.miniSub}>{lastH ? `${lastH.label} · ${timeAgo(lastH.createdAt)}` : 'No saves yet'}</Text>
              </Card>
              <Card style={[s.mini, { borderLeftWidth: 3, borderLeftColor: COLORS.coral }]}>
                <Ionicons name="pulse" size={20} color={COLORS.coral} />
                <Text style={s.miniVal}>{lastP ? `${Math.round(lastP.bpm)} bpm` : '—'}</Text>
                <Text style={s.miniLbl}>Last pulse</Text>
                <Text style={s.miniSub}>{lastP ? `${lastP.durationSec}s scan · ${timeAgo(lastP.createdAt)}` : 'No scans yet'}</Text>
              </Card>
            </View>

            <Card>
              <View style={s.rowBetween}>
                <View>
                  <Text style={s.cardTitle}>Display units</Text>
                  <Text style={s.cardSub}>Applies everywhere instantly</Text>
                </View>
                <UnitPicker value={unit} onChange={setUnit} />
              </View>
              <View style={s.unitPrev}>
                {[
                  { cm: 175, label: 'Adult' },
                  { cm: 120, label: 'Child' },
                  { cm: 68, label: 'Chair' },
                ].map((r) => (
                  <View key={r.label} style={s.unitPrevItem}>
                    <Text style={s.unitPrevVal}>{formatHeight(r.cm, unit)}</Text>
                    <Text style={s.unitPrevLbl}>{r.label}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={s.secT}>How it works</Text>
            <View style={s.steps}>
              <Step n="1" icon="camera" t="Aim at the object" d="Stand back, enter your distance, then lock the top and bottom angles with the tilt meter." c={COLORS.teal} />
              <Step n="2" icon="swap-vertical" t="Convert instantly" d="Trig does h = d·(tan top − tan bottom). Flip between cm, m, ft/in and inches." c={COLORS.violet} />
              <Step n="3" icon="flashlight" t="Finger on flash" d="Cover the lens + flash, torch lights the tissue and the PPG wave reveals each beat." c={COLORS.coral} />
            </View>

            <Card>
              <Text style={s.cardTitle}>Quick tips for accuracy</Text>
              {[
                'Hold the phone upright, elbows tucked, at eye level.',
                'Measure distance heel-to-heel with steps or a tape.',
                'Aim the center crosshair exactly at crown & floor.',
                'For pulse: press gently, stay still, breathe normally.',
              ].map((t, i) => (
                <View key={i} style={s.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                  <Text style={s.tipTx}>{t}</Text>
                </View>
              ))}
            </Card>

            <Card style={s.warn}>
              <View style={s.tipRow}>
                <Ionicons name="medical" size={18} color={COLORS.amber} />
                <Text style={[s.tipTx, { color: COLORS.amber, fontWeight: '700' }]}>Wellness only — not a medical device. If you feel unwell, seek professional care.</Text>
              </View>
            </Card>

            <View style={{ height: 30 }} />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.teal} />}
      />
    </SafeAreaView>
  );
}

function Step({ n, icon, t, d, c }: { n: string; icon: keyof typeof Ionicons.glyphMap; t: string; d: string; c: string }) {
  return (
    <Card style={s.step}>
      <View style={[s.stepN, { backgroundColor: c }]}>
        <Ionicons name={icon} size={18} color="#0B1428" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.stepT}>
          <Text style={{ color: c }}>{n}. </Text>
          {t}
        </Text>
        <Text style={s.stepD}>{d}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 10, alignSelf: 'center', maxWidth: 640 },
  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 14,
    overflow: 'hidden',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.teal,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 12,
  },
  heroBadgeTx: { fontSize: 10, fontWeight: '800', color: '#06281F', letterSpacing: 1 },
  heroTitle: { fontSize: 34, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: COLORS.muted, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  heroRow: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  mini: { flex: 1 },
  miniVal: { fontSize: 21, fontWeight: '900', color: COLORS.text, marginTop: 8 },
  miniLbl: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 2 },
  miniSub: { fontSize: 11, color: COLORS.faint, marginTop: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  unitPrev: { flexDirection: 'row', marginTop: 14, backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12 },
  unitPrevItem: { flex: 1, alignItems: 'center' },
  unitPrevVal: { fontSize: 15, fontWeight: '800', color: COLORS.teal },
  unitPrevLbl: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  secT: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 18, marginBottom: 10 },
  steps: { gap: 10, marginBottom: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepN: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  stepD: { fontSize: 12.5, color: COLORS.muted, lineHeight: 18, marginTop: 3 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 10 },
  tipTx: { flex: 1, fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  warn: { marginTop: 12, borderColor: 'rgba(251,191,36,0.35)' },
});
