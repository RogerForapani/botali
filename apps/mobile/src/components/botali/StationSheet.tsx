import { useMemo, useState } from 'react'
import { Linking, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radius, shadow, spacing, typography } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'
import { Button } from '../ui/Button'
import { ConfidenceBadge } from './ConfidenceBadge'
import { FlexRatioBadge } from './FlexRatioBadge'

type Props = { station: Station; mode: MapMode; favorite: boolean; onToggleFavorite: () => void; onClose: () => void; onContribute: () => void }

export function StationSheet({ station, mode, favorite, onToggleFavorite, onClose, onContribute }: Props) {
  const [expanded, setExpanded] = useState(false)
  const fuel = mode === 'electric' ? 'gasolina' : mode
  const price = station.prices[fuel]
  const flexRatio = station.prices.gasolina && station.prices.etanol
    ? Math.round(station.prices.etanol.value / station.prices.gasolina.value * 100)
    : null
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -20) setExpanded(true)
      if (gesture.dy > 20) setExpanded(false)
    },
  }), [])

  return <SafeAreaView edges={['bottom']} style={[styles.sheet, expanded && styles.sheetExpanded]} {...panResponder.panHandlers}>
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Recolher detalhes' : 'Expandir detalhes'} onPress={() => setExpanded((value) => !value)} style={styles.handleButton}><View style={styles.handle} /></Pressable>
    <View style={styles.head}>
      <View style={styles.title}>
        <Text style={styles.eyebrow}>{station.brand.toUpperCase()}</Text>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationMeta}>{station.distanceKm.toFixed(1).replace('.', ',')} km · {station.rating ? `★ ${station.rating.toFixed(1)}` : station.address}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onPress={onToggleFavorite} style={styles.close}><Text style={styles.favorite}>{favorite ? '♥' : '♡'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
    </View>
    {mode === 'electric' ? <View style={styles.priceRow}><View><Text style={styles.priceLabel}>RECARGA ELÉTRICA</Text><Text style={styles.priceValue}>Disponível</Text></View><Text style={styles.confidence}>Serviço confirmado</Text></View> : <>
      <View style={styles.priceRow}><View><Text style={styles.priceLabel}>PREÇO DA COMUNIDADE</Text><Text style={styles.priceValue}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text></View>{price ? <ConfidenceBadge score={price.confidence} /> : null}</View>
      {flexRatio ? <View style={styles.flexBadge}><FlexRatioBadge percentage={flexRatio} /></View> : null}
    </>}
    {expanded ? <View style={styles.expandedContent}>
      <View style={styles.detailRow}><Text style={styles.detailLabel}>ENDEREÇO</Text><Text style={styles.detailValue}>{station.address || 'Endereço ainda não informado'}</Text></View>
      <View style={styles.allPrices}>
        {(['gasolina', 'etanol', 'diesel_s10'] as const).map((code) => <View key={code} style={styles.fuelPrice}><Text style={styles.fuelLabel}>{code === 'diesel_s10' ? 'DIESEL' : code.toUpperCase()}</Text><Text style={styles.fuelValue}>{station.prices[code] ? `R$ ${station.prices[code]!.value.toFixed(2).replace('.', ',')}` : '—'}</Text></View>)}
      </View>
      {station.services?.length ? <View style={styles.detailRow}><Text style={styles.detailLabel}>SERVIÇOS</Text><Text style={styles.detailValue}>{station.services.join(' · ')}</Text></View> : null}
      <Text style={styles.dragHint}>Arraste para baixo para recolher</Text>
    </View> : <Text style={styles.dragHint}>Arraste para cima para ver mais</Text>}
    <View style={styles.actions}><View style={styles.action}><Button variant="secondary" onPress={onContribute}>Atualizar preço</Button></View><View style={styles.action}><Button onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`)}>Ver rota</Button></View></View>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: spacing[3], right: spacing[3], bottom: 76, maxHeight: '48%', paddingHorizontal: spacing[5], paddingTop: spacing[1], paddingBottom: spacing[4], borderRadius: radius.xl, backgroundColor: colors.graphite, ...shadow.sheet },
  sheetExpanded: { maxHeight: '78%' },
  handleButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: radius.full, backgroundColor: colors.textMuted },
  head: { flexDirection: 'row', gap: spacing[2] },
  title: { flex: 1 },
  eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  stationName: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '800', marginTop: 3 },
  stationMeta: { color: colors.textMuted, fontSize: typography.small, marginTop: 4 },
  close: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.offWhite, fontSize: 24 },
  favorite: { color: colors.brand, fontSize: 22 },
  priceRow: { marginTop: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
  priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: .8 },
  priceValue: { color: colors.offWhite, fontSize: 25, fontWeight: '900', marginTop: 2 },
  confidence: { marginLeft: 'auto', color: colors.brand, fontWeight: '800', fontSize: 11 },
  flexBadge: { marginTop: spacing[2] },
  expandedContent: { marginTop: spacing[3], gap: spacing[3] },
  detailRow: { padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface },
  detailLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  detailValue: { color: colors.offWhite, fontSize: 13, lineHeight: 18, marginTop: 4 },
  allPrices: { flexDirection: 'row', gap: spacing[2] },
  fuelPrice: { flex: 1, padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface },
  fuelLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  fuelValue: { color: colors.offWhite, fontSize: 14, fontWeight: '900', marginTop: 4 },
  dragHint: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: spacing[2] },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  action: { flex: 1 },
})
