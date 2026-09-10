import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadPendingStationEdits, moderateStationEdit, type EditModerationDecision, type PendingStationEdit } from '../services/moderation'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import { EmptyState } from './ui/EmptyState'

export function EditModerationModal({ visible, onClose, onModerated }: { visible: boolean; onClose: () => void; onModerated: () => void }) {
  const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors])
  const [items, setItems] = useState<PendingStationEdit[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decision, setDecision] = useState<EditModerationDecision | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [reload, setReload] = useState(0)
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  useEffect(() => {
    if (!visible) return
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      setLoading(true); setMessage(''); setDecision(null); setReason('')
      try {
        const rows = await loadPendingStationEdits()
        if (active) { setItems(rows); setSelectedId(rows[0]?.id ?? null) }
      } catch (error) { if (active) setMessage(error instanceof Error ? error.message : 'Não foi possível carregar as correções.') }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [visible, reload])

  async function confirm() {
    if (!selected || !decision) return
    if (decision === 'rejected' && reason.trim().length < 5) return setMessage('Explique o motivo da rejeição com pelo menos 5 caracteres.')
    setBusy(true); setMessage('')
    try {
      await moderateStationEdit({ requestId: selected.id, decision, reason })
      setItems((current) => current.filter((item) => item.id !== selected.id)); setSelectedId(null); setDecision(null); setReason('')
      onModerated()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível revisar a correção.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={styles.root} edges={['top', 'bottom']}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>MODERAÇÃO BOTALI</Text><Text style={styles.title}>Correções pendentes</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar moderação" style={styles.close} onPress={onClose}><MaterialCommunityIcons name="close" size={24} color={colors.text} /></Pressable></View>
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.brand} /><Text style={styles.muted}>Carregando correções…</Text></View>
      : message && !items.length ? <View style={styles.center}><EmptyState icon="alert-circle-outline" title="Não foi possível carregar" description={message} /><Pressable onPress={() => setReload((value) => value + 1)} style={styles.retry}><Text style={styles.retryText}>Tentar novamente</Text></Pressable></View>
      : !items.length ? <EmptyState icon="check-decagram-outline" title="Tudo revisado" description="Não há correções aguardando moderação agora." />
      : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queue}>{items.map((item, index) => <Pressable key={item.id} onPress={() => { setSelectedId(item.id); setDecision(null); setReason(''); setMessage('') }} style={[styles.queueItem, selected?.id === item.id && styles.queueActive]}><Text style={[styles.queueText, selected?.id === item.id && styles.queueTextActive]}>{index + 1}. {item.stationName}</Text></Pressable>)}</ScrollView>{selected ? <>
        <View style={styles.card}><Text style={styles.cardEyebrow}>ALTERAÇÃO PROPOSTA</Text><Text style={styles.station}>{selected.stationName}</Text><Text style={styles.date}>Enviada em {new Date(selected.createdAt).toLocaleDateString('pt-BR')}</Text><Comparison label="NOME" before={selected.before.name} after={selected.after.name} styles={styles} /><Comparison label="BANDEIRA" before={selected.before.brand} after={selected.after.brand} styles={styles} /><Comparison label="ENDEREÇO" before={selected.before.address} after={selected.after.address} styles={styles} /><Comparison label="COMBUSTÍVEIS" before={formatList(selected.before.fuel_codes)} after={formatList(selected.after.fuel_codes)} styles={styles} /><Comparison label="SERVIÇOS" before={formatList(selected.before.service_codes)} after={formatList(selected.after.service_codes)} styles={styles} /></View>
        {decision ? <View style={styles.decisionCard}><Text style={styles.decisionTitle}>{decision === 'approved' ? 'Aplicar esta correção?' : 'Rejeitar esta correção?'}</Text><TextInput multiline maxLength={500} value={reason} onChangeText={setReason} placeholder={decision === 'rejected' ? 'Motivo da rejeição (obrigatório)' : 'Observação opcional'} placeholderTextColor={colors.textMuted} style={styles.reason} /><View style={styles.actions}><Pressable disabled={busy} style={styles.secondary} onPress={() => setDecision(null)}><Text style={styles.secondaryText}>Voltar</Text></Pressable><Pressable disabled={busy} style={[styles.primary, decision === 'rejected' && styles.danger]} onPress={confirm}><Text style={styles.primaryText}>{busy ? 'Salvando…' : decision === 'approved' ? 'Aplicar correção' : 'Rejeitar'}</Text></Pressable></View></View>
          : <View style={styles.actions}><Pressable style={styles.secondary} onPress={() => setDecision('rejected')}><Text style={styles.rejectText}>Rejeitar</Text></Pressable><Pressable style={styles.primary} onPress={() => setDecision('approved')}><Text style={styles.primaryText}>Aprovar</Text></Pressable></View>}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </> : null}</ScrollView>}
  </SafeAreaView></Modal>
}

function formatList(items?: string[]) { return items?.length ? items.map((item) => item.replaceAll('_', ' ')).join(', ') : 'Nenhum' }
function Comparison({ label, before, after, styles }: { label: string; before?: string; after?: string; styles: ReturnType<typeof createStyles> }) {
  const changed = before !== after
  return <View style={styles.comparison}><Text style={styles.label}>{label}</Text><Text style={styles.before}>{before || 'Não informado'}</Text><View style={styles.arrowRow}><MaterialCommunityIcons name="arrow-down" size={15} color={changed ? styles.changed.color : styles.muted.color} /><Text style={[styles.after, changed && styles.changed]}>{after || 'Não informado'}</Text></View></View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing[5], borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }, eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 10, letterSpacing: 1.2 }, title: { color: colors.text, fontFamily: typography.black, fontSize: typography.h2, marginTop: spacing[1] }, close: { marginLeft: 'auto', width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }, muted: { color: colors.textMuted, fontFamily: typography.regular }, retry: { minHeight: 48, paddingHorizontal: spacing[5], justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, retryText: { color: colors.onBrand, fontFamily: typography.black }, content: { padding: spacing[4], paddingBottom: spacing[8] }, queue: { gap: spacing[2], paddingBottom: spacing[4] }, queueItem: { minHeight: 44, maxWidth: 190, justifyContent: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, queueActive: { borderColor: colors.brand, backgroundColor: colors.brand }, queueText: { color: colors.text, fontFamily: typography.bold }, queueTextActive: { color: colors.onBrand }, card: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface }, cardEyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 9 }, station: { color: colors.text, fontFamily: typography.black, fontSize: typography.h2, marginTop: spacing[1] }, date: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: spacing[1], marginBottom: spacing[2] }, comparison: { paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }, label: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .8 }, before: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 12, textDecorationLine: 'line-through', marginTop: spacing[1] }, arrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] }, after: { flex: 1, color: colors.text, fontFamily: typography.bold, fontSize: 13 }, changed: { color: colors.brandText }, decisionCard: { marginTop: spacing[3], padding: spacing[4], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.lg, backgroundColor: colors.surface }, decisionTitle: { color: colors.text, fontFamily: typography.black, fontSize: typography.h3 }, reason: { minHeight: 82, marginTop: spacing[3], padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: typography.regular, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[4] }, secondary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, secondaryText: { color: colors.text, fontFamily: typography.bold }, rejectText: { color: colors.dangerText, fontFamily: typography.black }, primary: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, danger: { backgroundColor: colors.danger }, primaryText: { color: colors.onBrand, fontFamily: typography.black }, message: { color: colors.warningText, fontFamily: typography.regular, textAlign: 'center', marginTop: spacing[3] },
})
