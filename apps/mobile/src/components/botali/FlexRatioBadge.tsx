import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../../theme/tokens'

export function FlexRatioBadge({ percentage }: { percentage: number }) {
  const favorable = percentage <= 70
  return <View style={[styles.badge, favorable ? styles.good : styles.warning]}><Text style={styles.text}>{favorable ? 'Etanol compensa' : 'Gasolina tende a compensar'} · {percentage}%</Text></View>
}
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: spacing[2], paddingVertical: 5, borderRadius: radius.full }, good: { backgroundColor: '#143D2A' }, warning: { backgroundColor: '#4A3510' }, text: { color: colors.offWhite, fontSize: 10, fontWeight: '800' } })
