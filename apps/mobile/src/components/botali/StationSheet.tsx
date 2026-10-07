import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'
import type { MapCenter } from '../../services/stations'
import { distanceKmBetween } from '../../utils/stationFilters'
import { compareVehicleTrips, type Vehicle } from '../../utils/vehicle'
import { userMessageForError } from '../../utils/appError'
import { Button } from '../ui/Button'
import { ConfidenceBadge } from './ConfidenceBadge'
import { FlexRatioBadge } from './FlexRatioBadge'

type Props = { station: Station; mode: MapMode; favorite: boolean; confirmingPrice: boolean; vehicle: Vehicle | null; userLocation: MapCenter | null; onRequestLocation: () => Promise<MapCenter>; onOpenProfile: () => void; onToggleFavorite: () => void; onClose: () => void; onContribute: () => void; onEdit: () => void; onConfirmPrice: (agrees: boolean) => void }

export function StationSheet({ station, mode, favorite, confirmingPrice, vehicle, userLocation, onRequestLocation, onOpenProfile, onToggleFavorite, onClose, onContribute, onEdit, onConfirmPrice }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const [expanded, setExpanded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const fuel = mode === 'electric' ? 'gasolina' : mode
  const price = station.prices[fuel]
  const flexRatio = station.prices.gasolina && station.prices.etanol && !station.prices.gasolina.stale && !station.prices.etanol.stale
    ? Math.round(station.prices.etanol.value / station.prices.gasolina.value * 100)
    : null
  const userDistanceKm = userLocation ? distanceKmBetween(userLocation, station) : null
  const trips = vehicle ? compareVehicleTrips(vehicle, userLocation, station) : []
  const availableTrips = trips.filter((item) => item.trip).length

  async function requestTripLocation() {
    setLocating(true); setLocationError('')
    try { await onRequestLocation() }
    catch (error) { setLocationError(userMessageForError(error, 'Não foi possível obter sua localização.')) }
    finally { setLocating(false) }
  }
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -24) setExpanded(true)
      if (gesture.dy > 32) onClose()
    },
  })

  function toggleExpanded() {
    setExpanded((value) => !value)
  }

  return <SafeAreaView edges={['bottom']} style={[styles.sheet, expanded && styles.sheetExpanded]}>
    <View {...panResponder.panHandlers} style={styles.handleGestureArea}>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Recolher detalhes' : 'Expandir detalhes'} accessibilityHint="Toque para alternar, arraste para cima para expandir ou para baixo para fechar" onPress={toggleExpanded} style={styles.handleButton}><View style={styles.handle} /></Pressable>
    </View>
    <View style={styles.head}>
      <View style={styles.title}>
        <View style={styles.brandRow}><MaterialCommunityIcons name="gas-station" size={14} color={colors.brandText} /><Text numberOfLines={1} style={styles.eyebrow}>{station.brand.toUpperCase()}</Text>{station.status === 'pending' ? <Text style={styles.pending}>AGUARDANDO REVISÃO</Text> : null}</View>
        <Text style={styles.stationName}>{station.name}</Text>
        <View style={styles.stationMetaRow}><MaterialCommunityIcons name="map-marker-distance" size={15} color={colors.textMuted} /><Text style={styles.stationMeta}>{userDistanceKm === null ? 'Distância indisponível' : `${userDistanceKm.toFixed(1).replace('.', ',')} km de você`}</Text>{station.rating ? <><Text style={styles.stationMetaSeparator}>·</Text><MaterialCommunityIcons name="star" size={14} color={colors.amber} /><Text style={styles.stationMeta}>{station.rating.toFixed(1)}</Text></> : null}</View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onPress={onToggleFavorite} style={styles.close}><MaterialCommunityIcons name={favorite ? 'heart' : 'heart-outline'} size={22} color={colors.brandText} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" onPress={onClose} style={styles.close}><MaterialCommunityIcons name="close" size={23} color={colors.offWhite} /></Pressable>
    </View>
    <ScrollView style={expanded ? styles.bodyExpanded : undefined} contentContainerStyle={styles.bodyContent} scrollEnabled={expanded} showsVerticalScrollIndicator={expanded}>
      {mode === 'electric' ? <View style={styles.priceRow}><View><Text style={styles.priceLabel}>RECARGA ELÉTRICA</Text><Text style={styles.priceValue}>Disponível</Text></View><View style={styles.electricStatus}><MaterialCommunityIcons name="check-decagram" size={17} color={colors.brandText} /><Text style={styles.confidence}>Serviço confirmado</Text></View></View> : <>
        <View style={styles.priceRow}><View style={styles.priceCopy}><Text style={styles.priceLabel}>{price?.stale ? 'ÚLTIMO PREÇO INFORMADO' : 'PREÇO DA COMUNIDADE'}</Text><Text style={[styles.priceValue, !price && styles.noPriceValue]}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Ainda sem preço'}</Text>{price?.stale ? <Text style={styles.staleMessage}>Este posto não teve atualização de preço nos últimos 5 dias.</Text> : price ? <Text style={styles.priceMeta}>{price.reports ?? 0} {(price.reports ?? 0) === 1 ? 'pessoa' : 'pessoas'} · {price.confirmations ?? 0} confirmações</Text> : <Text style={styles.priceMeta}>Se souber o valor, envie a primeira atualização.</Text>}</View>{price ? <ConfidenceBadge score={price.confidence} /> : null}</View>
        {flexRatio ? <View style={styles.flexBadge}><FlexRatioBadge percentage={flexRatio} /></View> : null}
        {price?.submissionId && station.status !== 'pending' ? <View style={styles.confirmCard}><Text style={styles.confirmTitle}>Você está neste posto?</Text><Text style={styles.confirmCopy}>Use sua localização uma vez para validar este preço.</Text><View style={styles.confirmActions}><Pressable disabled={confirmingPrice} accessibilityRole="button" onPress={() => onConfirmPrice(true)} style={[styles.confirmButton, styles.confirmGood]}><Text style={styles.confirmGoodText}>{confirmingPrice ? 'Validando…' : 'Preço correto'}</Text></Pressable><Pressable disabled={confirmingPrice} accessibilityRole="button" onPress={() => onConfirmPrice(false)} style={[styles.confirmButton, styles.confirmChanged]}><Text style={styles.confirmChangedText}>Preço mudou</Text></Pressable></View></View> : null}
      </>}
      {expanded ? <View style={styles.expandedContent}>
        <View style={styles.tripCard}>
          <View style={styles.tripHeading}><MaterialCommunityIcons name="car-arrow-right" size={20} color={colors.brandText} /><View style={styles.tripHeadingCopy}><Text style={styles.detailLabel}>CUSTO ATÉ ESTE POSTO</Text><Text style={styles.tripSubtitle}>Ida e volta · por combustível</Text></View></View>
          {!vehicle ? <><Text style={styles.tripCopy}>Adicione seu veículo no Perfil para comparar os gastos.</Text><Pressable accessibilityRole="button" onPress={onOpenProfile} style={styles.tripButton}><Text style={styles.tripButtonText}>Abrir Perfil</Text></Pressable></> : <>
            {!userLocation ? <Text style={styles.tripCopy}>Use sua posição para calcular o custo a partir de você.</Text> : <Text style={styles.tripDistance}>{(userDistanceKm! * 2).toFixed(1).replace('.', ',')} km de ida e volta em linha reta</Text>}
            <View style={styles.tripOptions}>{trips.map(({ fuel: option, price: optionPrice, trip, best }) => <View key={option.fuelCode} style={[styles.tripOption, best && styles.tripOptionBest]}>
              <View style={styles.tripOptionTop}><Text style={styles.tripFuelName}>{option.fuelCode.replaceAll('_', ' ')}</Text>{best ? <Text style={styles.tripBest}>MENOR CUSTO ESTIMADO</Text> : null}</View>
              <View style={styles.tripOptionBottom}><Text style={styles.tripOptionMeta}>{option.consumptionKmL.toFixed(1).replace('.', ',')} km/L{optionPrice ? ` · R$ ${optionPrice.value.toFixed(2).replace('.', ',')}/L` : ''}</Text><Text style={[styles.tripOptionCost, !trip && styles.tripOptionCostMissing]}>{trip ? `R$ ${trip.cost.toFixed(2).replace('.', ',')}` : optionPrice ? 'Sem posição' : 'Sem preço'}</Text></View>
              {optionPrice?.stale ? <Text style={styles.tripStale}>Preço sem atualização há 5 dias</Text> : null}
            </View>)}</View>
            {userLocation && !availableTrips ? <Text style={styles.tripCopy}>Este posto ainda não tem preço para os combustíveis do seu veículo.</Text> : null}
            <Text style={styles.tripWarning}>Estimativa mínima em linha reta. A rota real pode ser mais longa; preços antigos não são destacados como melhor opção.</Text>
            <Pressable accessibilityRole="button" disabled={locating} onPress={requestTripLocation} style={styles.tripButton}><Text style={styles.tripButtonText}>{locating ? 'Localizando…' : userLocation ? 'Atualizar minha posição' : 'Usar minha localização'}</Text></Pressable>
            {locationError ? <Text style={styles.tripWarning}>{locationError}</Text> : null}
          </>}
        </View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>ENDEREÇO</Text><Text style={styles.detailValue}>{station.address || 'Endereço ainda não informado'}</Text></View>
        <View style={styles.allPrices}>
          {(Object.entries(station.prices) as [string, { value: number; stale?: boolean }][]).map(([code, item]) => <View key={code} style={styles.fuelPrice}><Text style={styles.fuelLabel}>{code.replaceAll('_', ' ').toUpperCase()}</Text><Text style={styles.fuelValue}>R$ {item.value.toFixed(2).replace('.', ',')}</Text>{item.stale ? <Text style={styles.fuelStale}>Sem atualização há 5 dias</Text> : null}</View>)}
        </View>
        {station.services?.length ? <View style={styles.detailRow}><Text style={styles.detailLabel}>SERVIÇOS</Text><Text style={styles.detailValue}>{station.services.join(' · ')}</Text></View> : null}
        {station.status !== 'pending' ? <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editButton}><MaterialCommunityIcons name="pencil-outline" size={18} color={colors.brandText} /><Text style={styles.editText}>Sugerir correção deste posto</Text></Pressable> : null}
        <Text style={styles.dragHint}>Role para ver tudo · arraste a alça para baixo para fechar</Text>
      </View> : <Text style={styles.dragHint}>Toque ou arraste a alça para cima para ver mais · arraste para baixo para fechar</Text>}
    </ScrollView>
    <View style={styles.actions}><View style={styles.action}><Button variant="secondary" onPress={onContribute}>Atualizar preço</Button></View><View style={styles.action}><Button onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`)}>Ver rota</Button></View></View>
  </SafeAreaView>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sheet: { position: 'absolute', zIndex: 30, left: spacing[3], right: spacing[3], bottom: 76, maxHeight: '55%', paddingHorizontal: spacing[5], paddingTop: spacing[1], paddingBottom: spacing[4], borderRadius: radius.xl, backgroundColor: colors.graphite, overflow: 'hidden', ...shadow.sheet, elevation: 30 },
  sheetExpanded: { height: '78%', maxHeight: '78%' },
  handleGestureArea: { marginHorizontal: -spacing[2] },
  handleButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: radius.full, backgroundColor: colors.textMuted },
  head: { flexDirection: 'row', gap: spacing[2] },
  title: { flex: 1 },
  brandRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 10, letterSpacing: 1.2 },
  pending: { color: colors.warningText, fontFamily: typography.black, fontSize: 8 },
  stationName: { color: colors.offWhite, fontFamily: typography.bold, fontSize: typography.h2, marginTop: 3 },
  stationMetaRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: 4 },
  stationMeta: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.small },
  stationMetaSeparator: { color: colors.textMuted, fontFamily: typography.regular },
  stationAddress: { flex: 1 },
  close: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  priceRow: { marginTop: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center' },
  priceCopy: { flex: 1 },
  priceLabel: { color: colors.textMuted, fontFamily: typography.bold, fontSize: 9, letterSpacing: .8 },
  priceValue: { color: colors.offWhite, fontFamily: typography.black, fontSize: 25, marginTop: 2 },
  noPriceValue: { fontSize: 19 },
  priceMeta: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, marginTop: 3 },
  staleMessage: { maxWidth: 220, color: colors.warningText, fontFamily: typography.semibold, fontSize: 10, lineHeight: 14, marginTop: 4 },
  electricStatus: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  confidence: { color: colors.brandText, fontFamily: typography.bold, fontSize: 11 },
  bodyExpanded: { flex: 1 },
  bodyContent: { paddingBottom: spacing[1] },
  flexBadge: { marginTop: spacing[2] },
  confirmCard: { marginTop: spacing[2], padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  confirmTitle: { color: colors.offWhite, fontFamily: typography.black, fontSize: 13 },
  confirmCopy: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, marginTop: 2 },
  confirmActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  confirmButton: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  confirmGood: { backgroundColor: colors.brand },
  confirmChanged: { borderWidth: 1, borderColor: colors.amber },
  confirmGoodText: { color: colors.onBrand, fontFamily: typography.black, fontSize: 12 },
  confirmChangedText: { color: colors.warningText, fontFamily: typography.black, fontSize: 12 },
  expandedContent: { marginTop: spacing[3], gap: spacing[3] },
  detailRow: { padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  detailLabel: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .8 },
  detailValue: { color: colors.offWhite, fontFamily: typography.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  tripCard: { padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  tripHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] }, tripHeadingCopy: { flex: 1 }, tripSubtitle: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 14, marginTop: spacing[1] },
  tripDistance: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: spacing[3] }, tripOptions: { gap: spacing[2], marginTop: spacing[3] },
  tripOption: { padding: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.graphite }, tripOptionBest: { borderColor: colors.brandText },
  tripOptionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing[1] }, tripFuelName: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 13, textTransform: 'capitalize' }, tripBest: { color: colors.brandText, fontFamily: typography.black, fontSize: 8 },
  tripOptionBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2], marginTop: spacing[1] }, tripOptionMeta: { flex: 1, color: colors.textMuted, fontFamily: typography.regular, fontSize: 10 }, tripOptionCost: { color: colors.offWhite, fontFamily: typography.black, fontSize: 18 }, tripOptionCostMissing: { color: colors.textMuted, fontSize: 12 }, tripStale: { color: colors.warningText, fontFamily: typography.semibold, fontSize: 10, marginTop: spacing[1] },
  tripCopy: { color: colors.offWhite, fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: spacing[2] },
  tripValue: { color: colors.offWhite, fontFamily: typography.black, fontSize: 20, marginTop: spacing[2] },
  tripUnit: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 12 },
  tripWarning: { color: colors.warningText, fontFamily: typography.regular, fontSize: 11, lineHeight: 16, marginTop: spacing[2] },
  tripButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: spacing[2], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  tripButtonText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 12 },
  allPrices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  fuelPrice: { minWidth: '30%', flexGrow: 1, padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  fuelLabel: { color: colors.textMuted, fontFamily: typography.black, fontSize: 8 },
  fuelValue: { color: colors.offWhite, fontFamily: typography.black, fontSize: 14, marginTop: 4 },
  fuelStale: { color: colors.warningText, fontFamily: typography.semibold, fontSize: 8, marginTop: 3 },
  editButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  editText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 12 },
  dragHint: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, textAlign: 'center', marginTop: spacing[2] },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  action: { flex: 1 },
})
