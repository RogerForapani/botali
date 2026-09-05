import { useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import MapView, { Marker, type Region } from 'react-native-maps'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthModal } from './src/components/AuthModal'
import { PriceModal } from './src/components/PriceModal'
import { useSession } from './src/hooks/useSession'
import { useStations } from './src/hooks/useStations'
import { colors, radius, shadow, spacing, typography } from './src/theme/tokens'
import type { MapMode, Station } from './src/types'

const initialRegion: Region = { latitude: -20.0247, longitude: -44.0562, latitudeDelta: 0.08, longitudeDelta: 0.08 }
const modes: { value: MapMode; label: string }[] = [
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'diesel_s10', label: 'Diesel' },
  { value: 'electric', label: '⚡ Recarga' },
]

export default function App() {
  const mapRef = useRef<MapView>(null)
  const { user } = useSession()
  const { stations, loading, usingDemo, refresh } = useStations()
  const [mode, setMode] = useState<MapMode>('gasolina')
  const [selected, setSelected] = useState<Station | null>(stations[0])
  const [locationMessage, setLocationMessage] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const visibleStations = useMemo(() => mode === 'electric' ? stations.filter((station) => station.hasElectricCharging) : stations, [mode])

  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) return setLocationMessage('Ative a localização para ver postos perto de você.')
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    mapRef.current?.animateToRegion({ latitude: current.coords.latitude, longitude: current.coords.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500)
    setLocationMessage('Mapa centralizado na sua localização.')
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} showsCompass={false} toolbarEnabled={false}>
          {visibleStations.map((station) => <StationMarker key={station.id} station={station} mode={mode} selected={selected?.id === station.id} onPress={() => setSelected(station)} />)}
        </MapView>

        <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
          <View style={styles.header}><View style={styles.logo}><Text style={styles.logoText}>b</Text></View><View><Text style={styles.brand}>botali</Text><Text style={styles.tagline}>{loading ? 'Buscando preços…' : usingDemo ? 'Explorando com dados demonstrativos' : 'O melhor posto tá ali.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.avatar} onPress={() => setShowAuth(true)}><Text style={styles.avatarText}>{user?.email?.[0].toUpperCase() ?? '○'}</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modes}>{modes.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: mode === item.value }} style={[styles.mode, mode === item.value && styles.modeActive]} onPress={() => { setMode(item.value); setSelected(null) }}><Text style={[styles.modeText, mode === item.value && styles.modeTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
        </SafeAreaView>

        <Pressable accessibilityRole="button" accessibilityLabel="Usar minha localização" style={styles.locate} onPress={locate}><Text style={styles.locateText}>⌖</Text></Pressable>
        {locationMessage ? <Pressable onPress={() => setLocationMessage('')} style={styles.toast}><Text style={styles.toastText}>{locationMessage}</Text></Pressable> : null}
        {selected ? <StationSheet station={selected} mode={mode} onClose={() => setSelected(null)} onContribute={() => user ? setShowPrice(true) : setShowAuth(true)} /> : <View style={styles.emptyHint}><Text style={styles.emptyTitle}>{mode === 'electric' ? `${visibleStations.length} ponto de recarga logo ali` : 'Toque em um preço no mapa'}</Text><Text style={styles.emptyText}>Compare valor, distância e confiança.</Text></View>}
        <AuthModal visible={showAuth} user={user} onClose={() => setShowAuth(false)} />
        <PriceModal visible={showPrice} station={selected} initialFuel={mode === 'electric' ? 'gasolina' : mode} userId={user?.id ?? null} onClose={() => setShowPrice(false)} onSent={() => { setShowPrice(false); setLocationMessage('Preço enviado! Valeu pela ajuda.'); refresh() }} />
      </View>
    </SafeAreaProvider>
  )
}

