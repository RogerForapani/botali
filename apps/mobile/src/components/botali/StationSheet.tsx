import { useMemo, useState } from 'react'
import { Linking, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'
import { Button } from '../ui/Button'
import { ConfidenceBadge } from './ConfidenceBadge'
import { FlexRatioBadge } from './FlexRatioBadge'

type Props = { station: Station; mode: MapMode; favorite: boolean; onToggleFavorite: () => void; onClose: () => void; onContribute: () => void }

export function StationSheet({ station, mode, favorite, onToggleFavorite, onClose, onContribute }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
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

  return <SafeAreaView edges={['bottom']} style={[styles.sheet, expanded && styles.sheetExpanded]}>
    <Pressable {...panResponder.panHandlers} accessibilityRole="button" accessibilityLabel={expanded ? 'Recolher detalhes' : 'Expandir detalhes'} accessibilityHint="Toque ou arraste verticalmente" onPress={() => setExpanded((value) => !value)} style={styles.handleButton}><View style={styles.handle} /></Pressable>
    <View style={styles.head}>
      <View style={styles.title}>
        <Text style={styles.eyebrow}>{station.brand.toUpperCase()}</Text>
        <Text style={styles.stationName}>{station.name}</Text>
        <Text style={styles.stationMeta}>{station.distanceKm.toFixed(1).replace('.', ',')} km · {station.rating ? `★ ${station.rating.toFixed(1)}` : station.address}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onPress={onToggleFavorite} style={styles.close}><Text style={styles.favorite}>{favorite ? '♥' : '♡'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
    </View>
    <ScrollView style={expanded ? styles.bodyExpanded : undefined} contentContainerStyle={styles.bodyContent} scrollEnabled={expanded} showsVerticalScrollIndicator={expanded}>
      {mode === 'electric' ? <View style={styles.priceRow}><View><Text style={styles.priceLabel}>RECARGA ELÉTRICA</Text><Text style={styles.priceValue}>Disponível</Text></View><Text style={styles.confidence}>Serviço confirmado</Text></View> : <>
        <View style={styles.priceRow}><View><Text style={styles.priceLabel}>PREÇO DA COMUNIDADE</Text><Text style={styles.priceValue}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text></View>{price ? <ConfidenceBadge score={price.confidence} /> : null}</View>
        {flexRatio ? <View style={styles.flexBadge}><FlexRatioBadge percentage={flexRatio} /></View> : null}
      </>}
      {expanded ? <View style={styles.expandedContent}>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>ENDEREÇO</Text><Text style={styles.detailValue}>{station.address || 'Endereço ainda não informado'}</Text></View>
        <View style={styles.allPrices}>
          {(Object.entries(station.prices) as [string, { value: number }][]).map(([code, item]) => <View key={code} style={styles.fuelPrice}><Text style={styles.fuelLabel}>{code.replaceAll('_', ' ').toUpperCase()}</Text><Text style={styles.fuelValue}>R$ {item.value.toFixed(2).replace('.', ',')}</Text></View>)}
        </View>
        {station.services?.length ? <View style={styles.detailRow}><Text style={styles.detailLabel}>SERVIÇOS</Text><Text style={styles.detailValue}>{station.services.join(' · ')}</Text></View> : null}
        <Text style={styles.dragHint}>Role para ver tudo · arraste a alça para baixo para recolher</Text>
      </View> : <Text style={styles.dragHint}>Toque ou arraste a alça para cima para ver mais</Text>}
    </ScrollView>
    <View style={styles.actions}><View style={styles.action}><Button variant="secondary" onPress={onContribute}>Atualizar preço</Button></View><View style={styles.action}><Button onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`)}>Ver rota</Button></View></View>
  </SafeAreaView>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sheet: { position: 'absolute', left: spacing[3], right: spacing[3], bottom: 76, maxHeight: '55%', paddingHorizontal: spacing[5], paddingTop: spacing[1], paddingBottom: spacing[4], borderRadius: radius.xl, backgroundColor: colors.graphite, overflow: 'hidden', ...shadow.sheet },
  sheetExpanded: { height: '78%', maxHeight: '78%' },
  handleButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: radius.full, backgroundColor: colors.textMuted },
  head: { flexDirection: 'row', gap: spacing[2] },
  title: { flex: 1 },
  eyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  stationName: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '800', marginTop: 3 },
  stationMeta: { color: colors.textMuted, fontSize: typography.small, marginTop: 4 },
  close: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.offWhite, fontSize: 24 },
  favorite: { color: colors.brandText, fontSize: 22 },
  priceRow: { marginTop: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center' },
  priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: .8 },
  priceValue: { color: colors.offWhite, fontSize: 25, fontWeight: '900', marginTop: 2 },
  confidence: { marginLeft: 'auto', color: colors.brandText, fontWeight: '800', fontSize: 11 },
  bodyExpanded: { flex: 1 },
  bodyContent: { paddingBottom: spacing[1] },
  flexBadge: { marginTop: spacing[2] },
  expandedContent: { marginTop: spacing[3], gap: spacing[3] },
  detailRow: { padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  detailLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  detailValue: { color: colors.offWhite, fontSize: 13, lineHeight: 18, marginTop: 4 },
  allPrices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  fuelPrice: { minWidth: '30%', flexGrow: 1, padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  fuelLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  fuelValue: { color: colors.offWhite, fontSize: 14, fontWeight: '900', marginTop: 4 },
  dragHint: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: spacing[2] },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] },
  action: { flex: 1 },
})
