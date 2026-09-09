import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { submitPrices } from '../services/stations'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import type { FuelCode, Station } from '../types'

const labels: Record<FuelCode, string> = { gasolina: 'Gasolina comum', gasolina_aditivada: 'Gasolina aditivada', gasolina_premium: 'Gasolina premium', etanol: 'Etanol', etanol_aditivado: 'Etanol aditivado', diesel_s10: 'Diesel S10', diesel_s10_aditivado: 'Diesel S10 aditivado', diesel_s500: 'Diesel S500', diesel_s500_aditivado: 'Diesel S500 aditivado', gnv: 'GNV' }

export function PriceModal({ visible, station, initialFuel, userId, onClose, onSent }: { visible: boolean; station: Station | null; initialFuel: FuelCode; userId: string | null; onClose: () => void; onSent: () => void }) {
  const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors])
  const options = useMemo(() => station?.fuelCodes?.length ? station.fuelCodes : Object.keys(labels) as FuelCode[], [station])
  const [fuel, setFuel] = useState(initialFuel)
  const [drafts, setDrafts] = useState<Partial<Record<FuelCode, string>>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const price = drafts[fuel] ?? ''
  const completed = options.filter((code) => {
    const value = Number((drafts[code] ?? '').replace(',', '.'))
    return Number.isFinite(value) && value >= .5 && value <= 30
  })

  function resetForm() {
    setDrafts({})
    setMessage('')
    setFuel(options.includes(initialFuel) ? initialFuel : options[0] ?? 'gasolina')
  }

  async function send() {
    if (!station || !userId) return
    if (!completed.length) return setMessage('Informe ao menos um preço entre R$ 0,50 e R$ 30,00.')
    const invalidFilled = options.some((code) => drafts[code]?.trim() && !completed.includes(code))
    if (invalidFilled) return setMessage('Revise os valores preenchidos. Cada preço deve ficar entre R$ 0,50 e R$ 30,00.')
    setBusy(true); setMessage('')
    try {
      await submitPrices({ stationId: station.id, prices: completed.map((code) => ({ fuel: code, price: Number((drafts[code] ?? '').replace(',', '.')) })), userId })
      setDrafts({}); onSent()
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o preço.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onShow={resetForm} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}><Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} /><View style={styles.card}><View style={styles.handle} /><Text style={styles.eyebrow}>ATUALIZAÇÃO RÁPIDA</Text><Text style={styles.title}>{station?.name}</Text><Text style={styles.description}>Informe um ou vários preços. Cada combustível guarda seu próprio valor até o envio.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fuels}>{options.map((code) => <Pressable key={code} style={[styles.fuel, fuel === code && styles.fuelActive]} onPress={() => { setFuel(code); setMessage('') }}><Text style={[styles.fuelText, fuel === code && styles.fuelTextActive]}>{completed.includes(code) ? '✓ ' : ''}{labels[code]}</Text></Pressable>)}</ScrollView><Text style={styles.selectedFuel}>{labels[fuel]?.toUpperCase()}</Text><View style={styles.money}><Text style={styles.currency}>R$</Text><TextInput key={fuel} accessibilityLabel={`Preço de ${labels[fuel]}`} autoFocus keyboardType="decimal-pad" placeholder="5,89" placeholderTextColor={colors.textMuted} value={price} onChangeText={(value) => setDrafts((current) => ({ ...current, [fuel]: value }))} style={styles.input} /></View><Text style={styles.progress}>{completed.length ? `${completed.length} ${completed.length === 1 ? 'preço pronto' : 'preços prontos'} para enviar` : 'Selecione cada combustível e informe o valor'}</Text>{message ? <Text style={styles.message}>{message}</Text> : null}<Pressable disabled={busy} style={styles.primary} onPress={send}><Text style={styles.primaryText}>{busy ? 'Enviando…' : completed.length > 1 ? `Enviar ${completed.length} preços` : 'Enviar preço'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: colors.scrim }, card: { padding: spacing[5], paddingBottom: spacing[8], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surface }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[5] }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900' }, title: { color: colors.text, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[2] }, description: { color: colors.textMuted, lineHeight: 20, marginTop: spacing[2], marginBottom: spacing[4] }, fuels: { gap: spacing[2], paddingRight: spacing[3] }, fuel: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, fuelActive: { backgroundColor: colors.brand }, fuelText: { color: colors.text, fontSize: 12, fontWeight: '800' }, fuelTextActive: { color: colors.onBrand }, selectedFuel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8, marginTop: spacing[4] }, money: { minHeight: 62, flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], paddingHorizontal: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, currency: { color: colors.brand, fontSize: 20, fontWeight: '900' }, input: { flex: 1, paddingLeft: spacing[3], color: colors.text, fontSize: 27, fontWeight: '900' }, progress: { color: colors.textMuted, fontSize: 11, marginTop: spacing[2] }, message: { color: colors.amber, marginTop: spacing[3] }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing[4], borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontWeight: '900' } })
