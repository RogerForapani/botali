import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import * as Location from 'expo-location'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadStationOptions, loadStationProfile, submitStationEdit, type StationProfile } from '../services/stations'
import { recordAppFailure } from '../services/diagnostics'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import type { Station } from '../types'
import { userMessageForError } from '../utils/appError'
import { Chip } from './ui/Chip'

type CatalogOption = { code: string; name: string }
type Props = { visible: boolean; station: Station | null; onClose: () => void; onBack?: () => void; onSent: () => void }

export function EditStationModal({ visible, station, onClose, onBack, onSent }: Props) {
  const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors])
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [resolvedAddressKey, setResolvedAddressKey] = useState('')
  const [originalProfile, setOriginalProfile] = useState<StationProfile | null>(null)
  const [brands, setBrands] = useState<string[]>([])
  const [fuels, setFuels] = useState<CatalogOption[]>([])
  const [services, setServices] = useState<CatalogOption[]>([])
  const [fuelCodes, setFuelCodes] = useState<string[]>([])
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!visible || !station) return
    let active = true
    Promise.resolve().then(async () => {
      if (!active) return
      const fallbackAddress = splitAddress(station.address ?? '')
      setName(station.name); setBrand(station.brand); setAddress(fallbackAddress.street); setAddressNumber(fallbackAddress.number)
      setCoordinates({ latitude: station.latitude, longitude: station.longitude }); setResolvedAddressKey('')
      setFuelCodes(station.fuelCodes ?? []); setServiceCodes(station.serviceCodes ?? []); setMessage('')
      try {
        const [options, profile] = await Promise.all([loadStationOptions(), loadStationProfile(station.id)])
        if (!active) return
        setBrands(options.brands.map((item) => item.name)); setFuels(options.fuels as CatalogOption[]); setServices(options.services as CatalogOption[])
        const parsed = splitAddress(profile.address)
        setAddress(parsed.street); setAddressNumber(parsed.number); setNeighborhood(profile.neighborhood); setCity(profile.city); setState(profile.state); setPostalCode(profile.postalCode); setCoordinates({ latitude: profile.latitude, longitude: profile.longitude }); setOriginalProfile(profile)
      } catch (error) { recordAppFailure('station-edit.options', error).catch(() => undefined); if (active) setMessage(userMessageForError(error, 'Não foi possível carregar todas as opções.')) }
    })
    return () => { active = false }
  }, [visible, station])

  const toggle = (code: string, values: string[], setValues: (value: string[]) => void) => setValues(values.includes(code) ? values.filter((item) => item !== code) : [...values, code])

  function addressKey() {
    return [address, addressNumber, neighborhood, city, state, postalCode].map((value) => value.trim().toLocaleLowerCase('pt-BR')).join('|')
  }

  function originalAddressKey() {
    const parsed = splitAddress(originalProfile?.address ?? station?.address ?? '')
    return [parsed.street, parsed.number, originalProfile?.neighborhood ?? '', originalProfile?.city ?? '', originalProfile?.state ?? '', originalProfile?.postalCode ?? ''].map((value) => value.trim().toLocaleLowerCase('pt-BR')).join('|')
  }

  function changeAddressField(update: (value: string) => void, value: string) {
    update(value)
    if (station) setCoordinates({ latitude: originalProfile?.latitude ?? station.latitude, longitude: originalProfile?.longitude ?? station.longitude })
    setResolvedAddressKey('')
    setMessage('O endereço mudou. Localize o novo ponto antes de enviar a correção.')
  }

  async function locateAddress() {
    if (!address.trim() || !addressNumber.trim() || !city.trim() || state.trim().length !== 2) return setMessage('Preencha rua, número, cidade e UF antes de localizar o novo ponto.')
    setLocating(true); setMessage('')
    try {
      if (Platform.OS === 'android') {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (!permission.granted) return setMessage('No Android, permita a localização para converter o endereço em um ponto. Sua posição atual não será usada.')
      }
      const query = [address, addressNumber, neighborhood, city, state, postalCode, 'Brasil'].filter((value) => value.trim()).join(', ')
      const [result] = await Location.geocodeAsync(query)
      if (!result) return setMessage('Não encontramos esse endereço. Revise os dados e tente novamente.')
      setCoordinates({ latitude: result.latitude, longitude: result.longitude })
      setResolvedAddressKey(addressKey())
      setMessage('Novo ponto localizado. A posição só mudará depois da aprovação da moderação.')
    } catch (error) {
      recordAppFailure('station-edit.geocode', error).catch(() => undefined)
      setMessage('Não foi possível localizar esse endereço agora. Revise os dados e tente novamente.')
    } finally { setLocating(false) }
  }

  async function send() {
    if (!station) return
    if (name.trim().length < 2 || brand.trim().length < 2 || address.trim().length < 3 || !addressNumber.trim() || !city.trim() || state.trim().length !== 2) return setMessage('Preencha nome, bandeira, rua, número, cidade e UF. Use S/N quando necessário.')
    if (!fuelCodes.length && !serviceCodes.some((code) => code === 'recarga_ac' || code === 'recarga_dc')) return setMessage('Selecione ao menos um combustível ou tipo de recarga.')
    const addressChanged = addressKey() !== originalAddressKey()
    if (addressChanged && resolvedAddressKey !== addressKey()) return setMessage('Toque em “Localizar endereço corrigido” para atualizar o ponto do posto no mapa.')
    if (!coordinates) return setMessage('Não foi possível identificar o ponto do posto. Feche e tente novamente.')
    const sameCodes = (left: string[], right: string[]) => [...left].sort().join('|') === [...right].sort().join('|')
    const fullAddress = `${address.trim()}, ${addressNumber.trim()}`
    const originalLatitude = originalProfile?.latitude ?? station.latitude
    const originalLongitude = originalProfile?.longitude ?? station.longitude
    const samePoint = Math.abs(coordinates.latitude - originalLatitude) < 0.000001 && Math.abs(coordinates.longitude - originalLongitude) < 0.000001
    if (name.trim() === station.name.trim() && brand.trim() === station.brand.trim() && fullAddress === (originalProfile?.address ?? station.address ?? '').trim() && neighborhood.trim() === (originalProfile?.neighborhood ?? '').trim() && city.trim() === (originalProfile?.city ?? '').trim() && state.trim().toUpperCase() === (originalProfile?.state ?? '').trim().toUpperCase() && postalCode.trim() === (originalProfile?.postalCode ?? '').trim() && samePoint && sameCodes(fuelCodes, station.fuelCodes ?? []) && sameCodes(serviceCodes, station.serviceCodes ?? [])) return setMessage('Altere pelo menos uma informação antes de enviar.')
    setBusy(true); setMessage('')
    try {
      await submitStationEdit({ stationId: station.id, name, brand, address: fullAddress, neighborhood, city, state, postalCode, ...coordinates, fuelCodes, serviceCodes })
      onSent()
    } catch (error) { recordAppFailure('station-edit.submit', error).catch(() => undefined); setMessage(userMessageForError(error, 'Não foi possível enviar a correção.')) }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack ?? onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
      <View style={styles.card}><View style={styles.handle} /><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.eyebrow}>SUGERIR CORREÇÃO</Text><Text style={styles.title}>{station?.name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar correção" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={23} color={colors.offWhite} /></Pressable></View>
        <Text style={styles.description}>Sua alteração será revisada antes de aparecer para todos.</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <Text style={styles.label}>BANDEIRA</Text><View style={styles.options}>{brands.map((item) => <Chip key={item} label={item} selected={brand === item} onPress={() => setBrand(item === 'Outra' ? '' : item)} />)}</View>
          <Field label="Nome do posto" value={name} onChangeText={setName} placeholder="Nome exibido no posto" styles={styles} colors={colors} />
          <Field label="Bandeira" value={brand} onChangeText={setBrand} placeholder="Digite quando não estiver na lista" styles={styles} colors={colors} />
          <View style={styles.row}><View style={styles.grow}><Field label="Rua/Avenida" value={address} onChangeText={(value) => changeAddressField(setAddress, value)} placeholder="Nome da via" styles={styles} colors={colors} /></View><View style={styles.number}><Field label="Número" value={addressNumber} onChangeText={(value) => changeAddressField(setAddressNumber, value)} placeholder="123 ou S/N" styles={styles} colors={colors} /></View></View>
          <Field label="Bairro" value={neighborhood} onChangeText={(value) => changeAddressField(setNeighborhood, value)} placeholder="Bairro" styles={styles} colors={colors} />
          <View style={styles.row}><View style={styles.grow}><Field label="Cidade" value={city} onChangeText={(value) => changeAddressField(setCity, value)} placeholder="Cidade" styles={styles} colors={colors} /></View><View style={styles.uf}><Field label="UF" value={state} onChangeText={(value) => changeAddressField(setState, value.slice(0, 2))} placeholder="MG" styles={styles} colors={colors} /></View></View>
          <Field label="CEP" value={postalCode} onChangeText={(value) => changeAddressField(setPostalCode, value)} placeholder="00000-000" styles={styles} colors={colors} />
          <Pressable accessibilityRole="button" disabled={locating} onPress={locateAddress} style={[styles.locationButton, resolvedAddressKey === addressKey() && styles.locationReady]}><MaterialCommunityIcons name={resolvedAddressKey === addressKey() ? 'map-marker-check-outline' : 'map-search-outline'} size={20} color={colors.brandText} /><Text style={styles.locationText}>{locating ? 'Localizando…' : resolvedAddressKey === addressKey() ? 'Novo ponto localizado' : 'Localizar endereço corrigido'}</Text></Pressable>
          <Text style={styles.label}>COMBUSTÍVEIS DISPONÍVEIS</Text><View style={styles.options}>{fuels.map((item) => <Chip key={item.code} label={item.name} selected={fuelCodes.includes(item.code)} onPress={() => toggle(item.code, fuelCodes, setFuelCodes)} />)}</View>
          <Text style={styles.label}>SERVIÇOS DISPONÍVEIS</Text><View style={styles.options}>{services.map((item) => <Chip key={item.code} label={item.name} selected={serviceCodes.includes(item.code)} onPress={() => toggle(item.code, serviceCodes, setServiceCodes)} />)}</View>
        </ScrollView>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<Pressable accessibilityRole="button" disabled={busy} onPress={send} style={[styles.primary, busy && styles.primaryDisabled]}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Enviar para revisão'}</Text></Pressable>
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
  form: { gap: spacing[3], paddingBottom: spacing[4] }, label: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginBottom: spacing[1] }, input: { minHeight: 48, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.offWhite, fontFamily: typography.regular }, row: { flexDirection: 'row', gap: spacing[2] }, grow: { flex: 1 }, number: { width: 112 }, uf: { width: 76 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, locationButton: { minHeight: 48, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md }, locationReady: { backgroundColor: colors.surfaceAlt }, locationText: { color: colors.brandText, fontFamily: typography.black, textAlign: 'center' }, message: { marginVertical: spacing[2], color: colors.warningText, fontFamily: typography.regular, fontSize: 12, lineHeight: 17 }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryDisabled: { opacity: .65 }, primaryText: { color: colors.onBrand, fontFamily: typography.black },
})

function splitAddress(value: string) {
  const match = value.trim().match(/^(.*?),\s*([^,]+)$/)
  return match ? { street: match[1].trim(), number: match[2].trim() } : { street: value.trim(), number: '' }
}
