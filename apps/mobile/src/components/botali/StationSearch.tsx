import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'
import type { MapCenter } from '../../services/stations'
import { distanceKmBetween } from '../../utils/stationFilters'
import { userMessageForError } from '../../utils/appError'
import { compareStationsByPurchaseTotal, estimatePurchaseTotal, parsePlannedLiters, type Vehicle } from '../../utils/vehicle'

const radiusOptions = [2, 5, 10, 25, 50, 100]
const sortOptions = [{ value: 'distance', label: 'Mais próximos' }, { value: 'price', label: 'Menor preço' }, { value: 'confidence', label: 'Mais confiáveis' }, { value: 'total', label: 'Menor gasto total' }] as const
type SortMode = typeof sortOptions[number]['value']

type Props = {
  query: string
  radiusKm: number
  mode: MapMode
  stations: Station[]
  hasMore: boolean
  loadingMore: boolean
  userLocation: MapCenter | null
  vehicle: Vehicle | null
  plannedLiters: string
  onPlannedLitersChange: (value: string) => void
  onRequestLocation: () => Promise<MapCenter>
  onQueryChange: (value: string) => void
  onRadiusChange: (value: number) => void
  onClose: () => void
  onSelect: (station: Station) => void
  onAddStation: () => void
  onLoadMore: () => void
}

