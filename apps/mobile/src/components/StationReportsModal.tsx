import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadPendingStationReports, moderateStationReport, type StationExistenceReport } from '../services/stationReports'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import { userMessageForError } from '../utils/appError'

type Props = { visible: boolean; onClose: () => void; onModerated: () => void }

export function StationReportsModal({ visible, onClose, onModerated }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [reports, setReports] = useState<StationExistenceReport[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const selected = reports.find((item) => item.id === selectedId) ?? reports[0] ?? null

  useEffect(() => {
    if (!visible) return
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      setLoading(true); setMessage(''); setDecision(null)
      try {
        const items = await loadPendingStationReports()
        if (active) { setReports(items); setSelectedId(items[0]?.id ?? null) }
      } catch (error) { if (active) setMessage(userMessageForError(error, 'Não foi possível carregar as sinalizações.')) }
      finally { if (active) setLoading(false) }
    })
    return () => { active = false }
  }, [visible, reload])

  async function submit() {
    if (!selected || !decision) return
    if (decision === 'rejected' && reason.trim().length < 5) return setMessage('Explique a rejeição em pelo menos 5 caracteres.')
    setBusy(true); setMessage('')
    try {
      await moderateStationReport(selected.id, decision, reason)
      setDecision(null); setReason('')
      setMessage(decision === 'approved' ? 'Sinalização aprovada. Posto ocultado do mapa.' : 'Sinalização rejeitada. Posto mantido no mapa.')
      onModerated()
      setReload((value) => value + 1)
    } catch (error) { setMessage(userMessageForError(error, 'Não foi possível concluir a revisão.')) }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>MODERAÇÃO BOTALI</Text><Text style={styles.title}>Postos sinalizados</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar sinalizações" onPress={onClose}><MaterialCommunityIcons name="close" size={26} color={colors.text} /></Pressable></View>
      {loading ? <ActivityIndicator color={colors.brand} size="large" /> : <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!reports.length ? <Text style={styles.muted}>Nenhum posto sinalizado aguardando revisão.</Text> : <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queue}>{reports.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: selected?.id === item.id }} onPress={() => { setSelectedId(item.id); setDecision(null); setReason(''); setMessage('') }} style={styles.queueItem}><Text style={styles.queueText}>{item.stationName} · {item.reporterCount}</Text></Pressable>)}</ScrollView>
          {selected ? <View style={styles.card}><Text style={styles.station}>{selected.stationName}</Text><Text style={styles.muted}>{selected.stationAddress}</Text><Text style={styles.muted}>{selected.reporterCount} {selected.reporterCount === 1 ? 'sinalização' : 'sinalizações'} · desde {new Date(selected.createdAt).toLocaleDateString('pt-BR')}</Text>{selected.reasons.map((item, index) => <Text key={index} style={styles.reason}>“{item}”</Text>)}<Pressable accessibilityRole="link" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`)} style={styles.button}><Text style={styles.buttonText}>Conferir localização no mapa</Text></Pressable></View> : null}
          {decision ? <View style={styles.card}><Text style={styles.station}>{decision === 'approved' ? 'Ocultar este posto do mapa?' : 'Manter este posto no mapa?'}</Text><Text style={styles.muted}>{decision === 'approved' ? 'O cadastro e o histórico serão preservados.' : 'A sinalização será encerrada.'}</Text><TextInput accessibilityLabel="Motivo da decisão" value={reason} onChangeText={setReason} maxLength={500} multiline placeholder={decision === 'rejected' ? 'Motivo obrigatório' : 'Observação opcional'} placeholderTextColor={colors.textMuted} style={styles.input} /><View style={styles.actions}><Pressable onPress={() => setDecision(null)} style={styles.button}><Text style={styles.buttonText}>Voltar</Text></Pressable><Pressable disabled={busy} onPress={submit} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Salvando…' : 'Confirmar'}</Text></Pressable></View></View> : <View style={styles.actions}><Pressable onPress={() => setDecision('rejected')} style={styles.button}><Text style={styles.buttonText}>Rejeitar sinalização</Text></Pressable><Pressable onPress={() => setDecision('approved')} style={styles.button}><Text style={styles.buttonText}>Aprovar e ocultar</Text></Pressable></View>}
        </>}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      </ScrollView>}
    </SafeAreaView>
  </Modal>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5] },
  eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 10 }, title: { color: colors.offWhite, fontFamily: typography.black, fontSize: 22 },
  content: { padding: spacing[5], gap: spacing[3] }, queue: { gap: spacing[2] }, queueItem: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, queueText: { color: colors.offWhite, fontFamily: typography.bold },
  card: { padding: spacing[4], gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, station: { color: colors.offWhite, fontFamily: typography.black, fontSize: 18 }, muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, reason: { color: colors.offWhite, fontSize: 13 },
  input: { minHeight: 60, padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.offWhite, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: spacing[2] }, button: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: spacing[2], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md }, buttonText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 12, textAlign: 'center' }, message: { color: colors.warningText, fontFamily: typography.semibold, fontSize: 12 },
})
