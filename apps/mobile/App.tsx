import { useEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import './src/services/smartVisits'
import MapView, { type Region } from 'react-native-maps'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthModal } from './src/components/AuthModal'
import { EditStationModal } from './src/components/EditStationModal'
import { EditModerationModal } from './src/components/EditModerationModal'
import { PriceModal } from './src/components/PriceModal'
import { NewStationModal } from './src/components/NewStationModal'
import { ModerationModal } from './src/components/ModerationModal'
import { BottomNavigation, type AppTab } from './src/components/botali/BottomNavigation'
import { ActivityScreen } from './src/components/botali/ActivityScreen'
import { ConfidenceBadge } from './src/components/botali/ConfidenceBadge'
import { StationMarker } from './src/components/botali/StationMarker'
import { StationFilters } from './src/components/botali/StationFilters'
import { StationSearch } from './src/components/botali/StationSearch'
import { StationSheet } from './src/components/botali/StationSheet'
import { EmptyState } from './src/components/ui/EmptyState'
import { Button } from './src/components/ui/Button'
import { useFavorites } from './src/hooks/useFavorites'
import { useActivity } from './src/hooks/useActivity'
import { useSession } from './src/hooks/useSession'
import { useStations } from './src/hooks/useStations'
import { useConnectivity } from './src/hooks/useConnectivity'
import { confirmPriceAtStation, loadStationOptions } from './src/services/stations'
import { loadMapPreferences, saveMapPreferences } from './src/services/mapPreferences'
import { syncSmartVisitStations } from './src/services/smartVisits'
import { useTheme } from './src/theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from './src/theme/tokens'
import type { MapMode, Station } from './src/types'
import { filterStations, findBestPriceStationId } from './src/utils/stationFilters'

const initialRegion: Region = { latitude: -20.0247, longitude: -44.0562, latitudeDelta: 0.08, longitudeDelta: 0.08 }
const initialCenter = { latitude: initialRegion.latitude, longitude: initialRegion.longitude }
const fallbackFuels = [{ code: 'gasolina', name: 'Gasolina comum' }, { code: 'etanol', name: 'Etanol' }, { code: 'diesel_s10', name: 'Diesel S10' }]

