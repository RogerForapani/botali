import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import * as Location from 'expo-location'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadStationOptions, submitStation } from '../services/stations'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'

type Props = { visible: boolean; userId: string | null; onClose: () => void; onBack?: () => void; onSent: () => void }

export function NewStationModal({ visible, userId, onClose, onBack, onSent }: Props) {
  const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors])
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('Independente')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('MG')
  const [postalCode, setPostalCode] = useState('')
  const [fuelCodes, setFuelCodes] = useState<string[]>(['gasolina', 'etanol'])
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [coordinateSource, setCoordinateSource] = useState<'gps' | 'address' | null>(null)
  const [resolvedAddressKey, setResolvedAddressKey] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [brands, setBrands] = useState<string[]>([])
  const [fuels, setFuels] = useState<{ code: string; name: string }[]>([])
  const [services, setServices] = useState<{ code: string; name: string }[]>([])

  useEffect(() => {
    if (!visible) return
    loadStationOptions().then((options) => {
      setBrands(options.brands.map((item) => item.name)); setFuels(options.fuels); setServices(options.services)
      setBrand((current) => {
        const next = options.brands.some((item) => item.name === current) ? current : options.brands[0]?.name ?? current
        if (next !== 'Outra') setName(next)
        return next
      })
    }).catch(() => setMessage('Não foi possível carregar as opções do cadastro.'))
  }, [visible])

  function toggle(value: string, current: string[], update: (values: string[]) => void) { update(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) }

  async function locate() {
    setLocating(true); setMessage('')
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) return setMessage('Permita a localização para posicionar o posto corretamente.')
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const coordinate = { latitude: current.coords.latitude, longitude: current.coords.longitude }
      setCoordinates(coordinate); setCoordinateSource('gps'); setResolvedAddressKey('')
      const [place] = await Location.reverseGeocodeAsync(coordinate)
      if (place) {
        const street = place.street ?? place.name ?? ''
        if (street) setAddress(street)
        if (place.streetNumber) setAddressNumber(place.streetNumber)
        if (place.district || place.subregion) setNeighborhood(place.district ?? place.subregion ?? '')
        if (place.city || place.subregion) setCity(place.city ?? place.subregion ?? '')
        if (place.region) setState(toBrazilianStateCode(place.region))
        if (place.postalCode) setPostalCode(place.postalCode)
        setMessage('Localização capturada e endereço preenchido. Revise antes de enviar.')
      } else setMessage('Localização capturada. Complete apenas os dados de endereço que faltarem.')
    } catch {
      setMessage('Não foi possível obter sua localização. Confira se o GPS está ativo e tente novamente.')
    } finally { setLocating(false) }
  }

  function addressKey() {
    return [address, addressNumber, neighborhood, city, state, postalCode].map((value) => value.trim().toLocaleLowerCase('pt-BR')).join('|')
  }

  async function locateAddress() {
    if (!address.trim() || !addressNumber.trim() || !city.trim() || state.trim().length !== 2) return setMessage('Preencha rua, número, cidade e UF antes de localizar o endereço.')
    setLocating(true); setMessage('')
    try {
      if (Platform.OS === 'android') {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (!permission.granted) return setMessage('No Android, permita a localização para converter o endereço em um ponto no mapa. O GPS atual não será usado.')
      }
      const query = [address, addressNumber, neighborhood, city, state, postalCode, 'Brasil'].filter((value) => value.trim()).join(', ')
      const [result] = await Location.geocodeAsync(query)
      if (!result) return setMessage('Não encontramos esse endereço. Revise os dados ou use o GPS quando estiver no posto.')
      setCoordinates({ latitude: result.latitude, longitude: result.longitude }); setCoordinateSource('address'); setResolvedAddressKey(addressKey())
      setMessage('Endereço localizado. Você pode cadastrar o posto mesmo estando distante.')
    } catch {
      setMessage('Não foi possível localizar esse endereço agora. Revise os dados e tente novamente.')
    } finally { setLocating(false) }
  }

  async function send() {
    if (!userId) return setMessage('Entre na sua conta para cadastrar um posto.')
    if (name.trim().length < 2 || !address.trim() || !addressNumber.trim() || !city.trim() || state.trim().length !== 2) return setMessage('Preencha nome, rua, número, cidade e UF. Use S/N quando o local não tiver número.')
    if (!coordinates) return setMessage('Use o GPS ou toque em “Localizar endereço” para posicionar o posto.')
    if (coordinateSource === 'address' && resolvedAddressKey !== addressKey()) return setMessage('O endereço mudou. Toque novamente em “Localizar endereço” antes de enviar.')
    if (!fuelCodes.length && !serviceCodes.some((code) => code.startsWith('recarga_'))) return setMessage('Selecione ao menos um combustível ou tipo de recarga.')
    setBusy(true); setMessage('')
    try {
      const fullAddress = `${address.trim()}, ${addressNumber.trim()}`
      await submitStation({ name, brand: brand === 'Outra' ? name.trim() : brand, address: fullAddress, neighborhood, city, state, postalCode, ...coordinates, fuelCodes, serviceCodes, userId })
      setName(brand === 'Outra' ? '' : brand); setAddress(''); setAddressNumber(''); setNeighborhood(''); setPostalCode(''); setCoordinates(null); setCoordinateSource(null); setResolvedAddressKey('')
      onSent()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o posto.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack ?? onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}><Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} /><View style={styles.card}><View style={styles.handle} /><Text style={styles.eyebrow}>NOVO POSTO</Text><Text style={styles.title}>Ajude a completar o mapa</Text><Text style={styles.description}>Cadastre pelo endereço, mesmo à distância, ou use o GPS como atalho quando estiver no posto.</Text><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
    <Text style={styles.label}>BANDEIRA</Text><View style={styles.options}>{brands.map((item) => <Option key={item} label={item} active={brand === item} onPress={() => { setBrand(item); setName(item === 'Outra' ? '' : item) }} />)}</View>
    <Field label="Nome do posto" value={name} onChangeText={setName} placeholder="Digite o nome que aparece no posto" editable={brand === 'Outra'} />
    <Pressable accessibilityRole="button" disabled={locating} onPress={locate} style={[styles.locationButton, coordinates && styles.locationReady]}><MaterialCommunityIcons name={coordinates ? 'check-circle-outline' : 'crosshairs-gps'} size={20} color={colors.brandText} /><Text style={styles.locationText}>{locating ? 'Obtendo localização e endereço…' : coordinates ? 'Localização e endereço capturados' : 'Usar minha localização e preencher endereço'}</Text></Pressable>
    <View style={styles.row}><View style={styles.grow}><Field label="Rua/Avenida" value={address} onChangeText={setAddress} placeholder="Nome da via" /></View><View style={styles.number}><Field label="Número" value={addressNumber} onChangeText={setAddressNumber} placeholder="123 ou S/N" /></View></View>
    <Field label="Bairro" value={neighborhood} onChangeText={setNeighborhood} placeholder="Bairro" />
    <View style={styles.row}><View style={styles.grow}><Field label="Cidade" value={city} onChangeText={setCity} placeholder="Cidade" /></View><View style={styles.uf}><Field label="UF" value={state} onChangeText={(value) => setState(value.slice(0, 2))} placeholder="MG" /></View></View>
    <Field label="CEP" value={postalCode} onChangeText={setPostalCode} placeholder="00000-000" keyboardType="numeric" />
    <Pressable accessibilityRole="button" disabled={locating} onPress={locateAddress} style={[styles.locationButton, coordinateSource === 'address' && styles.locationReady]}><MaterialCommunityIcons name={coordinateSource === 'address' ? 'map-marker-check-outline' : 'map-search-outline'} size={20} color={colors.brandText} /><Text style={styles.locationText}>{locating ? 'Localizando…' : coordinateSource === 'address' ? 'Endereço localizado no mapa' : 'Localizar endereço no mapa'}</Text></Pressable>
    <Text style={styles.label}>COMBUSTÍVEIS</Text><View style={styles.options}>{fuels.map((item) => <Option key={item.code} label={item.name} active={fuelCodes.includes(item.code)} onPress={() => toggle(item.code, fuelCodes, setFuelCodes)} />)}</View>
    <Text style={styles.label}>SERVIÇOS</Text><View style={styles.options}>{services.map((item) => <Option key={item.code} label={item.name} active={serviceCodes.includes(item.code)} onPress={() => toggle(item.code, serviceCodes, setServiceCodes)} />)}</View>
  </ScrollView>{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }} style={[styles.primary, busy && styles.primaryDisabled]} onPress={send}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Cadastrar posto'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
}

