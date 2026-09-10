import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}><Text style={[styles.text, selected && styles.selectedText]}>{label}</Text></Pressable>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ chip: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, selected: { backgroundColor: colors.brand }, text: { color: colors.text, fontWeight: '700', fontSize: typography.small }, selectedText: { color: colors.onBrand } })
