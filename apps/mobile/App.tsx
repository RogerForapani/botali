import { useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import './src/services/smartVisits'
import MapView, { Marker, type Region } from 'react-native-maps'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthModal } from './src/components/AuthModal'
import { PriceModal } from './src/components/PriceModal'
import { BottomNavigation, type AppTab } from './src/components/botali/BottomNavigation'
import { ConfidenceBadge } from './src/components/botali/ConfidenceBadge'
import { FlexRatioBadge } from './src/components/botali/FlexRatioBadge'
import { Chip } from './src/components/ui/Chip'
import { EmptyState } from './src/components/ui/EmptyState'
import { Button } from './src/components/ui/Button'
import { useFavorites } from './src/hooks/useFavorites'
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
  const favorites = useFavorites()
  const [tab, setTab] = useState<AppTab>('explore')
  const [mode, setMode] = useState<MapMode>('gasolina')
  const [selected, setSelected] = useState<Station | null>(stations[0])
  const [locationMessage, setLocationMessage] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const visibleStations = useMemo(() => mode === 'electric' ? stations.filter((station) => station.hasElectricCharging) : stations, [mode])
  const favoriteStations = stations.filter((station) => favorites.ids.includes(station.id))

  function changeTab(next: AppTab) {
    if (next === 'profile') { setShowAuth(true); return }
    if (next === 'contribute') {
      if (!selected) { setTab('explore'); setLocationMessage('Escolha um posto no mapa para informar o preço.'); return }
      if (!user) setShowAuth(true)
      else setShowPrice(true)
      return
    }
    setTab(next)
  }

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
        {tab === 'explore' ? <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} showsCompass={false} toolbarEnabled={false}>
          {visibleStations.map((station) => <StationMarker key={station.id} station={station} mode={mode} selected={selected?.id === station.id} onPress={() => setSelected(station)} />)}
        </MapView> : <LibraryScreen tab={tab} stations={favoriteStations} onExplore={() => setTab('explore')} onSelect={(station) => { setSelected(station); setTab('explore') }} />}

        {tab === 'explore' ? <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
          <View style={styles.header}><View style={styles.logo}><Text style={styles.logoText}>b</Text></View><View><Text style={styles.brand}>botali</Text><Text style={styles.tagline}>{loading ? 'Buscando preços…' : usingDemo ? 'Explorando com dados demonstrativos' : 'O melhor posto tá ali.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.avatar} onPress={() => setShowAuth(true)}><Text style={styles.avatarText}>{user?.email?.[0].toUpperCase() ?? '○'}</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modes}>{modes.map((item) => <Chip key={item.value} label={item.label} selected={mode === item.value} onPress={() => { setMode(item.value); setSelected(null) }} />)}</ScrollView>
        </SafeAreaView> : null}

        {tab === 'explore' ? <Pressable accessibilityRole="button" accessibilityLabel="Usar minha localização" style={styles.locate} onPress={locate}><Text style={styles.locateText}>⌖</Text></Pressable> : null}
        {locationMessage ? <Pressable onPress={() => setLocationMessage('')} style={styles.toast}><Text style={styles.toastText}>{locationMessage}</Text></Pressable> : null}
        {tab === 'explore' ? selected ? <StationSheet station={selected} mode={mode} favorite={favorites.ids.includes(selected.id)} onToggleFavorite={() => favorites.toggle(selected.id)} onClose={() => setSelected(null)} onContribute={() => user ? setShowPrice(true) : setShowAuth(true)} /> : <View style={styles.emptyHint}><Text style={styles.emptyTitle}>{mode === 'electric' ? `${visibleStations.length} ponto de recarga logo ali` : 'Toque em um preço no mapa'}</Text><Text style={styles.emptyText}>Compare valor, distância e confiança.</Text></View> : null}
        <AuthModal visible={showAuth} user={user} stations={stations} onClose={() => setShowAuth(false)} />
        <PriceModal visible={showPrice} station={selected} initialFuel={mode === 'electric' ? 'gasolina' : mode} userId={user?.id ?? null} onClose={() => setShowPrice(false)} onSent={() => { setShowPrice(false); setLocationMessage('Preço enviado! Valeu pela ajuda.'); refresh() }} />
        <BottomNavigation value={tab} onChange={changeTab} />
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

function StationSheet({ station, mode, favorite, onToggleFavorite, onClose, onContribute }: { station: Station; mode: MapMode; favorite: boolean; onToggleFavorite: () => void; onClose: () => void; onContribute: () => void }) {
  const fuel = mode === 'electric' ? 'gasolina' : mode
  const price = station.prices[fuel]
  const flexRatio = station.prices.gasolina && station.prices.etanol ? Math.round(station.prices.etanol.value / station.prices.gasolina.value * 100) : null
  return <SafeAreaView edges={['bottom']} style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHead}><View style={styles.sheetTitle}><Text style={styles.eyebrow}>{station.brand.toUpperCase()}</Text><Text style={styles.stationName}>{station.name}</Text><Text style={styles.stationMeta}>{station.distanceKm.toFixed(1).replace('.', ',')} km · {station.rating ? `★ ${station.rating.toFixed(1)}` : station.address}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} onPress={onToggleFavorite} style={styles.close}><Text style={styles.favorite}>{favorite ? '♥' : '♡'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>{mode === 'electric' ? <View style={styles.priceRow}><View><Text style={styles.priceLabel}>RECARGA ELÉTRICA</Text><Text style={styles.priceValue}>Disponível</Text></View><Text style={styles.confidence}>Serviço confirmado</Text></View> : <><View style={styles.priceRow}><View><Text style={styles.priceLabel}>PREÇO DA COMUNIDADE</Text><Text style={styles.priceValue}>{price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text></View>{price ? <ConfidenceBadge score={price.confidence} /> : null}</View>{flexRatio ? <View style={styles.flexBadge}><FlexRatioBadge percentage={flexRatio} /></View> : null}</>}<View style={styles.actions}><View style={styles.action}><Button variant="secondary" onPress={onContribute}>Atualizar preço</Button></View><View style={styles.action}><Button onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`)}>Ver rota</Button></View></View></SafeAreaView>
}

function LibraryScreen({ tab, stations, onExplore, onSelect }: { tab: AppTab; stations: Station[]; onExplore: () => void; onSelect: (station: Station) => void }) {
  const title = tab === 'favorites' ? 'Favoritos' : 'Atividade'
  return <SafeAreaView style={styles.library}><View style={styles.libraryHeader}><Text style={styles.libraryEyebrow}>BOTALI</Text><Text style={styles.libraryTitle}>{title}</Text></View>{tab === 'favorites' && stations.length ? <ScrollView contentContainerStyle={styles.stationList}>{stations.map((station) => { const price = station.prices.gasolina; return <Pressable key={station.id} style={styles.stationCard} onPress={() => onSelect(station)}><View><Text style={styles.stationCardBrand}>{station.brand}</Text><Text style={styles.stationCardName}>{station.name}</Text><Text style={styles.stationCardMeta}>{station.address}</Text></View><View style={styles.stationCardPrice}>{price ? <><Text style={styles.stationCardValue}>R$ {price.value.toFixed(2).replace('.', ',')}</Text><ConfidenceBadge score={price.confidence} /></> : <Text style={styles.stationCardMeta}>Sem preço</Text>}</View></Pressable>})}</ScrollView> : <EmptyState icon={tab === 'favorites' ? '♡' : '◷'} title={tab === 'favorites' ? 'Seus postos favoritos ficam aqui' : 'Sua atividade vai aparecer aqui'} description={tab === 'favorites' ? 'Salve um posto pelo cartão no mapa para encontrá-lo rapidamente.' : 'Preços enviados, confirmações e contribuições serão organizados neste histórico.'} />}<View style={styles.libraryAction}><Button onPress={onExplore}>Explorar mapa</Button></View></SafeAreaView>
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
  sheet: { position: 'absolute', left: spacing[3], right: spacing[3], bottom: 76, paddingHorizontal: spacing[5], paddingTop: spacing[2], paddingBottom: spacing[4], borderRadius: radius.xl, backgroundColor: colors.graphite, ...shadow.sheet },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[3] }, sheetHead: { flexDirection: 'row', gap: spacing[2] }, sheetTitle: { flex: 1 }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, stationName: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '800', marginTop: 3 }, stationMeta: { color: colors.textMuted, fontSize: typography.small, marginTop: 4 }, close: { width: 38, height: 38, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.offWhite, fontSize: 24 }, favorite: { color: colors.brand, fontSize: 22 },
  priceRow: { marginTop: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }, priceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: .8 }, priceValue: { color: colors.offWhite, fontSize: 25, fontWeight: '900', marginTop: 2 }, confidence: { marginLeft: 'auto', color: colors.brand, fontWeight: '800', fontSize: 11 }, flexBadge: { marginTop: spacing[2] },
  actions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }, action: { flex: 1 }, secondaryButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }, primaryButton: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.offWhite, fontWeight: '800' }, primaryText: { color: colors.graphite, fontWeight: '900' },
  emptyHint: { position: 'absolute', left: spacing[4], right: spacing[4], bottom: 82, padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.graphite, ...shadow.floating }, emptyTitle: { color: colors.offWhite, fontWeight: '800', fontSize: typography.h3 }, emptyText: { color: colors.textMuted, marginTop: 3 },
  toast: { position: 'absolute', alignSelf: 'center', top: 175, maxWidth: '85%', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md, backgroundColor: colors.graphite }, toastText: { color: colors.offWhite, fontSize: typography.small },
  library: { flex: 1, paddingBottom: 82, backgroundColor: colors.graphite }, libraryHeader: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] }, libraryEyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, libraryTitle: { color: colors.offWhite, fontSize: typography.h1, fontWeight: '900', marginTop: spacing[1] }, stationList: { padding: spacing[4], gap: spacing[3] }, stationCard: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', gap: spacing[3] }, stationCardBrand: { color: colors.brand, fontSize: 10, fontWeight: '900' }, stationCardName: { color: colors.offWhite, fontSize: typography.body, fontWeight: '800', marginTop: 3 }, stationCardMeta: { maxWidth: 190, color: colors.textMuted, fontSize: 11, marginTop: 3 }, stationCardPrice: { marginLeft: 'auto', alignItems: 'flex-end', gap: spacing[2] }, stationCardValue: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900' }, libraryAction: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})
