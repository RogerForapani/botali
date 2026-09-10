import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'

export function Button({ children, variant = 'primary', onPress, disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onPress?: () => void; disabled?: boolean }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}><Text style={[styles.text, variant === 'primary' ? styles.primaryText : styles.lightText]}>{children}</Text></Pressable>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ base: { minHeight: 48, paddingHorizontal: spacing[4], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }, primary: { backgroundColor: colors.brand }, secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, ghost: { backgroundColor: 'transparent' }, text: { fontFamily: typography.black }, primaryText: { color: colors.onBrand }, lightText: { color: colors.text }, pressed: { opacity: .82 }, disabled: { opacity: .5 } })
