import type { ComponentProps } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useTheme } from '../../theme/ThemeProvider'
import { spacing, typography, type ThemeColors } from '../../theme/tokens'

export function EmptyState({ icon, title, description }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; description: string }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <View style={styles.root}><MaterialCommunityIcons name={icon} size={38} color={colors.brandText} /><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] }, title: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.h3, textAlign: 'center', marginTop: spacing[3] }, description: { color: colors.textMuted, fontFamily: typography.regular, lineHeight: 21, textAlign: 'center', marginTop: spacing[2] } })
