import { useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { StatusBar } from 'expo-status-bar'
import './src/services/smartVisits'
import MapView, { type Region } from 'react-native-maps'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthModal } from './src/components/AuthModal'
import { PriceModal } from './src/components/PriceModal'
import { BottomNavigation, type AppTab } from './src/components/botali/BottomNavigation'
import { ActivityScreen } from './src/components/botali/ActivityScreen'
import { ConfidenceBadge } from './src/components/botali/ConfidenceBadge'
import { StationMarker } from './src/components/botali/StationMarker'
import { StationSheet } from './src/components/botali/StationSheet'
import { Chip } from './src/components/ui/Chip'
import { EmptyState } from './src/components/ui/EmptyState'
import { Button } from './src/components/ui/Button'
import { useFavorites } from './src/hooks/useFavorites'
import { useActivity } from './src/hooks/useActivity'
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
  const activity = useActivity(user?.id)
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
        </MapView> : tab === 'activity' ? <ActivityScreen authenticated={Boolean(user)} items={activity.items} loading={activity.loading} error={activity.error} onSignIn={() => setShowAuth(true)} onExplore={() => setTab('explore')} /> : <LibraryScreen stations={favoriteStations} onExplore={() => setTab('explore')} onSelect={(station) => { setSelected(station); setTab('explore') }} />}

        {tab === 'explore' ? <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
          <View style={styles.header}><View style={styles.logo}><Text style={styles.logoText}>b</Text></View><View><Text style={styles.brand}>botali</Text><Text style={styles.tagline}>{loading ? 'Buscando preços…' : usingDemo ? 'Explorando com dados demonstrativos' : 'O melhor posto tá ali.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.avatar} onPress={() => setShowAuth(true)}><Text style={styles.avatarText}>{user?.email?.[0].toUpperCase() ?? '○'}</Text></Pressable></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modes}>{modes.map((item) => <Chip key={item.value} label={item.label} selected={mode === item.value} onPress={() => { setMode(item.value); setSelected(null) }} />)}</ScrollView>
        </SafeAreaView> : null}

        {tab === 'explore' ? <Pressable accessibilityRole="button" accessibilityLabel="Usar minha localização" style={styles.locate} onPress={locate}><Text style={styles.locateText}>⌖</Text></Pressable> : null}
        {locationMessage ? <Pressable onPress={() => setLocationMessage('')} style={styles.toast}><Text style={styles.toastText}>{locationMessage}</Text></Pressable> : null}
        {tab === 'explore' ? selected ? <StationSheet station={selected} mode={mode} favorite={favorites.ids.includes(selected.id)} onToggleFavorite={() => favorites.toggle(selected.id)} onClose={() => setSelected(null)} onContribute={() => user ? setShowPrice(true) : setShowAuth(true)} /> : <View style={styles.emptyHint}><Text style={styles.emptyTitle}>{mode === 'electric' ? `${visibleStations.length} ponto de recarga logo ali` : 'Toque em um preço no mapa'}</Text><Text style={styles.emptyText}>Compare valor, distância e confiança.</Text></View> : null}
        <AuthModal visible={showAuth} user={user} stations={stations} onClose={() => setShowAuth(false)} />
        <PriceModal visible={showPrice} station={selected} initialFuel={mode === 'electric' ? 'gasolina' : mode} userId={user?.id ?? null} onClose={() => setShowPrice(false)} onSent={() => { setShowPrice(false); setLocationMessage('Preço enviado! Valeu pela ajuda.'); refresh(); activity.refresh() }} />
        <BottomNavigation value={tab} onChange={changeTab} />
      </View>
    </SafeAreaProvider>
  )
}

function LibraryScreen({ stations, onExplore, onSelect }: { stations: Station[]; onExplore: () => void; onSelect: (station: Station) => void }) {
  return <SafeAreaView style={styles.library}><View style={styles.libraryHeader}><Text style={styles.libraryEyebrow}>BOTALI</Text><Text style={styles.libraryTitle}>Favoritos</Text></View>{stations.length ? <ScrollView contentContainerStyle={styles.stationList}>{stations.map((station) => { const price = station.prices.gasolina; return <Pressable key={station.id} style={styles.stationCard} onPress={() => onSelect(station)}><View><Text style={styles.stationCardBrand}>{station.brand}</Text><Text style={styles.stationCardName}>{station.name}</Text><Text style={styles.stationCardMeta}>{station.address}</Text></View><View style={styles.stationCardPrice}>{price ? <><Text style={styles.stationCardValue}>R$ {price.value.toFixed(2).replace('.', ',')}</Text><ConfidenceBadge score={price.confidence} /></> : <Text style={styles.stationCardMeta}>Sem preço</Text>}</View></Pressable>})}</ScrollView> : <EmptyState icon="♡" title="Seus postos favoritos ficam aqui" description="Salve um posto pelo cartão no mapa para encontrá-lo rapidamente." />}<View style={styles.libraryAction}><Button onPress={onExplore}>Explorar mapa</Button></View></SafeAreaView>
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
  emptyHint: { position: 'absolute', left: spacing[4], right: spacing[4], bottom: 82, padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.graphite, ...shadow.floating }, emptyTitle: { color: colors.offWhite, fontWeight: '800', fontSize: typography.h3 }, emptyText: { color: colors.textMuted, marginTop: 3 },
  toast: { position: 'absolute', alignSelf: 'center', top: 175, maxWidth: '85%', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md, backgroundColor: colors.graphite }, toastText: { color: colors.offWhite, fontSize: typography.small },
  library: { flex: 1, paddingBottom: 82, backgroundColor: colors.graphite }, libraryHeader: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] }, libraryEyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, libraryTitle: { color: colors.offWhite, fontSize: typography.h1, fontWeight: '900', marginTop: spacing[1] }, stationList: { padding: spacing[4], gap: spacing[3] }, stationCard: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', gap: spacing[3] }, stationCardBrand: { color: colors.brand, fontSize: 10, fontWeight: '900' }, stationCardName: { color: colors.offWhite, fontSize: typography.body, fontWeight: '800', marginTop: 3 }, stationCardMeta: { maxWidth: 190, color: colors.textMuted, fontSize: 11, marginTop: 3 }, stationCardPrice: { marginLeft: 'auto', alignItems: 'flex-end', gap: spacing[2] }, stationCardValue: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900' }, libraryAction: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})
