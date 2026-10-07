import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadPriceAlertRule, registerPriceAlertDevice, removePriceAlertDevice, removePriceAlertRule, savePriceAlertRule, type PriceAlertRule } from '../../services/priceAlerts'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { userMessageForError } from '../../utils/appError'

type Props = { userId: string; visible: boolean; center: { latitude: number; longitude: number }; fuels: { code: string; name: string }[] }
const distances = [2, 5, 10, 25, 50]

export function PriceAlertCard({ userId, visible, center, fuels }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const [rule, setRule] = useState<PriceAlertRule | null>(null)
  const [fuel, setFuel] = useState('gasolina')
  const [price, setPrice] = useState('')
  const [radiusKm, setRadiusKm] = useState(10)
  const [push, setPush] = useState(false)
  const [area, setArea] = useState({ latitude: center.latitude, longitude: center.longitude })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    loadPriceAlertRule(userId).then((saved) => {
      if (cancelled) return
      setRule(saved)
      if (saved) {
        setFuel(saved.fuel_code); setPrice(String(saved.max_price).replace('.', ',')); setRadiusKm(saved.radius_km)
        setPush(saved.push_enabled); setArea({ latitude: saved.center_lat, longitude: saved.center_long })
      }
    }).catch(() => { if (!cancelled) setMessage('Não foi possível carregar os alertas. Tente abrir o Perfil novamente.') })
    return () => { cancelled = true }
  }, [userId, visible])

  async function save() {
    const maxPrice = Number(price.replace(',', '.'))
    if (!Number.isFinite(maxPrice) || maxPrice < .5 || maxPrice > 30) return setMessage('Informe um preço entre R$ 0,50 e R$ 30,00.')
    if (!fuels.some((item) => item.code === fuel)) return setMessage('Escolha um combustível válido.')
    setBusy(true); setMessage('')
    try {
      // Register before enabling push, so a failed permission cannot leave an active remote rule.
      if (push) await registerPriceAlertDevice()
      else await removePriceAlertDevice()
      const next: PriceAlertRule = { user_id: userId, fuel_code: fuel, center_lat: area.latitude, center_long: area.longitude, radius_km: radiusKm, max_price: maxPrice, push_enabled: push }
      await savePriceAlertRule(next)
      setRule(next)
      setMessage('Alerta salvo. Avisaremos quando surgir um preço recente e confiável nessa área.')
    } catch (error) { setMessage(userMessageForError(error, 'Não foi possível salvar o alerta.')) }
    finally { setBusy(false) }
  }

  async function disable() {
    setBusy(true); setMessage('')
    try { await removePriceAlertRule(userId); setRule(null); setPush(false); setMessage('Alerta desativado.') }
    catch (error) { setMessage(userMessageForError(error, 'Não foi possível desativar o alerta.')) }
    finally { setBusy(false) }
  }

  return <View style={styles.card}>
    <Text style={styles.title}>Alerta de preço</Text>
    <Text style={styles.copy}>Escolha um limite e uma área. Sem localização em segundo plano. Só avisamos sobre preços de até 5 dias, com confiança de pelo menos 70%, no máximo uma vez por dia.</Text>
    <Text style={styles.label}>Combustível</Text>
    <View style={styles.options}>{fuels.map((item) => <Pressable key={item.code} accessibilityRole="button" accessibilityState={{ selected: fuel === item.code }} style={[styles.option, fuel === item.code && styles.selected]} onPress={() => setFuel(item.code)}><Text style={[styles.optionText, fuel === item.code && styles.selectedText]}>{item.name}</Text></Pressable>)}</View>
    <Text style={styles.label}>Preço máximo por litro</Text>
    <TextInput accessibilityLabel="Preço máximo do alerta" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="Ex.: 5,50" placeholderTextColor={colors.textMuted} style={styles.input} />
    <Text style={styles.label}>Raio</Text>
    <View style={styles.options}>{distances.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: radiusKm === value }} style={[styles.option, radiusKm === value && styles.selected]} onPress={() => setRadiusKm(value)}><Text style={[styles.optionText, radiusKm === value && styles.selectedText]}>{value} km</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" style={styles.areaButton} onPress={() => { setArea(center); setMessage('Área do mapa selecionada. Salve para atualizar o alerta.') }}><Text style={styles.areaText}>Usar área exibida no mapa</Text></Pressable>
    <Text style={styles.hint}>Centro aproximado: {area.latitude.toFixed(2)}, {area.longitude.toFixed(2)}. A área é arredondada antes de ser salva.</Text>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: push }} style={styles.pushRow} onPress={() => setPush(!push)}><Text style={styles.pushLabel}>Notificar também fora do aplicativo</Text><Text style={styles.pushValue}>{push ? 'Ativado' : 'Desativado'}</Text></Pressable>
    <Pressable disabled={busy} accessibilityRole="button" style={styles.saveButton} onPress={save}><Text style={styles.saveText}>{busy ? 'Aguarde…' : rule ? 'Atualizar alerta' : 'Criar alerta'}</Text></Pressable>
    {rule ? <Pressable disabled={busy} accessibilityRole="button" style={styles.removeButton} onPress={disable}><Text style={styles.removeText}>Desativar alerta</Text></Pressable> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    <Text style={styles.activityHint}>Os avisos recebidos ficam na aba Atividade. Toque neles para abrir o posto no mapa.</Text>
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { marginBottom: spacing[4], padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  title: { color: colors.offWhite, fontSize: typography.h3, fontFamily: typography.black },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing[2] },
  label: { color: colors.offWhite, fontFamily: typography.bold, marginTop: spacing[4], marginBottom: spacing[2] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  option: { minHeight: 44, paddingHorizontal: spacing[3], justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand }, optionText: { color: colors.offWhite, fontFamily: typography.semibold, fontSize: 12 }, selectedText: { color: colors.onBrand },
  input: { minHeight: 48, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.offWhite },
  areaButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, areaText: { color: colors.brandText, fontFamily: typography.bold },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: spacing[2] },
  pushRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2], marginTop: spacing[4] }, pushLabel: { color: colors.offWhite, flex: 1, fontFamily: typography.semibold }, pushValue: { color: colors.brandText, fontFamily: typography.bold },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand, marginTop: spacing[3] }, saveText: { color: colors.onBrand, fontFamily: typography.black },
  removeButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, removeText: { color: colors.dangerText, fontFamily: typography.bold }, message: { color: colors.warningText, fontSize: 12, marginVertical: spacing[2] },
  activityHint: { color: colors.infoText, fontFamily: typography.semibold, fontSize: 12, lineHeight: 18, marginTop: spacing[4] },
})
