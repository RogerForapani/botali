import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'

export function FlexRatioBadge({ percentage }: { percentage: number }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const favorable = percentage <= 70
  return <View accessibilityLabel={`Etanol custa ${percentage} por cento do preço da gasolina`} style={[styles.badge, favorable ? styles.good : styles.warning]}><Text style={[styles.text, favorable ? styles.goodText : styles.warningText]}>{favorable ? 'Etanol compensa' : 'Gasolina tende a compensar'} · {percentage}%</Text></View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 5, borderRadius: radius.full, borderWidth: 1 }, good: { backgroundColor: colors.surfaceAlt, borderColor: colors.brand }, warning: { backgroundColor: colors.surfaceAlt, borderColor: colors.amber }, text: { fontFamily: typography.bold, fontSize: 10 }, goodText: { color: colors.brandText }, warningText: { color: colors.warningText } })