function StationMarker({ station, mode, selected, onPress }: { station: Station; mode: MapMode; selected: boolean; onPress: () => void }) {
  const price = mode === 'electric' ? null : station.prices[mode]
  const ratio = station.prices.gasolina && station.prices.etanol ? Math.round(station.prices.etanol.value / station.prices.gasolina.value * 100) : null
  return <Marker coordinate={{ latitude: station.latitude, longitude: station.longitude }} onPress={onPress} tracksViewChanges={false}>
    <View style={[styles.marker, selected && styles.markerSelected, mode === 'electric' && styles.markerElectric]}>
      <Text style={styles.markerPrice}>{mode === 'electric' ? '⚡ Recarga' : price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text>
      {ratio && mode !== 'electric' ? <Text style={[styles.markerRatio, ratio <= 70 && styles.markerRatioGood]}>Etanol {ratio}%</Text> : null}
    </View>
  </Marker>
}

function StationSheet({ station, mode, onClose, onContribute }: { station: Station; mode: MapMode; onClose: () => void; onContribute: () => void }) {
  const fuel = mode === 'electric' ? 'gasolina' : mode
  const price = station.prices[fuel]
  return <SafeAreaView edges={['bottom']} style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHead}><View><Text style={styles.eyebrow}>{station.brand.toUpperCase()}</Text><Text style={styles.stationName}>{station.name}</Text><Text style={styles.stationMeta}>{station.distanceKm.toFixed(1).replace('.', ',')} km · {station.rating ? `★ ${station.rating.toFixed(1)}` : station.address}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>{mode === 'electric' ? <View style={styles.priceRow}><View><Text style={styles.priceLabel}>RECARGA ELÉTRICA</Text><Text style={styles.priceValue}>Disponível</Text></View><Text style={styles.confidence}>Serviço confirmado</Text></View> : <View style={styles.priceRow}><View><Text style={styles.priceLabel}>PREÇO DA COMUNIDADE</Text><Text style={styles.priceValue}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text></View>{price ? <Text style={styles.confidence}>{price.confidence}% confiança{price.reports ? ` · ${price.reports} relatos` : ''}</Text> : null}</View>}<View style={styles.actions}><Pressable style={styles.secondaryButton} onPress={onContribute}><Text style={styles.secondaryText}>Atualizar preço</Text></Pressable><Pressable style={styles.primaryButton} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`)}><Text style={styles.primaryText}>Ver rota</Text></Pressable></View></SafeAreaView>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.graphite },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { marginHorizontal: spacing[4], marginTop: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.graphite, flexDirection: 'row', alignItems: 'center', ...shadow.floating },
  logo: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] },
  logoText: { color: colors.graphite, fontSize: 26, fontWeight: '900' },
  brand: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '800' },
  tagline: { color: colors.textMuted, fontSize: typography.caption, marginTop: 1 },
  avatar: { marginLeft: 'auto', width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.offWhite, fontSize: 22 },
  modes: { paddingHorizontal: spacing[4], paddingTop: spacing[3], gap: spacing[2] },
  mode: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.graphite, ...shadow.floating },
  modeActive: { backgroundColor: colors.brand }, modeText: { color: colors.offWhite, fontWeight: '700', fontSize: typography.small }, modeTextActive: { color: colors.graphite },
  locate: { position: 'absolute', right: spacing[4], bottom: 248, width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', ...shadow.floating }, locateText: { color: colors.graphite, fontSize: 27, fontWeight: '800' },
  marker: { minWidth: 86, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 3, borderColor: colors.offWhite, borderRadius: radius.md, backgroundColor: colors.graphite, alignItems: 'center', ...shadow.marker },
  markerSelected: { backgroundColor: colors.brand, transform: [{ scale: 1.08 }] }, markerElectric: { backgroundColor: colors.info }, markerPrice: { color: colors.offWhite, fontWeight: '900', fontSize: 13 }, markerRatio: { color: colors.textMuted, fontWeight: '700', fontSize: 9, marginTop: 2 }, markerRatioGood: { color: '#E9FF9D' },
  sheet: { position: 'absolute', left: spacing[3], right: spacing[3], bottom: spacing[3], paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[4], borderRadius: radius.xl, backgroundColor: colors.graphite, ...shadow.sheet },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[3] }, sheetHead: { flexDirection: 'row' }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, stationName: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '800', marginTop: 3 }, stationMeta: { color: colors.textMuted, fontSize: typography.small, marginTop: 4 }, close: { marginLeft: 'auto', width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.offWhite, fontSize: 24 },
  priceRow: { marginTop: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }, priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: .8 }, priceValue: { color: colors.offWhite, fontSize: 25, fontWeight: '900', marginTop: 2 }, confidence: { marginLeft: 'auto', color: colors.brand, fontWeight: '800', fontSize: 11 },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }, secondaryButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, primaryButton: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.offWhite, fontWeight: '800' }, primaryText: { color: colors.graphite, fontWeight: '900' },
  emptyHint: { position: 'absolute', left: spacing[4], right: spacing[4], bottom: spacing[5], padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.graphite, ...shadow.floating }, emptyTitle: { color: colors.offWhite, fontWeight: '800', fontSize: typography.h3 }, emptyText: { color: colors.textMuted, marginTop: 3 },
  toast: { position: 'absolute', alignSelf: 'center', top: 175, maxWidth: '85%', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md, backgroundColor: colors.graphite }, toastText: { color: colors.offWhite, fontSize: typography.small },
})
