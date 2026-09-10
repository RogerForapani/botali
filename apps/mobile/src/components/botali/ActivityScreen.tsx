import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ActivityItem } from '../../hooks/useActivity'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

type Props = { authenticated: boolean; items: ActivityItem[]; loading: boolean; error: string; onRetry: () => void; onSignIn: () => void; onExplore: () => void }

export function ActivityScreen({ authenticated, items, loading, error, onRetry, onSignIn, onExplore }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.eyebrow}>BOTALI</Text><Text style={styles.title}>Atividade</Text></View>
    {!authenticated ? <EmptyState icon="account-circle-outline" title="Entre para ver suas contribuições" description="Seus preços enviados ficam organizados neste histórico." />
      : loading ? <EmptyState icon="progress-clock" title="Carregando sua atividade" description="Buscando suas contribuições mais recentes." />
      : error ? <EmptyState icon="alert-circle-outline" title="Atividade indisponível" description={`${error} Use o botão abaixo para tentar novamente.`} />
      : items.length ? <ScrollView contentContainerStyle={styles.list}>{items.map((item) => <View key={item.id} style={styles.card}><View style={styles.kindIcon}><MaterialCommunityIcons name={item.kind === 'price' ? 'currency-usd' : item.kind === 'station' ? 'gas-station-outline' : 'pencil-outline'} size={20} color={colors.brandText} /></View><View style={styles.cardCopy}><Text style={styles.fuel}>{item.detail.toUpperCase()}</Text><Text style={styles.station}>{item.stationName}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View>{typeof item.price === 'number' ? <Text style={styles.price}>R$ {item.price.toFixed(2).replace('.', ',')}</Text> : item.status ? <View style={[styles.status, item.status === 'rejected' && styles.statusRejected, (item.status === 'verified' || item.status === 'approved') && styles.statusApproved]}><Text style={[styles.statusText, item.status === 'rejected' && styles.statusRejectedText]}>{statusLabel(item.status)}</Text></View> : null}</View>)}</ScrollView>
      : <EmptyState icon="history" title="Sua atividade vai aparecer aqui" description="Os preços que você enviar serão organizados neste histórico." />}
    <View style={styles.action}><Button onPress={!authenticated ? onSignIn : error ? onRetry : onExplore}>{!authenticated ? 'Entrar' : error ? 'Tentar novamente' : 'Explorar mapa'}</Button></View>
  </SafeAreaView>
}

function statusLabel(status: NonNullable<ActivityItem['status']>) {
  if (status === 'pending') return 'Em revisão'
  if (status === 'rejected') return 'Rejeitado'
  return 'Aprovado'
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, paddingBottom: 82, backgroundColor: colors.graphite },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] },
  eyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.offWhite, fontSize: typography.h1, fontWeight: '900', marginTop: spacing[1] },
  list: { padding: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  kindIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  cardCopy: { flex: 1 },
  fuel: { color: colors.brandText, fontSize: 10, fontWeight: '900' },
  station: { color: colors.offWhite, fontSize: typography.body, fontWeight: '800', marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  price: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900' },
  status: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, statusApproved: { backgroundColor: colors.brand }, statusRejected: { borderWidth: 1, borderColor: colors.danger }, statusText: { color: colors.text, fontFamily: typography.bold, fontSize: 10 }, statusRejectedText: { color: colors.dangerText },
  action: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})
