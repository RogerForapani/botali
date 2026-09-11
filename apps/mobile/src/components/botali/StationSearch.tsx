import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'

const radiusOptions = [2, 5, 10, 25, 50, 100]
const sortOptions = [{ value: 'distance', label: 'Mais próximos' }, { value: 'price', label: 'Menor preço' }, { value: 'confidence', label: 'Mais confiáveis' }] as const
type SortMode = typeof sortOptions[number]['value']

type Props = {
  query: string
  radiusKm: number
  mode: MapMode
  stations: Station[]
  onQueryChange: (value: string) => void
  onRadiusChange: (value: number) => void
  onClose: () => void
  onSelect: (station: Station) => void
  onAddStation: () => void
}

export function StationSearch({ query, radiusKm, mode, stations, onQueryChange, onRadiusChange, onClose, onSelect, onAddStation }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const { height } = useWindowDimensions()
  const [sort, setSort] = useState<SortMode>('distance')
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const results = stations
    .filter((station) => station.distanceKm <= radiusKm)
    .filter((station) => !normalizedQuery || `${station.name} ${station.brand} ${station.address ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    .sort((a, b) => {
      if (sort === 'price' && mode !== 'electric') return (a.prices[mode]?.value ?? Number.POSITIVE_INFINITY) - (b.prices[mode]?.value ?? Number.POSITIVE_INFINITY) || a.distanceKm - b.distanceKm
      if (sort === 'confidence' && mode !== 'electric') return (b.prices[mode]?.confidence ?? -1) - (a.prices[mode]?.confidence ?? -1) || a.distanceKm - b.distanceKm
      return a.distanceKm - b.distanceKm
    })

  return <View style={[styles.panel, { height: Math.min(height - spacing[3], Math.max(520, height * .88)) }]}>
    <View style={styles.searchRow}>
      <MaterialCommunityIcons name="magnify" size={23} color={colors.brandText} style={styles.searchIcon} />
      <TextInput autoFocus accessibilityLabel="Buscar posto" placeholder="Nome, bandeira ou endereço" placeholderTextColor={colors.textMuted} value={query} onChangeText={onQueryChange} style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar busca" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={24} color={colors.offWhite} /></Pressable>
    </View>
    <Text style={styles.label}>DISTÂNCIA MÁXIMA</Text>
    <View style={styles.radiusRow}>{radiusOptions.map((value) => <Pressable key={value} onPress={() => onRadiusChange(value)} style={[styles.radius, radiusKm === value && styles.radiusActive]}><Text style={[styles.radiusText, radiusKm === value && styles.radiusTextActive]}>{value} km</Text></Pressable>)}</View>
    <Text style={styles.label}>CLASSIFICAR POR</Text>
    <View style={styles.sortRow}>{sortOptions.map((item) => <Pressable key={item.value} onPress={() => setSort(item.value)} style={[styles.sort, sort === item.value && styles.sortActive]}><Text style={[styles.sortText, sort === item.value && styles.sortTextActive]}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.count}>{results.length} {results.length === 1 ? 'posto encontrado' : 'postos encontrados'}</Text>
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} contentContainerStyle={styles.listContent}>
      {results.map((station) => {
        const price = mode === 'electric' ? null : station.prices[mode]
        return <Pressable key={station.id} style={styles.card} onPress={() => onSelect(station)}>
          <View style={styles.cardCopy}><Text style={styles.brand}>{station.brand.toUpperCase()}</Text><Text style={styles.name}>{station.name}</Text><Text style={styles.meta}>{station.distanceKm.toFixed(1).replace('.', ',')} km{station.address ? ` · ${station.address}` : ''}</Text></View>
          {mode === 'electric' ? <MaterialCommunityIcons name="ev-station" size={25} color={colors.brandText} style={styles.priceIcon} /> : <Text style={styles.price}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : '—'}</Text>}
        </Pressable>
      })}
      {!results.length ? <Text style={styles.empty}>Nenhum posto nesse raio. Aumente a distância ou altere a busca.</Text> : null}
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
  count: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.caption, marginTop: spacing[4] },
  list: { marginTop: spacing[2] },
  listContent: { gap: spacing[2], paddingBottom: spacing[3] },
  card: { minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  cardCopy: { flex: 1 },
  brand: { color: colors.brandText, fontFamily: typography.black, fontSize: 9 },
  name: { color: colors.offWhite, fontFamily: typography.bold, marginTop: 2 },
  meta: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: 3 },
  price: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.h3, marginLeft: spacing[3] },
  priceIcon: { marginLeft: spacing[3] },
  empty: { color: colors.textMuted, fontFamily: typography.regular, lineHeight: 20, paddingVertical: spacing[4], textAlign: 'center' },
  addButton: { minHeight: 48, flexDirection: 'row', gap: spacing[2], alignItems: 'center', justifyContent: 'center', marginTop: spacing[2], borderWidth: 1, borderColor: colors.brand, borderRadius: radius.md },
  addText: { color: colors.brandText, fontFamily: typography.black },
})
