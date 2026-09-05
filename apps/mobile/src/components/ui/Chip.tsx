import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing, typography } from '../../theme/tokens'

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}><Text style={[styles.text, selected && styles.selectedText]}>{label}</Text></Pressable>
}
const styles = StyleSheet.create({ chip: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.graphite }, selected: { backgroundColor: colors.brand }, text: { color: colors.offWhite, fontWeight: '700', fontSize: typography.small }, selectedText: { color: colors.graphite } })
