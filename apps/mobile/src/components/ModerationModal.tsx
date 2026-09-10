import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from './ui/EmptyState'
import { loadPendingStations, moderateStation, type ModerationDecision, type PendingStation } from '../services/moderation'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'

export function ModerationModal({ visible, onClose, onModerated }: { visible: boolean; onClose: () => void; onModerated: () => void }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [stations, setStations] = useState<PendingStation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decision, setDecision] = useState<ModerationDecision | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const selected = stations.find((station) => station.id === selectedId) ?? stations[0] ?? null

  useEffect(() => {
    if (!visible) return
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      setDecision(null); setReason(''); setLoading(true); setMessage(''); setLoadError('')
      try {
        const rows = await loadPendingStations()
        if (!active) return
        setStations(rows)
        setSelectedId((current) => rows.some((station) => station.id === current) ? current : rows[0]?.id ?? null)
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os postos pendentes.')
      } finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [visible, reloadToken])

  async function confirmDecision() {
    if (!selected || !decision) return
    if (decision === 'rejected' && reason.trim().length < 5) {
      setMessage('Explique o motivo da rejeição com pelo menos 5 caracteres.')
      return
    }
    setBusy(true); setMessage('')
    try {
      await moderateStation({ stationId: selected.id, decision, reason })
      setStations((current) => current.filter((station) => station.id !== selected.id))
      setSelectedId(null); setDecision(null); setReason('')
      setMessage(decision === 'verified' ? 'Posto aprovado e publicado no mapa.' : 'Posto rejeitado.')
      onModerated()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a revisão.')
    } finally { setBusy(false) }
  }

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>MODERAÇÃO BOTALI</Text><Text style={styles.title}>Postos pendentes</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar moderação" style={styles.close} onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={colors.text} /></Pressable>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text style={styles.muted}>Carregando cadastros…</Text></View> : loadError ? <View style={styles.errorState}><EmptyState icon="alert-circle-outline" title="Não foi possível carregar" description={loadError} /><Pressable accessibilityRole="button" style={styles.retryButton} onPress={() => setReloadToken((value) => value + 1)}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View> : !stations.length ? <><EmptyState icon="check-decagram-outline" title="Tudo revisado" description="Não há postos aguardando moderação agora." />{message ? <Text accessibilityLiveRegion="polite" style={styles.successMessage}>{message}</Text> : null}</> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queue}>
          {stations.map((station, index) => <Pressable key={station.id} accessibilityRole="button" accessibilityState={{ selected: selected?.id === station.id }} onPress={() => { setSelectedId(station.id); setDecision(null); setReason(''); setMessage('') }} style={[styles.queueItem, selected?.id === station.id && styles.queueItemActive]}><Text style={[styles.queueIndex, selected?.id === station.id && styles.queueTextActive]}>{index + 1}</Text><Text numberOfLines={1} style={[styles.queueName, selected?.id === station.id && styles.queueTextActive]}>{station.name}</Text></Pressable>)}
        </ScrollView>
        {selected ? <>
          <View style={styles.card}>
            <Text style={styles.brand}>{selected.brand.toUpperCase()}</Text><Text style={styles.stationName}>{selected.name}</Text>
            <Text style={styles.date}>Enviado em {new Date(selected.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            <Detail label="ENDEREÇO" value={selected.address} styles={styles} />
            <Detail label="COORDENADAS" value={`${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`} styles={styles} />
            <Detail label="COMBUSTÍVEIS" value={selected.fuels.join(', ') || 'Nenhum informado'} styles={styles} />
            <Detail label="SERVIÇOS RELATADOS" value={selected.services.join(', ') || 'Nenhum informado'} styles={styles} />
            <View style={styles.detail}><Text style={styles.detailLabel}>PREÇOS ENVIADOS</Text>{selected.priceReports.length ? selected.priceReports.map((report, index) => <Text key={`${report.fuel}-${index}`} style={styles.detailValue}>{report.fuel}: R$ {report.price.toFixed(2).replace('.', ',')}</Text>) : <Text style={styles.detailValue}>Nenhum preço informado</Text>}</View>
          </View>
          {decision ? <View style={[styles.confirmCard, decision === 'rejected' && styles.rejectCard]}>
            <Text style={styles.confirmTitle}>{decision === 'verified' ? 'Confirmar aprovação?' : 'Confirmar rejeição?'}</Text>
            <Text style={styles.confirmCopy}>{decision === 'verified' ? 'O posto e seus serviços relatados ficarão visíveis para todos.' : 'O posto deixará a fila e não aparecerá no mapa.'}</Text>
            <TextInput accessibilityLabel="Observação da moderação" value={reason} onChangeText={setReason} maxLength={500} multiline placeholder={decision === 'rejected' ? 'Motivo da rejeição (obrigatório)' : 'Observação opcional'} placeholderTextColor={colors.textMuted} style={styles.reason} />
            <View style={styles.confirmActions}><Pressable disabled={busy} style={styles.cancelButton} onPress={() => { setDecision(null); setReason(''); setMessage('') }}><Text style={styles.cancelText}>Voltar</Text></Pressable><Pressable disabled={busy} style={[styles.finalButton, decision === 'rejected' && styles.finalReject]} onPress={confirmDecision}><Text style={[styles.finalText, decision === 'rejected' && styles.finalRejectText]}>{busy ? 'Salvando…' : decision === 'verified' ? 'Publicar posto' : 'Rejeitar posto'}</Text></Pressable></View>
          </View> : <View style={styles.actions}><Pressable accessibilityRole="button" style={styles.rejectButton} onPress={() => setDecision('rejected')}><Text style={styles.rejectText}>Rejeitar</Text></Pressable><Pressable accessibilityRole="button" style={styles.approveButton} onPress={() => setDecision('verified')}><Text style={styles.approveText}>Aprovar</Text></Pressable></View>}
        </> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      </ScrollView>}
    </SafeAreaView>
  </Modal>
}

function Detail({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  eyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[1] },
  close: { marginLeft: 'auto', width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }, muted: { color: colors.textMuted }, errorState: { flex: 1, paddingBottom: spacing[8] }, retryButton: { alignSelf: 'center', minHeight: 48, paddingHorizontal: spacing[5], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, retryText: { color: colors.onBrand, fontWeight: '900' },
  content: { padding: spacing[4], paddingBottom: spacing[8] }, queue: { gap: spacing[2], paddingBottom: spacing[4] }, queueItem: { width: 150, padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, queueItemActive: { borderColor: colors.brand, backgroundColor: colors.brand }, queueIndex: { color: colors.brandText, fontWeight: '900' }, queueName: { flex: 1, color: colors.text, fontWeight: '800' }, queueTextActive: { color: colors.onBrand },
  card: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface }, brand: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: .8 }, stationName: { color: colors.text, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[1] }, date: { color: colors.textMuted, fontSize: 12, marginTop: spacing[1], marginBottom: spacing[3] },
  detail: { paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }, detailLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8, marginBottom: spacing[1] }, detailValue: { color: colors.text, fontSize: typography.small, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }, rejectButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md }, rejectText: { color: colors.dangerText, fontWeight: '900' }, approveButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, approveText: { color: colors.onBrand, fontWeight: '900' },
  confirmCard: { marginTop: spacing[4], padding: spacing[4], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.lg, backgroundColor: colors.surface }, rejectCard: { borderColor: colors.danger }, confirmTitle: { color: colors.text, fontSize: typography.h3, fontWeight: '900' }, confirmCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing[1] }, reason: { minHeight: 82, marginTop: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.text, textAlignVertical: 'top' }, confirmActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }, cancelButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, cancelText: { color: colors.text, fontWeight: '800' }, finalButton: { flex: 1.5, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, finalReject: { backgroundColor: colors.danger }, finalText: { color: colors.onBrand, fontWeight: '900' }, finalRejectText: { color: '#FFFFFF' },
  message: { marginTop: spacing[3], color: colors.warningText, textAlign: 'center' }, successMessage: { paddingHorizontal: spacing[5], paddingBottom: spacing[8], color: colors.brandText, textAlign: 'center' },
})
