import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { submitPrice } from '../services/stations'
import { colors, radius, spacing, typography } from '../theme/tokens'
import type { FuelCode, Station } from '../types'

const labels: Record<FuelCode, string> = { gasolina: 'Gasolina', etanol: 'Etanol', diesel_s10: 'Diesel S10' }

export function PriceModal({ visible, station, initialFuel, userId, onClose, onSent }: { visible: boolean; station: Station | null; initialFuel: FuelCode; userId: string | null; onClose: () => void; onSent: () => void }) {
  const [fuel, setFuel] = useState(initialFuel)
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!station || !userId) return
    const value = Number(price.replace(',', '.'))
    if (!Number.isFinite(value) || value < .5 || value > 30) return setMessage('Informe um preço entre R$ 0,50 e R$ 30,00.')
    setBusy(true); setMessage('')
    try { await submitPrice({ stationId: station.id, fuel, price: value, userId }); setPrice(''); onSent() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o preço.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}><Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} /><View style={styles.card}><View style={styles.handle} /><Text style={styles.eyebrow}>ATUALIZAÇÃO RÁPIDA</Text><Text style={styles.title}>{station?.name}</Text><Text style={styles.description}>Viu o valor na bomba? Leva poucos segundos. Foto não é obrigatória.</Text><View style={styles.fuels}>{(Object.keys(labels) as FuelCode[]).map((code) => <Pressable key={code} style={[styles.fuel, fuel === code && styles.fuelActive]} onPress={() => setFuel(code)}><Text style={[styles.fuelText, fuel === code && styles.fuelTextActive]}>{labels[code]}</Text></Pressable>)}</View><View style={styles.money}><Text style={styles.currency}>R$</Text><TextInput accessibilityLabel="Preço por litro" autoFocus keyboardType="decimal-pad" placeholder="5,89" placeholderTextColor={colors.textMuted} value={price} onChangeText={setPrice} style={styles.input} /></View>{message ? <Text style={styles.message}>{message}</Text> : null}<Pressable disabled={busy} style={styles.primary} onPress={send}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Enviar preço'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
}

const styles = StyleSheet.create({ layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: '#02061799' }, card: { padding: spacing[5], paddingBottom: spacing[8], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[5] }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[2] }, description: { color: colors.textMuted, lineHeight: 20, marginTop: spacing[2], marginBottom: spacing[4] }, fuels: { flexDirection: 'row', gap: spacing[2] }, fuel: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surface }, fuelActive: { backgroundColor: colors.brand }, fuelText: { color: colors.offWhite, fontSize: 12, fontWeight: '800' }, fuelTextActive: { color: colors.graphite }, money: { minHeight: 62, flexDirection: 'row', alignItems: 'center', marginTop: spacing[4], paddingHorizontal: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }, currency: { color: colors.brand, fontSize: 20, fontWeight: '900' }, input: { flex: 1, paddingLeft: spacing[3], color: colors.offWhite, fontSize: 27, fontWeight: '900' }, message: { color: colors.amber, marginTop: spacing[3] }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing[4], borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.graphite, fontWeight: '900' } })
