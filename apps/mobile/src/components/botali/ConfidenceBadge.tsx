import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'

export function ConfidenceBadge({ score }: { score: number }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const level = score >= 90 ? 'Alta' : score >= 70 ? 'Boa' : score >= 40 ? 'Média' : 'Baixa'
  return <View accessibilityLabel={`Confiança ${level}, ${score} por cento`} style={[styles.badge, score < 70 && styles.warning, score < 40 && styles.danger]}><Text style={[styles.text, score < 70 && styles.warningText, score < 40 && styles.dangerText]}>{level} · {score}%</Text></View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ badge: { paddingHorizontal: spacing[2], paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.brand }, warning: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.amber }, danger: { borderColor: colors.danger }, text: { color: colors.onBrand, fontFamily: typography.black, fontSize: 10 }, warningText: { color: colors.warningText }, dangerText: { color: colors.dangerText } })
