import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../lib/theme';
import { Card, EmptyState, SectionHead, SegControl, Stat, UnitPicker } from '../components/Ui';
import { useUnits } from '../lib/unit';
import { formatHeight } from '../lib/measureMath';
import { loadHeights, loadPulses, saveHeights, savePulses, timeAgo } from '../lib/store';
import { bpmZone } from '../lib/ppg';

type Tab = 'heights' | 'pulse';

export default function History() {
  const { unit, setUnit } = useUnits();
  const [tab, setTab] = useState<Tab>('heights');
  const [heights, setHeights] = useState<Awaited<ReturnType<typeof loadHeights>>>([]);
  const [pulses, setPulses] = useState<Awaited<ReturnType<typeof loadPulses>>>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    const [h, p] = await Promise.all([loadHeights(), loadPulses()]);
    setHeights(h);
    setPulses(p);
  }, []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const hStats = heights.length
    ? {
        n: heights.length,
        max: Math.max(...heights.map((h) => h.cm)),
        avg: heights.reduce((a, h) => a + h.cm, 0) / heights.length,
      }
    : null;
  const pStats = pulses.length
    ? {
        n: pulses.length,
        avg: pulses.reduce((a, p) => a + p.bpm, 0) / pulses.length,
        min: Math.min(...pulses.map((p) => p.bpm)),
        max: Math.max(...pulses.map((p) => p.bpm)),
      }
    : null;

  const clearHeights = () =>
    Alert.alert('Clear heights?', `Delete all ${heights.length} saved measurements?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await saveHeights([]); reload(); } },
    ]);
  const clearPulses = () =>
    Alert.alert('Clear pulse scans?', `Delete all ${pulses.length} saved readings?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await savePulses([]); reload(); } },
    ]);

  const delHeight = (id: string) =>
    Alert.alert('Delete?', 'Remove this measurement?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { const l = heights.filter((h) => h.id !== id); setHeights(l); await saveHeights(l); } },
    ]);
  const delPulse = (id: string) =>
    Alert.alert('Delete?', 'Remove this reading?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { const l = pulses.filter((p) => p.id !== id); setPulses(l); await savePulses(l); } },
    ]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={tab === 'heights' ? heights : pulses}
        keyExtractor={(it: any) => it.id}
        contentContainerStyle={s.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={COLORS.teal} />}
        ListHeaderComponent={
          <View>
            <View style={s.head}>
              <View>
                <Text style={s.title}>History</Text>
                <Text style={s.sub}>All your measurements & scans</Text>
              </View>
              <UnitPicker value={unit} onChange={setUnit} />
            </View>
            <SegControl
              options={[
                { label: `Heights (${heights.length})`, value: 'heights' },
                { label: `Pulse (${pulses.length})`, value: 'pulse' },
              ]}
              value={tab}
              onChange={setTab}
              icons={{ heights: 'resize', pulse: 'heart' }}
            />
            {tab === 'heights' && hStats ? (
              <Card style={{ marginTop: 12 }}>
                <View style={s.stats}>
                  <Stat label="saved" value={String(hStats.n)} />
                  <Stat label="tallest" value={formatHeight(hStats.max, unit)} accent={COLORS.teal} />
                  <Stat label="average" value={formatHeight(hStats.avg, unit)} />
                </View>
              </Card>
            ) : null}
            {tab === 'pulse' && pStats ? (
              <Card style={{ marginTop: 12 }}>
                <View style={s.stats}>
                  <Stat label="scans" value={String(pStats.n)} />
                  <Stat label="avg bpm" value={Math.round(pStats.avg).toString()} accent={COLORS.coral} />
                  <Stat label="range" value={`${Math.round(pStats.min)}–${Math.round(pStats.max)}`} />
                </View>
              </Card>
            ) : null}
            <SectionHead
              title={tab === 'heights' ? 'Saved measurements' : 'Pulse readings'}
              sub={tab === 'heights' ? 'Tap units above to convert everything' : 'Zones follow typical resting ranges'}
              right={
                (tab === 'heights' ? heights : pulses).length ? (
                  <Pressable onPress={tab === 'heights' ? clearHeights : clearPulses}>
                    <Text style={s.clear}>Clear all</Text>
                  </Pressable>
                ) : undefined
              }
            />
          </View>
        }
        renderItem={({ item }: any) =>
          tab === 'heights' ? (
            <Card style={s.row}>
              <View style={s.rowIcon}>
                <Ionicons name={item.cm >= 100 ? 'person' : 'cube'} size={20} color={COLORS.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowT}>{formatHeight(item.cm, unit)}</Text>
                <Text style={s.rowS}>
                  {item.label} · {item.distanceCm}cm away{item.topDeg !== undefined ? ` · ${item.topDeg.toFixed(0)}°/${item.bottomDeg?.toFixed(0) ?? '–'}°` : ''} · {timeAgo(item.createdAt)}
                </Text>
              </View>
              <Pressable onPress={() => delHeight(item.id)} style={s.del}>
                <Ionicons name="trash-outline" size={17} color={COLORS.faint} />
              </Pressable>
            </Card>
          ) : (
            <Card style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: 'rgba(251,113,133,0.12)' }]}>
                <Ionicons name="heart" size={20} color={bpmZone(item.bpm).color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowT}>
                  {Math.round(item.bpm)} <Text style={s.bpmU}>bpm</Text>
                  <Text style={[s.zone, { color: bpmZone(item.bpm).color }]}>  · {bpmZone(item.bpm).label}</Text>
                </Text>
                <Text style={s.rowS}>{item.durationSec}s scan · signal {item.quality}% · {timeAgo(item.createdAt)}</Text>
              </View>
              <Pressable onPress={() => delPulse(item.id)} style={s.del}>
                <Ionicons name="trash-outline" size={17} color={COLORS.faint} />
              </Pressable>
            </Card>
          )
        }
        ListEmptyComponent={
          tab === 'heights' ? (
            <Card><EmptyState icon="resize" title="No heights yet" sub="Go to Measure, aim the camera at anything, lock two angles and save it here." /></Card>
          ) : (
            <Card><EmptyState icon="heart" title="No pulse scans yet" sub="Go to Pulse, cover the lens + flash with a fingertip and hold still for 30 seconds." /></Card>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wrap: { paddingHorizontal: 16, paddingTop: 10, maxWidth: 640, alignSelf: 'center', width: '100%' },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  stats: { flexDirection: 'row' },
  clear: { fontSize: 12.5, color: COLORS.red, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: 'rgba(45,212,191,0.12)', alignItems: 'center', justifyContent: 'center' },
  rowT: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  bpmU: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  zone: { fontSize: 12, fontWeight: '700' },
  rowS: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  del: { padding: 8 },
});
