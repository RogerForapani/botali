import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../../theme/tokens'

export function ConfidenceBadge({ score }: { score: number }) {
  const level = score >= 90 ? 'Alta' : score >= 70 ? 'Boa' : score >= 40 ? 'Média' : 'Baixa'
  return <View style={[styles.badge, score < 70 && styles.warning, score < 40 && styles.danger]}><Text style={styles.text}>{level} · {score}%</Text></View>
}
const styles = StyleSheet.create({ badge: { paddingHorizontal: spacing[2], paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#143D2A' }, warning: { backgroundColor: '#4A3510' }, danger: { backgroundColor: '#4B1F24' }, text: { color: colors.offWhite, fontSize: 10, fontWeight: '900' } })
