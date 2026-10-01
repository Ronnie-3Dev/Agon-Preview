import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS } from '../lib/theme';
import type { Unit } from '../lib/measureMath';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type BtnVariant = 'primary' | 'coral' | 'ghost' | 'dark' | 'outline';

export function Btn({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: BtnVariant;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        variant === 'primary' && { backgroundColor: COLORS.teal },
        variant === 'coral' && { backgroundColor: COLORS.coral },
        variant === 'ghost' && { backgroundColor: 'rgba(148,163,184,0.14)' },
        variant === 'dark' && { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.line },
        variant === 'outline' && {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.teal,
        },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.82, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={small ? 15 : 18}
          color={variant === 'primary' ? '#06281F' : variant === 'outline' ? COLORS.teal : COLORS.text}
          style={{ marginRight: 7 }}
        />
      ) : null}
      <Text
        style={[
          s.btnText,
          small && { fontSize: 13 },
          variant === 'primary' && { color: '#06281F' },
          variant === 'outline' && { color: COLORS.teal },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function SegControl<T extends string>({
  options,
  value,
  onChange,
  icons,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  icons?: Record<string, keyof typeof Ionicons.glyphMap>;
}) {
  return (
    <View style={s.segWrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[s.segItem, active && s.segActive]}
          >
            {icons?.[o.value] ? (
              <Ionicons
                name={icons[o.value]}
                size={15}
                color={active ? '#06281F' : COLORS.muted}
                style={{ marginRight: 6 }}
              />
            ) : null}
            <Text style={[s.segText, active && s.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function UnitPicker({ value, onChange }: { value: Unit; onChange: (u: Unit) => void }) {
  const units: Unit[] = ['cm', 'm', 'ft', 'in'];
  return (
    <View style={s.unitRow}>
      {units.map((u) => {
        const active = u === value;
        return (
          <Pressable key={u} onPress={() => onChange(u)} style={[s.unitChip, active && s.unitChipActive]}>
            <Text style={[s.unitText, active && s.unitTextActive]}>{u}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  value,
  onChange,
  suffix,
  keyboard = 'decimal-pad',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  suffix?: string;
  keyboard?: 'decimal-pad' | 'numeric' | 'default';
  placeholder?: string;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldBox}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          placeholder={placeholder}
          placeholderTextColor={COLORS.faint}
          style={s.fieldInput}
          returnKeyType="done"
        />
        {suffix ? <Text style={s.fieldSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <View style={s.secHead}>
      <View style={{ flex: 1 }}>
        <Text style={s.secTitle}>{title}</Text>
        {sub ? <Text style={s.secSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={30} color={COLORS.teal} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statVal, accent && { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 11 },
  btnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 13,
    padding: 4,
  },
  segItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segActive: { backgroundColor: COLORS.teal },
  segText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  segTextActive: { color: '#06281F' },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unitChipActive: { backgroundColor: 'rgba(45,212,191,0.16)', borderColor: COLORS.teal },
  unitText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  unitTextActive: { color: COLORS.teal },
  fieldWrap: { marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 7, letterSpacing: 0.4 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg2,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
  },
  fieldInput: { flex: 1, color: COLORS.text, fontSize: 17, fontWeight: '600', paddingVertical: 13 },
  fieldSuffix: { color: COLORS.faint, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  secHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 18 },
  secTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  secSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(45,212,191,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statVal: { fontSize: 19, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 3, fontWeight: '600' },
});