export function StationSearch({ query, radiusKm, mode, stations, hasMore, loadingMore, userLocation, vehicle, plannedLiters, onPlannedLitersChange, onRequestLocation, onQueryChange, onRadiusChange, onClose, onSelect, onAddStation, onLoadMore }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const { height } = useWindowDimensions()
  const [sort, setSort] = useState<SortMode>('distance')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const liters = parsePlannedLiters(plannedLiters)
  const canCompareTotal = Boolean(vehicle && userLocation && liters && mode !== 'electric' && vehicle.fuels.some((fuel) => fuel.fuelCode === mode))
  const activeSort = sort === 'total' && !canCompareTotal ? 'distance' : sort
  const totalFor = (station: Station) => vehicle && mode !== 'electric' && liters ? estimatePurchaseTotal(vehicle, mode, userLocation, station, liters) : null
  const distanceFromUser = (station: Station) => userLocation ? distanceKmBetween(userLocation, station) : null
  const distanceOrder = (a: Station, b: Station) => userLocation
    ? distanceKmBetween(userLocation, a) - distanceKmBetween(userLocation, b)
    : a.name.localeCompare(b.name, 'pt-BR')
  const results = stations
    .filter((station) => !normalizedQuery || `${station.name} ${station.brand} ${station.address ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    .sort((a, b) => {
      if (activeSort === 'total' && vehicle && userLocation && liters) return compareStationsByPurchaseTotal(vehicle, mode, userLocation, liters, a, b) || distanceOrder(a, b)
      if (activeSort === 'price' && mode !== 'electric') return Number(Boolean(a.prices[mode]?.stale)) - Number(Boolean(b.prices[mode]?.stale)) || (a.prices[mode]?.value ?? Number.POSITIVE_INFINITY) - (b.prices[mode]?.value ?? Number.POSITIVE_INFINITY) || distanceOrder(a, b)
      if (activeSort === 'confidence' && mode !== 'electric') return (b.prices[mode]?.confidence ?? -1) - (a.prices[mode]?.confidence ?? -1) || distanceOrder(a, b)
      return distanceOrder(a, b)
    })

  async function requestLocation() {
    setLocating(true); setLocationError('')
    try { await onRequestLocation() }
    catch (error) { setLocationError(userMessageForError(error, 'Não foi possível obter sua localização.')) }
    finally { setLocating(false) }
  }

  return <View style={[styles.panel, { height: Math.min(height - spacing[3], Math.max(520, height * .88)) }]}>
    <View style={styles.searchRow}>
      <MaterialCommunityIcons name="magnify" size={23} color={colors.brandText} style={styles.searchIcon} />
      <TextInput autoFocus accessibilityLabel="Buscar posto" placeholder="Nome, bandeira ou endereço" placeholderTextColor={colors.textMuted} value={query} onChangeText={onQueryChange} style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar busca" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={24} color={colors.offWhite} /></Pressable>
    </View>
    <Text style={styles.label}>RAIO DA BUSCA NO MAPA</Text>
    <View style={styles.radiusRow}>{radiusOptions.map((value) => <Pressable key={value} onPress={() => onRadiusChange(value)} style={[styles.radius, radiusKm === value && styles.radiusActive]}><Text style={[styles.radiusText, radiusKm === value && styles.radiusTextActive]}>{value} km</Text></Pressable>)}</View>
    <Text style={styles.label}>CLASSIFICAR POR</Text>
    <View style={styles.sortRow}>{sortOptions.map((item) => <Pressable key={item.value} disabled={item.value === 'total' && !canCompareTotal} onPress={() => setSort(item.value)} style={[styles.sort, activeSort === item.value && styles.sortActive, item.value === 'total' && !canCompareTotal && styles.sortDisabled]}><Text style={[styles.sortText, activeSort === item.value && styles.sortTextActive]}>{item.value === 'distance' && !userLocation ? 'Por nome' : item.label}</Text></Pressable>)}</View>
    {vehicle && mode !== 'electric' && vehicle.fuels.some((fuel) => fuel.fuelCode === mode) ? <View style={styles.planRow}><View style={styles.planCopy}><Text style={styles.planTitle}>Quanto vai abastecer?</Text><Text style={styles.planHint}>Gasto total = combustível + ida e volta aproximada.</Text></View><TextInput accessibilityLabel="Litros planejados para abastecer" keyboardType="decimal-pad" placeholder="Litros" placeholderTextColor={colors.textMuted} value={plannedLiters} onChangeText={(value) => { if (/^\d{0,4}(?:[,.]\d{0,2})?$/.test(value)) onPlannedLitersChange(value) }} style={styles.planInput} /></View> : null}
    <Pressable accessibilityRole="button" disabled={locating} onPress={requestLocation} style={styles.locationPrompt}><MaterialCommunityIcons name="crosshairs-gps" size={17} color={colors.brandText} /><Text style={styles.locationPromptText}>{locating ? 'Localizando…' : userLocation ? 'Atualizar minha posição' : 'Usar minha posição para ver distâncias'}</Text></Pressable>
    {userLocation ? <Text style={styles.locationHint}>Distâncias em linha reta a partir da sua posição.</Text> : null}
    {locationError ? <Text accessibilityLiveRegion="polite" style={styles.locationError}>{locationError}</Text> : null}
    <Text style={styles.count}>{results.length} {results.length === 1 ? 'posto encontrado' : 'postos encontrados'}</Text>
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} contentContainerStyle={styles.listContent}>
      {results.map((station) => {
        const price = mode === 'electric' ? null : station.prices[mode]
        const distance = distanceFromUser(station)
        const total = totalFor(station)
        return <Pressable key={station.id} style={styles.card} onPress={() => onSelect(station)}>
          <View style={styles.cardCopy}><Text style={styles.brand}>{station.brand.toUpperCase()}</Text><Text style={styles.name}>{station.name}</Text><Text style={styles.meta}>{distance === null ? 'Distância indisponível' : `${distance.toFixed(1).replace('.', ',')} km de você`}{station.address ? ` · ${station.address}` : ''}</Text>{total ? <Text style={styles.total}>Gasto mínimo ~R$ {total.totalCost.toFixed(2).replace('.', ',')}{total.stale ? ' · preço antigo' : ''}</Text> : null}</View>
          {mode === 'electric' ? <MaterialCommunityIcons name="ev-station" size={25} color={colors.brandText} style={styles.priceIcon} /> : <View style={styles.priceGroup}><Text style={[styles.price, !price && styles.noPrice]}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Ainda sem preço'}</Text>{price?.stale ? <Text style={styles.stalePrice}>Sem atualização há 5 dias</Text> : null}</View>}
        </Pressable>
      })}
      {!results.length ? <Text style={styles.empty}>Nenhum posto nesse raio. Aumente a distância ou altere a busca.</Text> : null}
      {hasMore ? <Pressable accessibilityRole="button" disabled={loadingMore} style={styles.loadMoreButton} onPress={onLoadMore}><MaterialCommunityIcons name="database-plus-outline" size={20} color={colors.offWhite} /><Text style={styles.loadMoreText}>{loadingMore ? 'Carregando…' : 'Carregar mais postos desta área'}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" style={styles.addButton} onPress={onAddStation}><MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.brandText} /><Text style={styles.addText}>Cadastrar um posto ausente</Text></Pressable>
    </ScrollView>
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { maxHeight: '78%', paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[4], borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, backgroundColor: colors.graphite, ...shadow.sheet },
  searchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  searchIcon: { marginRight: spacing[2] },
  input: { flex: 1, color: colors.offWhite, fontFamily: typography.regular, fontSize: typography.body },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: spacing[4], color: colors.textMuted, fontFamily: typography.black, fontSize: 10, letterSpacing: 1 },
  radiusRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  radius: { minHeight: 38, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  radiusActive: { backgroundColor: colors.brand },
  radiusText: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 12 },
  radiusTextActive: { color: colors.graphite },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
  sort: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  sortActive: { backgroundColor: colors.brand },
  sortText: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 11 },
  sortTextActive: { color: colors.onBrand },
  sortDisabled: { opacity: .45 },
  planRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }, planCopy: { flex: 1 }, planTitle: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 12 }, planHint: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, marginTop: spacing[1] }, planInput: { width: 72, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, color: colors.offWhite, textAlign: 'center', fontFamily: typography.bold },
  count: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.caption, marginTop: spacing[4] },
  locationPrompt: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }, locationPromptText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 11 },
  locationHint: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, marginTop: spacing[2] }, locationError: { color: colors.warningText, fontFamily: typography.regular, fontSize: 11 },
  list: { marginTop: spacing[2] },
  listContent: { gap: spacing[2], paddingBottom: spacing[3] },
  card: { minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  cardCopy: { flex: 1 },
  brand: { color: colors.brandText, fontFamily: typography.black, fontSize: 9 },
  name: { color: colors.offWhite, fontFamily: typography.bold, marginTop: 2 },
  meta: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: 3 },
  total: { color: colors.brandText, fontFamily: typography.bold, fontSize: 11, marginTop: spacing[1] },
  price: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.h3, marginLeft: spacing[3] },
  noPrice: { maxWidth: 72, color: colors.textMuted, fontSize: 10, textAlign: 'right' },
  priceGroup: { maxWidth: 96, alignItems: 'flex-end' },
  stalePrice: { color: colors.warningText, fontFamily: typography.semibold, fontSize: 8, textAlign: 'right', marginTop: 2 },
  priceIcon: { marginLeft: spacing[3] },
  empty: { color: colors.textMuted, fontFamily: typography.regular, lineHeight: 20, paddingVertical: spacing[4], textAlign: 'center' },
  loadMoreButton: { minHeight: 48, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', marginTop: spacing[2], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  loadMoreText: { color: colors.offWhite, fontFamily: typography.bold },
  addButton: { minHeight: 48, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', marginTop: spacing[2], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md },
  addText: { color: colors.brandText, fontFamily: typography.black },
})
