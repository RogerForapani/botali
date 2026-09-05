import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '../../theme/tokens'

export function Button({ children, variant = 'primary', onPress, disabled = false }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; onPress?: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled]}><Text style={[styles.text, variant === 'primary' ? styles.primaryText : styles.lightText]}>{children}</Text></Pressable>
}

const styles = StyleSheet.create({ base: { minHeight: 48, paddingHorizontal: spacing[4], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }, primary: { backgroundColor: colors.brand }, secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.graphite }, ghost: { backgroundColor: 'transparent' }, text: { fontWeight: '900' }, primaryText: { color: colors.graphite }, lightText: { color: colors.offWhite }, pressed: { opacity: .82 }, disabled: { opacity: .5 } })
