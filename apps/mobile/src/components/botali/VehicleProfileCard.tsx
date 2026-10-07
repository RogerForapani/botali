import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { parseConsumption, parseVehicleYear, vehicleTypes, type Vehicle, type VehicleType } from '../../utils/vehicle'
import { userMessageForError } from '../../utils/appError'
import { Chip } from '../ui/Chip'

type FuelOption = { code: string; name: string }
type Props = { vehicle: Vehicle | null; loading: boolean; fuels: FuelOption[]; onSave: (vehicle: Vehicle | null) => Promise<void> }

export function VehicleProfileCard({ vehicle, loading, fuels, onSave }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<VehicleType>('car')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [fuelDrafts, setFuelDrafts] = useState<{ fuelCode: string; consumption: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const availableFuels = [...fuels, ...(vehicle?.fuels ?? []).filter((item) => !fuels.some((fuel) => fuel.code === item.fuelCode)).map((item) => ({ code: item.fuelCode, name: item.fuelCode.replaceAll('_', ' ') }))]
  const fuelName = (code: string) => availableFuels.find((item) => item.code === code)?.name ?? code.replaceAll('_', ' ')

  function openEditor() {
    setType(vehicle?.type ?? 'car')
    setBrand(vehicle?.brand ?? '')
    setModel(vehicle?.model ?? '')
    setYear(vehicle?.year ? String(vehicle.year) : '')
    setFuelDrafts(vehicle?.fuels.map((item) => ({ fuelCode: item.fuelCode, consumption: String(item.consumptionKmL).replace('.', ',') })) ?? [])
    setMessage('')
    setEditing(true)
  }

  async function save() {
    const parsedYear = parseVehicleYear(year)
    if (!fuelDrafts.length) return setMessage('Escolha pelo menos um combustível do veículo.')
    const parsedFuels = fuelDrafts.map((item) => ({ fuelCode: item.fuelCode, consumptionKmL: parseConsumption(item.consumption) }))
    const invalid = parsedFuels.find((item) => item.consumptionKmL === null)
    if (invalid) return setMessage(`Informe o consumo de ${fuelName(invalid.fuelCode)} entre 0,5 e 100 km/L.`)
    if (parsedYear === undefined) return setMessage('Informe um ano válido ou deixe em branco.')
    setBusy(true); setMessage('')
    try {
      await onSave({ type, brand: brand.trim(), model: model.trim(), year: parsedYear, fuels: parsedFuels as Vehicle['fuels'] })
      setEditing(false)
      setMessage('Veículo salvo neste aparelho.')
    } catch (error) {
      setMessage(userMessageForError(error, 'Não foi possível salvar o veículo.'))
    } finally { setBusy(false) }
  }

  function confirmRemove() {
    Alert.alert('Remover veículo?', 'Os dados salvos neste aparelho serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => {
        setBusy(true); setMessage('')
        onSave(null).then(() => { setEditing(false); setMessage('Veículo removido.') })
          .catch((error) => setMessage(userMessageForError(error, 'Não foi possível remover o veículo.')))
          .finally(() => setBusy(false))
      } },
    ])
  }

  const typeLabel = vehicleTypes.find((item) => item.code === vehicle?.type)?.label ?? 'Veículo'
  function toggleFuel(code: string) {
    setFuelDrafts((current) => current.some((item) => item.fuelCode === code)
      ? current.filter((item) => item.fuelCode !== code)
      : [...current, { fuelCode: code, consumption: '' }])
    setMessage('')
  }

  return <View style={styles.card}>
    <View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.eyebrow}>MEU VEÍCULO</Text><Text style={styles.title}>Custo até o posto</Text></View><MaterialCommunityIcons name="car-outline" size={24} color={colors.brandText} /></View>
    {loading ? <Text style={styles.muted}>Carregando veículo…</Text> : editing ? <View style={styles.form}>
      <Text style={styles.hint}>Selecione os combustíveis que seu veículo usa e informe o consumo de cada um. Os dados ficam neste aparelho.</Text>
      <Text style={styles.label}>TIPO</Text><View style={styles.options}>{vehicleTypes.map((item) => <Chip key={item.code} label={item.label} selected={type === item.code} onPress={() => setType(item.code)} />)}</View>
      <Text style={styles.label}>MARCA E MODELO (OPCIONAIS)</Text><View style={styles.row}><TextInput accessibilityLabel="Marca do veículo" value={brand} onChangeText={setBrand} maxLength={40} placeholder="Marca" placeholderTextColor={colors.textMuted} style={[styles.input, styles.half]} /><TextInput accessibilityLabel="Modelo do veículo" value={model} onChangeText={setModel} maxLength={40} placeholder="Modelo" placeholderTextColor={colors.textMuted} style={[styles.input, styles.half]} /></View>
      <Text style={styles.label}>ANO (OPCIONAL)</Text><TextInput accessibilityLabel="Ano do veículo" value={year} onChangeText={setYear} maxLength={4} keyboardType="number-pad" placeholder="Ex.: 2020" placeholderTextColor={colors.textMuted} style={styles.input} />
      <Text style={styles.label}>COMBUSTÍVEIS DO VEÍCULO</Text><View style={styles.options}>{availableFuels.map((fuel) => <Chip key={fuel.code} label={fuel.name} selected={fuelDrafts.some((item) => item.fuelCode === fuel.code)} onPress={() => toggleFuel(fuel.code)} />)}</View>
      {fuelDrafts.map((item) => <View key={item.fuelCode} style={styles.fuelInputRow}><View style={styles.fuelInputCopy}><Text style={styles.fuelInputName}>{fuelName(item.fuelCode)}</Text><Text style={styles.hint}>Consumo médio</Text></View><TextInput accessibilityLabel={`Consumo de ${fuelName(item.fuelCode)} em quilômetros por litro`} value={item.consumption} onChangeText={(value) => setFuelDrafts((current) => current.map((draft) => draft.fuelCode === item.fuelCode ? { ...draft, consumption: value } : draft))} keyboardType="decimal-pad" placeholder="km/L" placeholderTextColor={colors.textMuted} style={[styles.input, styles.fuelInput]} /></View>)}
      <View style={styles.actions}><Pressable disabled={busy} accessibilityRole="button" onPress={() => { setEditing(false); setMessage('') }} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></Pressable><Pressable disabled={busy} accessibilityRole="button" onPress={save} style={styles.primary}><Text style={styles.primaryText}>{busy ? 'Salvando…' : 'Salvar veículo'}</Text></Pressable></View>
      {vehicle ? <Pressable disabled={busy} accessibilityRole="button" onPress={confirmRemove} style={styles.remove}><Text style={styles.removeText}>Remover veículo deste aparelho</Text></Pressable> : null}
    </View> : <>
      {vehicle ? <><Text style={styles.summary}>{typeLabel}{vehicle.brand || vehicle.model ? ` · ${[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}` : ''}{vehicle.year ? ` · ${vehicle.year}` : ''}</Text><View style={styles.savedFuels}>{vehicle.fuels.map((item) => <View key={item.fuelCode} style={styles.savedFuel}><Text style={styles.savedFuelName}>{fuelName(item.fuelCode)}</Text><Text style={styles.savedFuelConsumption}>{item.consumptionKmL.toFixed(1).replace('.', ',')} km/L</Text></View>)}</View></> : <Text style={styles.muted}>Cadastre seu veículo para comparar o gasto de ida e volta por combustível.</Text>}
      <Pressable accessibilityRole="button" onPress={openEditor} style={styles.edit}><MaterialCommunityIcons name={vehicle ? 'pencil-outline' : 'plus'} size={18} color={colors.brandText} /><Text style={styles.editText}>{vehicle ? 'Editar veículo' : 'Adicionar veículo'}</Text></Pressable>
    </>}
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { marginBottom: spacing[5], padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headingCopy: { flex: 1 },
  eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 9, letterSpacing: .8 }, title: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.body, marginTop: spacing[1] },
  muted: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: spacing[3] },
  summary: { color: colors.offWhite, fontFamily: typography.semibold, fontSize: 13, lineHeight: 20, marginTop: spacing[3] },
  edit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginTop: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  editText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 12 }, form: { marginTop: spacing[2] },
  hint: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, lineHeight: 16 },
  label: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .7, marginTop: spacing[4], marginBottom: spacing[2] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, row: { flexDirection: 'row', gap: spacing[2] }, half: { flex: 1 },
  input: { minHeight: 48, paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.graphite, color: colors.offWhite, fontFamily: typography.regular },
  fuelInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2], padding: spacing[2], borderRadius: radius.md, backgroundColor: colors.graphite },
  fuelInputCopy: { flex: 1 }, fuelInputName: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 12 }, fuelInput: { width: 104, textAlign: 'right' },
  savedFuels: { gap: spacing[2], marginTop: spacing[3] }, savedFuel: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2], padding: spacing[2], borderRadius: radius.sm, backgroundColor: colors.graphite }, savedFuelName: { color: colors.offWhite, fontFamily: typography.semibold, fontSize: 12 }, savedFuelConsumption: { color: colors.brandText, fontFamily: typography.bold, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[5] }, secondary: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, secondaryText: { color: colors.offWhite, fontFamily: typography.bold },
  primary: { flex: 1.4, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontFamily: typography.black },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] }, removeText: { color: colors.dangerText, fontFamily: typography.bold, fontSize: 12 },
  message: { color: colors.warningText, fontFamily: typography.semibold, fontSize: 11, marginTop: spacing[2] },
})
