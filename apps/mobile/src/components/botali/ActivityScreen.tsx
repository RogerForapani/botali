import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ActivityItem } from '../../hooks/useActivity'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

type Props = {
  authenticated: boolean
  items: ActivityItem[]
  loading: boolean
  error: string
  alertError: string
  onRetry: () => void
  onSignIn: () => void
  onExplore: () => void
  onOpenAlert: (item: ActivityItem) => void
}

export function ActivityScreen({ authenticated, items, loading, error, alertError, onRetry, onSignIn, onExplore, onOpenAlert }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const alerts = items.filter((item) => item.kind === 'alert')
  const contributions = items.filter((item) => item.kind !== 'alert')

  function renderItem(item: ActivityItem) {
    const isAlert = item.kind === 'alert'
    const unread = isAlert && !item.readAt
    const icon = isAlert ? 'bell-ring-outline' : item.kind === 'price' ? 'currency-usd' : item.kind === 'station' ? 'gas-station-outline' : 'pencil-outline'
    return <Pressable
      key={item.id}
      disabled={!isAlert}
      accessibilityRole={isAlert ? 'button' : undefined}
      accessibilityLabel={isAlert ? `Abrir ${item.stationName} no mapa` : undefined}
      style={({ pressed }) => [styles.card, item.status === 'rejected' && styles.rejectedCard, unread && styles.unreadCard, pressed && styles.cardPressed]}
      onPress={() => onOpenAlert(item)}
    >
      <View style={[styles.kindIcon, isAlert && styles.alertIcon]}><MaterialCommunityIcons name={icon} size={20} color={item.status === 'rejected' ? colors.dangerText : isAlert ? colors.infoText : colors.brandText} /></View>
      <View style={styles.cardCopy}>
        <View style={styles.detailRow}>{unread ? <View style={styles.unreadDot} /> : null}<Text style={[styles.fuel, isAlert && styles.alertLabel]}>{item.detail.toUpperCase()}</Text></View>
        <Text style={styles.station}>{item.stationName}</Text>
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}{typeof item.confidence === 'number' ? ` · confiança ${item.confidence}%` : ''}</Text>
        {isAlert ? <Text style={styles.openHint}>Toque para ver o posto no mapa</Text> : null}
        {item.status === 'rejected' ? <Text style={styles.reason}>{item.reason ? `Motivo: ${item.reason}` : 'A sugestão não foi aprovada pela moderação.'}</Text> : null}
      </View>
      {typeof item.price === 'number' ? <View style={styles.priceColumn}><Text style={styles.price}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>{isAlert ? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} /> : null}</View>
        : item.status ? <View style={[styles.status, item.status === 'rejected' && styles.statusRejected, (item.status === 'verified' || item.status === 'approved') && styles.statusApproved]}><Text style={[styles.statusText, item.status === 'rejected' && styles.statusRejectedText]}>{statusLabel(item.status)}</Text></View> : null}
    </Pressable>
  }

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.eyebrow}>BOTALI</Text><Text style={styles.title}>Atividade</Text></View>
    {!authenticated ? <EmptyState icon="account-circle-outline" title="Entre para ver sua atividade" description="Seus alertas e contribuições ficam organizados aqui." />
      : loading ? <EmptyState icon="progress-clock" title="Carregando sua atividade" description="Buscando seus avisos e contribuições recentes." />
      : error ? <EmptyState icon="alert-circle-outline" title="Atividade indisponível" description={`${error} Use o botão abaixo para tentar novamente.`} />
      : <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionTitle}>Alertas de preço</Text>
        {alertError ? <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.alertError}>{alertError}</Text></Pressable>
          : alerts.length ? alerts.map(renderItem) : <Text style={styles.emptyCopy}>Quando um preço atender ao seu limite, o aviso aparecerá aqui.</Text>}
        <Text style={[styles.sectionTitle, styles.contributionsTitle]}>Suas contribuições</Text>
        {contributions.length ? contributions.map(renderItem) : <Text style={styles.emptyCopy}>Os preços e postos que você enviar aparecerão aqui.</Text>}
      </ScrollView>}
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
  sectionTitle: { color: colors.offWhite, fontSize: typography.h3, fontFamily: typography.black },
  contributionsTitle: { marginTop: spacing[4] },
  emptyCopy: { color: colors.textMuted, fontSize: typography.small, lineHeight: 20, paddingVertical: spacing[2] },
  alertError: { color: colors.warningText, fontSize: typography.small, paddingVertical: spacing[3] },
  card: { minHeight: 80, padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rejectedCard: { borderColor: colors.danger }, unreadCard: { borderColor: colors.info }, cardPressed: { opacity: .76 },
  kindIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  alertIcon: { backgroundColor: `${colors.info}18` },
  cardCopy: { flex: 1 }, detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.info },
  fuel: { color: colors.brandText, fontSize: 10, fontWeight: '900' }, alertLabel: { color: colors.infoText },
  station: { color: colors.offWhite, fontSize: typography.body, fontWeight: '800', marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  openHint: { color: colors.infoText, fontFamily: typography.semibold, fontSize: 11, marginTop: spacing[2] },
  reason: { color: colors.dangerText, fontFamily: typography.semibold, fontSize: 11, lineHeight: 16, marginTop: spacing[2] },
  priceColumn: { alignItems: 'flex-end', gap: spacing[1] },
  price: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900' },
  status: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  statusApproved: { backgroundColor: colors.brand }, statusRejected: { borderWidth: 1, borderColor: colors.danger },
  statusText: { color: colors.text, fontFamily: typography.bold, fontSize: 10 }, statusRejectedText: { color: colors.dangerText },
  action: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})
