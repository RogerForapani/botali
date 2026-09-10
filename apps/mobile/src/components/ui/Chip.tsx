import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export function Chip({ label, icon, selected, onPress }: { label: string; icon?: IconName; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}>{icon ? <MaterialCommunityIcons name={icon} size={17} color={selected ? colors.onBrand : colors.text} /> : null}<Text style={[styles.text, selected && styles.selectedText]}>{label}</Text></Pressable>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ chip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, selected: { backgroundColor: colors.brand }, text: { color: colors.text, fontFamily: typography.bold, fontSize: typography.small }, selectedText: { color: colors.onBrand } })