export default function App() {
  const { colors, mode: themeMode, toggle } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const mapRef = useRef<MapView>(null)
  const wasOffline = useRef(false)
  const { user } = useSession()
  const { stations, loading: stationsLoading, error: stationsError, stale, cachedAt, refresh } = useStations(initialCenter, 10)
  const isOnline = useConnectivity()
  const favorites = useFavorites()
  const activity = useActivity(user?.id)
  const [tab, setTab] = useState<AppTab>('explore')
  const [mode, setMode] = useState<MapMode>('gasolina')
  const [selected, setSelected] = useState<Station | null>(stations[0])
  const [locationMessage, setLocationMessage] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState(10)
  const [mapCenter, setMapCenter] = useState(initialCenter)
  const [pendingCenter, setPendingCenter] = useState(initialCenter)
  const [showSearchArea, setShowSearchArea] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const [showEditStation, setShowEditStation] = useState(false)
  const [showNewStation, setShowNewStation] = useState(false)
  const [showModeration, setShowModeration] = useState(false)
  const [showEditModeration, setShowEditModeration] = useState(false)
  const [confirmingPrice, setConfirmingPrice] = useState(false)
  const [fuelOptions, setFuelOptions] = useState(fallbackFuels)
  const [serviceOptions, setServiceOptions] = useState<{ code: string; name: string }[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  useEffect(() => { loadStationOptions().then((options) => { if (options.fuels.length) setFuelOptions(options.fuels); setServiceOptions(options.services) }).catch(() => undefined) }, [])
  const visibleStations = useMemo(() => filterStations(stations, { mode, radiusKm, serviceCodes: selectedServices }), [mode, radiusKm, selectedServices, stations])
  const bestStationId = useMemo(() => findBestPriceStationId(visibleStations, mode), [mode, visibleStations])
  const favoriteStations = stations.filter((station) => favorites.ids.includes(station.id))
  const selectedModeLabel = mode === 'electric' ? 'Recarga elétrica' : fuelOptions.find((item) => item.code === mode)?.name ?? mode.replaceAll('_', ' ')
  const cacheTime = cachedAt ? new Date(cachedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null

  useEffect(() => {
    let active = true
    loadMapPreferences().then((preferences) => {
      if (!active || !preferences) return
      setMapCenter(preferences.center); setPendingCenter(preferences.center); setRadiusKm(preferences.radiusKm)
      mapRef.current?.animateToRegion({ ...preferences.center, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 0)
      refresh(preferences.center, preferences.radiusKm)
    })
    return () => { active = false }
  }, [refresh])

  useEffect(() => {
    if (isOnline === false) wasOffline.current = true
    else if (isOnline && wasOffline.current) {
      wasOffline.current = false
      refresh(mapCenter, radiusKm)
    }
  }, [isOnline, mapCenter, radiusKm, refresh])

  useEffect(() => { syncSmartVisitStations(stations).catch(() => undefined) }, [stations])

  useEffect(() => {
    let active = true
    const openVisitedStation = async (response: Notifications.NotificationResponse | null) => {
      if (!active || !response) return
      const data = response.notification.request.content.data ?? {}
      const stationId = typeof data.stationId === 'string' ? data.stationId : null
      const latitude = Number(data.latitude); const longitude = Number(data.longitude)
      if (!stationId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return
      await Notifications.clearLastNotificationResponseAsync()
      const center = { latitude, longitude }
      setTab('explore'); setShowAuth(false); setShowSearch(false); setShowFilters(false); setMapCenter(center); setPendingCenter(center)
      const rows = await refresh(center, radiusKm)
      if (!active) return
      setSelected(rows.find((station) => station.id === stationId) ?? null)
      mapRef.current?.animateToRegion({ ...center, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 450)
    }
    Notifications.getLastNotificationResponseAsync().then(openVisitedStation)
    const subscription = Notifications.addNotificationResponseReceivedListener(openVisitedStation)
    return () => { active = false; subscription.remove() }
  }, [radiusKm, refresh])

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
    const center = { latitude: current.coords.latitude, longitude: current.coords.longitude }
    setMapCenter(center); setPendingCenter(center); setShowSearchArea(false)
    saveMapPreferences({ center, radiusKm }).catch(() => undefined)
    mapRef.current?.animateToRegion({ ...center, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500)
    await refresh(center, radiusKm)
    setLocationMessage('Mapa centralizado na sua localização.')
  }

  function selectFromSearch(station: Station) {
    setSelected(station)
    setShowSearch(false)
    mapRef.current?.animateToRegion({ latitude: station.latitude, longitude: station.longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 450)
  }

  function openNewStation() {
    setShowSearch(false)
    setShowFilters(false)
    if (user) setShowNewStation(true)
    else setShowAuth(true)
  }

  async function confirmSelectedPrice(agrees: boolean) {
    if (!selected || mode === 'electric') return
    const currentPrice = selected.prices[mode]
    if (!currentPrice?.submissionId) return
    if (!user) { setShowAuth(true); return }
    setConfirmingPrice(true)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (!permission.granted) { setLocationMessage('Permita a localização para confirmar o preço no posto.'); return }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const distance = await confirmPriceAtStation({ submissionId: currentPrice.submissionId, latitude: current.coords.latitude, longitude: current.coords.longitude, agrees })
      const updated = await refresh(mapCenter, radiusKm)
      setSelected(updated.find((station) => station.id === selected.id) ?? selected)
      setLocationMessage(agrees ? `Preço confirmado a ${distance} m do posto. Obrigado!` : `Preço marcado como diferente a ${distance} m. Informe o valor atual.`)
      if (!agrees) setShowPrice(true)
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Não foi possível confirmar este preço.')
    } finally {
      setConfirmingPrice(false)
    }
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        {tab === 'explore' ? <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} customMapStyle={themeMode === 'dark' ? darkMapStyle : []} userInterfaceStyle={themeMode} showsCompass={false} showsUserLocation showsMyLocationButton={false} toolbarEnabled={false} onRegionChangeComplete={(region) => { const next = { latitude: region.latitude, longitude: region.longitude }; setPendingCenter(next); setShowSearchArea(Math.abs(next.latitude - mapCenter.latitude) > .002 || Math.abs(next.longitude - mapCenter.longitude) > .002) }}>
          {visibleStations.map((station) => <StationMarker key={`${station.id}-${mode}`} station={station} mode={mode} selected={selected?.id === station.id} featured={station.id === bestStationId} onPress={() => setSelected(station)} />)}
        </MapView> : tab === 'activity' ? <ActivityScreen authenticated={Boolean(user)} items={activity.items} loading={activity.loading} error={activity.error} onRetry={activity.refresh} onSignIn={() => setShowAuth(true)} onExplore={() => setTab('explore')} /> : <LibraryScreen stations={favoriteStations} onExplore={() => setTab('explore')} onSelect={(station) => { setSelected(station); setTab('explore') }} />}

        {tab === 'explore' ? <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
          {showSearch ? <StationSearch query={searchQuery} radiusKm={radiusKm} mode={mode} stations={visibleStations} onQueryChange={setSearchQuery} onRadiusChange={(value) => { setRadiusKm(value); setSelected(null); saveMapPreferences({ center: mapCenter, radiusKm: value }).catch(() => undefined); refresh(mapCenter, value) }} onClose={() => setShowSearch(false)} onSelect={selectFromSearch} onAddStation={openNewStation} /> : <>
          <View style={styles.header}><View style={styles.logo}><Image source={themeMode === 'light' ? require('./assets/icon-light.png') : require('./assets/icon-dark.png')} style={styles.logoImage} resizeMode="cover" /></View><View style={styles.headerSpacer} /><Pressable accessibilityRole="button" accessibilityLabel="Buscar postos" style={styles.iconButton} onPress={() => { setShowFilters(false); setShowSearch(true) }}><MaterialCommunityIcons name="magnify" size={23} color={colors.brandText} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'} style={styles.themeButton} onPress={toggle}><MaterialCommunityIcons name={themeMode === 'light' ? 'weather-night' : 'weather-sunny'} size={21} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.avatar} onPress={() => setShowAuth(true)}>{user?.email ? <Text style={styles.avatarInitial}>{user.email[0].toUpperCase()}</Text> : <MaterialCommunityIcons name="account-circle-outline" size={23} color={colors.text} />}</Pressable></View>
          <View style={styles.mapActions}><Pressable accessibilityRole="button" accessibilityLabel="Filtrar postos" accessibilityState={{ expanded: showFilters }} style={[styles.filterButton, showFilters && styles.filterButtonActive]} onPress={() => setShowFilters((value) => !value)}><MaterialCommunityIcons name="tune-variant" size={20} color={showFilters ? colors.onBrand : colors.brandText} /><Text numberOfLines={1} style={[styles.filterText, showFilters && styles.filterTextActive]}>Filtros · {selectedModeLabel}{selectedServices.length ? ` · ${selectedServices.length}` : ''}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Cadastrar novo posto" style={styles.addStationButton} onPress={openNewStation}><MaterialCommunityIcons name="gas-station-outline" size={19} color={colors.onBrand} /><Text style={styles.addStationText}>Posto</Text></Pressable></View>
          {showFilters ? <StationFilters fuels={fuelOptions} services={serviceOptions} mode={mode} selectedServices={selectedServices} onModeChange={(value) => { setMode(value); setSelected(null) }} onToggleService={(code) => { setSelected(null); setSelectedServices((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]) }} onClear={() => { setSelectedServices([]); setSelected(null) }} /> : null}
          {stationsLoading || stationsError || isOnline === false ? <Pressable accessibilityRole="button" disabled={stationsLoading || isOnline === false} onPress={() => refresh(mapCenter, radiusKm)} style={[styles.mapStatus, (stale || isOnline === false) && styles.mapStatusOffline]}><Text style={styles.mapStatusText}>{stationsLoading ? 'Atualizando postos…' : isOnline === false || stale ? `Sem internet · dados salvos${cacheTime ? ` às ${cacheTime}` : ''}` : `${stationsError} · Toque para tentar novamente`}</Text></Pressable> : null}</>}
        </SafeAreaView> : null}

        {tab === 'explore' ? <Pressable accessibilityRole="button" accessibilityLabel="Usar minha localização" style={[styles.locate, selected ? styles.locateWithSheet : styles.locateFree]} onPress={locate}><MaterialCommunityIcons name="crosshairs-gps" size={25} color={colors.graphite} /></Pressable> : null}
        {tab === 'explore' && showSearchArea && !showSearch ? <Pressable accessibilityRole="button" style={styles.searchArea} onPress={() => { setMapCenter(pendingCenter); setShowSearchArea(false); setSelected(null); saveMapPreferences({ center: pendingCenter, radiusKm }).catch(() => undefined); refresh(pendingCenter, radiusKm) }}><Text style={styles.searchAreaText}>Buscar nesta área</Text></Pressable> : null}
        {locationMessage ? <Pressable onPress={() => setLocationMessage('')} style={styles.toast}><Text style={styles.toastText}>{locationMessage}</Text></Pressable> : null}
        {tab === 'explore' && !showSearch && selected ? <StationSheet key={selected.id} station={selected} mode={mode} favorite={favorites.ids.includes(selected.id)} confirmingPrice={confirmingPrice} onToggleFavorite={() => favorites.toggle(selected.id)} onClose={() => setSelected(null)} onContribute={() => user ? setShowPrice(true) : setShowAuth(true)} onEdit={() => user ? setShowEditStation(true) : setShowAuth(true)} onConfirmPrice={confirmSelectedPrice} /> : null}
        <AuthModal visible={showAuth} user={user} stations={stations} onClose={() => setShowAuth(false)} onOpenModeration={() => setShowModeration(true)} onOpenEditModeration={() => setShowEditModeration(true)} />
        <ModerationModal visible={showModeration} onClose={() => setShowModeration(false)} onModerated={() => { refresh(mapCenter, radiusKm); setSelected(null) }} />
        <EditModerationModal visible={showEditModeration} onClose={() => setShowEditModeration(false)} onModerated={() => { refresh(mapCenter, radiusKm); setSelected(null) }} />
        <PriceModal visible={showPrice} station={selected} initialFuel={mode === 'electric' ? 'gasolina' : mode} userId={user?.id ?? null} onClose={() => setShowPrice(false)} onSent={async () => { setShowPrice(false); setLocationMessage('Preço enviado! Valeu pela ajuda.'); const updated = await refresh(mapCenter, radiusKm); setSelected((current) => current ? updated.find((station) => station.id === current.id) ?? current : null); activity.refresh() }} />
        <EditStationModal visible={showEditStation} station={selected} onClose={() => setShowEditStation(false)} onSent={() => { setShowEditStation(false); setLocationMessage('Correção enviada para revisão. Obrigado!'); activity.refresh() }} />
        <NewStationModal visible={showNewStation} userId={user?.id ?? null} onClose={() => setShowNewStation(false)} onSent={() => { setShowNewStation(false); setLocationMessage('Posto cadastrado como pendente e visível apenas para você até a revisão.'); refresh(mapCenter, radiusKm) }} />
        <BottomNavigation value={tab} onChange={changeTab} />
      </View>
    </SafeAreaProvider>
  )
}

function LibraryScreen({ stations, onExplore, onSelect }: { stations: Station[]; onExplore: () => void; onSelect: (station: Station) => void }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  return <SafeAreaView style={styles.library}><View style={styles.libraryHeader}><Text style={styles.libraryEyebrow}>BOTALI</Text><Text style={styles.libraryTitle}>Favoritos</Text></View>{stations.length ? <ScrollView contentContainerStyle={styles.stationList}>{stations.map((station) => { const price = station.prices.gasolina; return <Pressable key={station.id} style={styles.stationCard} onPress={() => onSelect(station)}><View><Text style={styles.stationCardBrand}>{station.brand}</Text><Text style={styles.stationCardName}>{station.name}</Text><Text style={styles.stationCardMeta}>{station.address}</Text></View><View style={styles.stationCardPrice}>{price ? <><Text style={styles.stationCardValue}>R$ {price.value.toFixed(2).replace('.', ',')}</Text><ConfidenceBadge score={price.confidence} /></> : <Text style={styles.stationCardMeta}>Sem preço</Text>}</View></Pressable>})}</ScrollView> : <EmptyState icon="heart-outline" title="Seus postos favoritos ficam aqui" description="Salve um posto pelo cartão no mapa para encontrá-lo rapidamente." />}<View style={styles.libraryAction}><Button onPress={onExplore}>Explorar mapa</Button></View></SafeAreaView>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { marginHorizontal: spacing[4], marginTop: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.floating },
  logo: { width: 44, height: 44, borderRadius: radius.md, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  headerSpacer: { flex: 1 },
  iconButton: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatar: { marginLeft: 'auto', width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  themeButton: { marginLeft: spacing[2], width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontFamily: typography.bold, fontSize: 16 },
  mapActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing[4], marginTop: spacing[3], gap: spacing[2] },
  filterButton: { minHeight: 44, maxWidth: '72%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating },
  filterButtonActive: { backgroundColor: colors.brand }, filterText: { marginLeft: spacing[2], color: colors.text, fontFamily: typography.bold, fontSize: typography.small }, filterTextActive: { color: colors.onBrand },
  addStationButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[3], borderRadius: radius.full, backgroundColor: colors.brand, ...shadow.floating }, addStationText: { color: colors.onBrand, fontFamily: typography.bold, fontSize: typography.small },
  mapStatus: { alignSelf: 'center', maxWidth: '90%', marginTop: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating }, mapStatusOffline: { borderWidth: 1, borderColor: colors.amber }, mapStatusText: { color: colors.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  locate: { position: 'absolute', right: spacing[4], width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', ...shadow.floating }, locateWithSheet: { bottom: 248 }, locateFree: { bottom: 92 },
  searchArea: { position: 'absolute', alignSelf: 'center', top: 166, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[4], borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating }, searchAreaText: { color: colors.text, fontSize: typography.small, fontWeight: '900' },
  toast: { position: 'absolute', alignSelf: 'center', top: 175, maxWidth: '85%', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: radius.md, backgroundColor: colors.surface }, toastText: { color: colors.text, fontSize: typography.small },
  library: { flex: 1, paddingBottom: 82, backgroundColor: colors.background }, libraryHeader: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] }, libraryEyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, libraryTitle: { color: colors.text, fontSize: typography.h1, fontWeight: '900', marginTop: spacing[1] }, stationList: { padding: spacing[4], gap: spacing[3] }, stationCard: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', gap: spacing[3] }, stationCardBrand: { color: colors.brandText, fontSize: 10, fontWeight: '900' }, stationCardName: { color: colors.text, fontSize: typography.body, fontWeight: '800', marginTop: 3 }, stationCardMeta: { maxWidth: 190, color: colors.textMuted, fontSize: 11, marginTop: 3 }, stationCardPrice: { marginLeft: 'auto', alignItems: 'flex-end', gap: spacing[2] }, stationCardValue: { color: colors.text, fontSize: typography.h3, fontWeight: '900' }, libraryAction: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#202020' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#F8FAFC' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111111' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#525252' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#252525' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#292929' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#26352B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3A3A3A' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#242424' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#525252' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#303030' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#151515' }] },
]
