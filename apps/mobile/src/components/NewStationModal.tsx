import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadStationOptions, submitStation } from '../services/stations'
import { colors, radius, spacing, typography } from '../theme/tokens'

type Props = { visible: boolean; userId: string | null; onClose: () => void; onSent: () => void }

export function NewStationModal({ visible, userId, onClose, onSent }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('Independente')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('MG')
  const [postalCode, setPostalCode] = useState('')
  const [fuelCodes, setFuelCodes] = useState<string[]>(['gasolina', 'etanol'])
  const [serviceCodes, setServiceCodes] = useState<string[]>([])
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
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
      setCoordinates(coordinate)
      const [place] = await Location.reverseGeocodeAsync(coordinate)
      if (place) {
        const street = place.street ?? place.name ?? ''
        const resolvedAddress = [street, place.streetNumber].filter(Boolean).join(', ')
        if (resolvedAddress) setAddress(resolvedAddress)
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

  async function send() {
    if (!userId) return setMessage('Entre na sua conta para cadastrar um posto.')
    if (name.trim().length < 2 || !address.trim() || !city.trim() || state.trim().length !== 2) return setMessage('Preencha nome, endereço, cidade e UF.')
    if (!coordinates) return setMessage('Use sua localização atual enquanto estiver no posto.')
    if (!fuelCodes.length && !serviceCodes.some((code) => code.startsWith('recarga_'))) return setMessage('Selecione ao menos um combustível ou tipo de recarga.')
    setBusy(true); setMessage('')
    try {
      await submitStation({ name, brand: brand === 'Outra' ? name.trim() : brand, address, neighborhood, city, state, postalCode, ...coordinates, fuelCodes, serviceCodes, userId })
      setName(brand === 'Outra' ? '' : brand); setAddress(''); setNeighborhood(''); setPostalCode(''); setCoordinates(null)
      onSent()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar o posto.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}><Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} /><View style={styles.card}><View style={styles.handle} /><Text style={styles.eyebrow}>NOVO POSTO</Text><Text style={styles.title}>Ajude a completar o mapa</Text><Text style={styles.description}>O posto será marcado como cadastro pendente e poderá ser revisado depois.</Text><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
    <Text style={styles.label}>BANDEIRA</Text><View style={styles.options}>{brands.map((item) => <Option key={item} label={item} active={brand === item} onPress={() => { setBrand(item); setName(item === 'Outra' ? '' : item) }} />)}</View>
    <Field label="Nome do posto" value={name} onChangeText={setName} placeholder="Digite o nome que aparece no posto" editable={brand === 'Outra'} />
    <Pressable disabled={locating} onPress={locate} style={[styles.locationButton, coordinates && styles.locationReady]}><Text style={styles.locationText}>{locating ? 'Obtendo localização e endereço…' : coordinates ? '✓ Localização e endereço capturados' : '⌖ Usar minha localização e preencher endereço'}</Text></Pressable>
    <Field label="Endereço" value={address} onChangeText={setAddress} placeholder="Rua e número" />
    <Field label="Bairro" value={neighborhood} onChangeText={setNeighborhood} placeholder="Bairro" />
    <View style={styles.row}><View style={styles.grow}><Field label="Cidade" value={city} onChangeText={setCity} placeholder="Cidade" /></View><View style={styles.uf}><Field label="UF" value={state} onChangeText={(value) => setState(value.slice(0, 2))} placeholder="MG" /></View></View>
    <Field label="CEP" value={postalCode} onChangeText={setPostalCode} placeholder="00000-000" keyboardType="numeric" />
    <Text style={styles.label}>COMBUSTÍVEIS</Text><View style={styles.options}>{fuels.map((item) => <Option key={item.code} label={item.name} active={fuelCodes.includes(item.code)} onPress={() => toggle(item.code, fuelCodes, setFuelCodes)} />)}</View>
    <Text style={styles.label}>SERVIÇOS</Text><View style={styles.options}>{services.map((item) => <Option key={item.code} label={item.name} active={serviceCodes.includes(item.code)} onPress={() => toggle(item.code, serviceCodes, setServiceCodes)} />)}</View>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </ScrollView><Pressable disabled={busy} style={styles.primary} onPress={send}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Cadastrar posto'}</Text></Pressable></View></KeyboardAvoidingView></Modal>
}

function Field({ label, editable = true, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'numeric'; editable?: boolean }) { return <View><Text style={styles.label}>{label.toUpperCase()}</Text><TextInput {...props} editable={editable} placeholderTextColor={colors.textMuted} style={[styles.input, !editable && styles.inputDisabled]} /></View> }
function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.option, active && styles.optionActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text></Pressable> }

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: '#02061799' }, card: { maxHeight: '92%', padding: spacing[5], paddingBottom: spacing[6], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[4] }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[1] }, description: { color: colors.textMuted, fontSize: 13, marginTop: spacing[1], marginBottom: spacing[3] }, form: { gap: spacing[3], paddingBottom: spacing[4] }, label: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8, marginBottom: spacing[1] }, input: { minHeight: 46, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.offWhite }, inputDisabled: { opacity: .65 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, option: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.surface }, optionActive: { backgroundColor: colors.brand }, optionText: { color: colors.offWhite, fontSize: 11, fontWeight: '800' }, optionTextActive: { color: colors.graphite }, row: { flexDirection: 'row', gap: spacing[2] }, grow: { flex: 1 }, uf: { width: 76 }, locationButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md }, locationReady: { backgroundColor: colors.surface }, locationText: { color: colors.brand, fontWeight: '900', textAlign: 'center' }, message: { color: colors.amber, fontSize: 12, lineHeight: 17 }, primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.graphite, fontWeight: '900' },
})

const brazilianStates: Record<string, string> = { acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO' }
function toBrazilianStateCode(region: string) { const normalized = region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); return region.length === 2 ? region.toUpperCase() : brazilianStates[normalized] ?? region.slice(0, 2).toUpperCase() }
