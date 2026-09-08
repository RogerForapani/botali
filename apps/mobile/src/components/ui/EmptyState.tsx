import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { spacing, typography, type ThemeColors } from '../../theme/tokens'

export function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <View style={styles.root}><Text style={styles.icon}>{icon}</Text><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] }, icon: { color: colors.brand, fontSize: 36 }, title: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900', textAlign: 'center', marginTop: spacing[3] }, description: { color: colors.textMuted, lineHeight: 21, textAlign: 'center', marginTop: spacing[2] } })