function Field({ label, editable = true, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'numeric'; editable?: boolean }) { const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]); return <View><Text style={styles.label}>{label.toUpperCase()}</Text><TextInput {...props} editable={editable} placeholderTextColor={colors.textMuted} style={[styles.input, !editable && styles.inputDisabled]} /></View> }
function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { const { colors } = useTheme(); const styles = useMemo(() => createStyles(colors), [colors]); return <Pressable onPress={onPress} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text></Pressable> }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: colors.scrim }, card: { maxHeight: '92%', padding: spacing[5], paddingBottom: spacing[6], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[4] }, eyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[1] }, description: { color: colors.textMuted, fontSize: 13, marginTop: spacing[1], marginBottom: spacing[3] }, form: { gap: spacing[3], paddingBottom: spacing[4] }, label: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8, marginBottom: spacing[1] }, input: { minHeight: 46, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.offWhite }, inputDisabled: { opacity: .65 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, option: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, optionActive: { backgroundColor: colors.brand }, optionText: { color: colors.offWhite, fontSize: 11, fontWeight: '800' }, optionTextActive: { color: colors.onBrand }, row: { flexDirection: 'row', gap: spacing[2] }, grow: { flex: 1 }, number: { width: 112 }, uf: { width: 76 }, locationButton: { minHeight: 48, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md }, locationReady: { backgroundColor: colors.surfaceAlt }, locationText: { color: colors.brandText, fontWeight: '900', textAlign: 'center' }, message: { marginTop: spacing[2], marginBottom: spacing[2], color: colors.warningText, fontSize: 12, lineHeight: 17 }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryDisabled: { opacity: .65 }, primaryText: { color: colors.onBrand, fontWeight: '900' },
})

const brazilianStates: Record<string, string> = { acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO' }
function toBrazilianStateCode(region: string) { const normalized = region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); return region.length === 2 ? region.toUpperCase() : brazilianStates[normalized] ?? region.slice(0, 2).toUpperCase() }
