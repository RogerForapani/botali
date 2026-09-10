import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadStationOptions, submitStationEdit } from '../services/stations'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import type { Station } from '../types'
import { Chip } from './ui/Chip'

type CatalogOption = { code: string; name: string }
type Props = { visible: boolean; station: Station | null; onClose: () => void; onSent: () => void }

export function EditStationModal({ visible, station, onClose, onSent }: Props) {
  const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors])
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [address, setAddress] = useState('')
  const [brands, setBrands] = useState<string[]>([])
  const [fuels, setFuels] = useState<CatalogOption[]>([])
  const [services, setServices] = useState<CatalogOption[]>([])
  const [fuelCodes, setFuelCodes] = useState<string[]>([])
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visible || !station) return
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      setName(station.name); setBrand(station.brand); setAddress(station.address ?? '')
      setFuelCodes(station.fuelCodes ?? []); setServiceCodes(station.serviceCodes ?? []); setMessage('')
      try {
        const options = await loadStationOptions()
        if (!active) return
        setBrands(options.brands.map((item) => item.name)); setFuels(options.fuels as CatalogOption[]); setServices(options.services as CatalogOption[])
      } catch { if (active) setMessage('Não foi possível carregar todas as opções.') }
    })
    return () => { active = false }
  }, [visible, station])

  const toggle = (code: string, values: string[], setValues: (value: string[]) => void) => setValues(values.includes(code) ? values.filter((item) => item !== code) : [...values, code])

  async function send() {
    if (!station) return
    if (name.trim().length < 2 || brand.trim().length < 2 || address.trim().length < 3) return setMessage('Revise nome, bandeira e endereço.')
    if (!fuelCodes.length && !serviceCodes.some((code) => code === 'recarga_ac' || code === 'recarga_dc')) return setMessage('Selecione ao menos um combustível ou tipo de recarga.')
    const sameCodes = (left: string[], right: string[]) => [...left].sort().join('|') === [...right].sort().join('|')
    if (name.trim() === station.name.trim() && brand.trim() === station.brand.trim() && address.trim() === (station.address ?? '').trim() && sameCodes(fuelCodes, station.fuelCodes ?? []) && sameCodes(serviceCodes, station.serviceCodes ?? [])) return setMessage('Altere pelo menos uma informação antes de enviar.')
    setBusy(true); setMessage('')
    try {
      await submitStationEdit({ stationId: station.id, name, brand, address, fuelCodes, serviceCodes })
      onSent()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a correção.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
      <View style={styles.card}><View style={styles.handle} /><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.eyebrow}>SUGERIR CORREÇÃO</Text><Text style={styles.title}>{station?.name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar correção" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={23} color={colors.offWhite} /></Pressable></View>
        <Text style={styles.description}>Sua alteração será revisada antes de aparecer para todos.</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <Text style={styles.label}>BANDEIRA</Text><View style={styles.options}>{brands.map((item) => <Chip key={item} label={item} selected={brand === item} onPress={() => setBrand(item === 'Outra' ? '' : item)} />)}</View>
          <Field label="Nome do posto" value={name} onChangeText={setName} placeholder="Nome exibido no posto" styles={styles} colors={colors} />
          <Field label="Bandeira" value={brand} onChangeText={setBrand} placeholder="Digite quando não estiver na lista" styles={styles} colors={colors} />
          <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua e número" styles={styles} colors={colors} />
          <Text style={styles.label}>COMBUSTÍVEIS DISPONÍVEIS</Text><View style={styles.options}>{fuels.map((item) => <Chip key={item.code} label={item.name} selected={fuelCodes.includes(item.code)} onPress={() => toggle(item.code, fuelCodes, setFuelCodes)} />)}</View>
          <Text style={styles.label}>SERVIÇOS DISPONÍVEIS</Text><View style={styles.options}>{services.map((item) => <Chip key={item.code} label={item.name} selected={serviceCodes.includes(item.code)} onPress={() => toggle(item.code, serviceCodes, setServiceCodes)} />)}</View>
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={busy} onPress={send} style={styles.primary}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Enviar para revisão'}</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

function Field({ label, styles, colors, ...props }: { label: string; styles: ReturnType<typeof createStyles>; colors: ThemeColors; value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <View><Text style={styles.label}>{label.toUpperCase()}</Text><TextInput {...props} placeholderTextColor={colors.textMuted} style={styles.input} /></View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: colors.scrim }, card: { maxHeight: '92%', padding: spacing[5], paddingBottom: spacing[6], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[4] },
  heading: { flexDirection: 'row', alignItems: 'center' }, headingCopy: { flex: 1 }, close: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 10, letterSpacing: 1.2 }, title: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.h2, marginTop: spacing[1] }, description: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 13, lineHeight: 18, marginTop: spacing[2], marginBottom: spacing[3] },
  form: { gap: spacing[3], paddingBottom: spacing[4] }, label: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginBottom: spacing[1] }, input: { minHeight: 48, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.offWhite, fontFamily: typography.regular }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, message: { color: colors.warningText, fontFamily: typography.regular, fontSize: 12, lineHeight: 17 }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontFamily: typography.black },
})
