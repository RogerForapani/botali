import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import './src/services/smartVisits'
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AuthModal } from './src/components/AuthModal'
import { AuthScreen } from './src/components/AuthScreen'
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
  const { colors, mode: themeMode } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const mapRef = useRef<MapView>(null)
  const wasOffline = useRef(false)
  const { user, loading: sessionLoading } = useSession()
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
  const [visibleRegion, setVisibleRegion] = useState<Region>(initialRegion)
  const [showSearchArea, setShowSearchArea] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [continuedAsGuest, setContinuedAsGuest] = useState(false)
  const [contributionIntent, setContributionIntent] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const [showEditStation, setShowEditStation] = useState(false)
  const [showNewStation, setShowNewStation] = useState(false)
  const [showModeration, setShowModeration] = useState(false)
  const [showEditModeration, setShowEditModeration] = useState(false)
  const [confirmingPrice, setConfirmingPrice] = useState(false)
  const [fuelOptions, setFuelOptions] = useState(fallbackFuels)
  const [serviceOptions, setServiceOptions] = useState<{ code: string; name: string }[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [seenDecisionIds, setSeenDecisionIds] = useState<string[]>([])
  useEffect(() => { loadStationOptions().then((options) => { if (options.fuels.length) setFuelOptions(options.fuels); setServiceOptions(options.services) }).catch(() => undefined) }, [])
  const visibleStations = useMemo(() => filterStations(stations, { mode, radiusKm, serviceCodes: selectedServices }), [mode, radiusKm, selectedServices, stations])
  const bestStationId = useMemo(() => findBestPriceStationId(visibleStations, mode), [mode, visibleStations])
  const favoriteStations = stations.filter((station) => favorites.ids.includes(station.id))
  const filtersActive = mode !== 'gasolina' || selectedServices.length > 0
  const modalOpen = showAuth || showPrice || showEditStation || showNewStation || showModeration || showEditModeration
  const rejectionDecisionIds = useMemo(() => activity.items.filter((item) => item.status === 'rejected' && item.resolvedAt).map((item) => `${item.id}:${item.resolvedAt}`), [activity.items])
  const unreadDecisionCount = rejectionDecisionIds.filter((id) => !seenDecisionIds.includes(id)).length
  const cacheTime = cachedAt ? new Date(cachedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null

  const returnToMap = useCallback(() => {
    setTab('explore')
    setSelected(null)
    setShowSearch(false)
    setShowFilters(false)
    setShowSearchArea(false)
    setShowAuth(false)
    setShowPrice(false)
    setShowEditStation(false)
    setShowNewStation(false)
    setShowModeration(false)
    setShowEditModeration(false)
    setContributionIntent(false)
    setLocationMessage('')
    if (!user) setContinuedAsGuest(true)
  }, [user])

  useEffect(() => {
    let active = true
    loadMapPreferences().then((preferences) => {
      if (!active || !preferences) return
      setMapCenter(preferences.center); setPendingCenter(preferences.center); setVisibleRegion({ ...preferences.center, latitudeDelta: 0.04, longitudeDelta: 0.04 }); setRadiusKm(preferences.radiusKm)
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
    if (!locationMessage) return
    const timer = setTimeout(() => setLocationMessage(''), 4500)
    return () => clearTimeout(timer)
  }, [locationMessage])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const mapIsClear = tab === 'explore' && !showSearch && !showFilters && !selected && !showAuth && !showPrice && !showEditStation && !showNewStation && !showModeration && !showEditModeration && !locationMessage && (Boolean(user) || continuedAsGuest)
      if (mapIsClear || sessionLoading) return false
      returnToMap()
      return true
    })
    return () => subscription.remove()
  }, [continuedAsGuest, locationMessage, returnToMap, selected, sessionLoading, showAuth, showEditModeration, showEditStation, showFilters, showModeration, showNewStation, showPrice, showSearch, tab, user])

  useEffect(() => {
    let active = true
    if (user?.id) AsyncStorage.getItem(`botali:seen-decisions:${user.id}`).then((value) => {
      if (!active) return
      if (!value) { setSeenDecisionIds([]); return }
      try { setSeenDecisionIds(JSON.parse(value) as string[]) } catch { setSeenDecisionIds([]) }
    }).catch(() => undefined)
    return () => { active = false }
  }, [user?.id])

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
    if (next === 'profile') { setTab('explore'); setShowAuth(true); return }
    if (next === 'contribute') {
      if (!user) { setShowAuth(true); return }
      if (selected) setShowPrice(true)
      else {
        setTab('explore'); setShowFilters(false); setContributionIntent(true); setShowSearch(true)
      }
      return
    }
    if (next === 'activity' && user?.id && rejectionDecisionIds.length) {
      setSeenDecisionIds(rejectionDecisionIds)
      AsyncStorage.setItem(`botali:seen-decisions:${user.id}`, JSON.stringify(rejectionDecisionIds)).catch(() => undefined)
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
    if (contributionIntent) {
      setContributionIntent(false)
      setShowPrice(true)
    }
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

  if (sessionLoading) return <SafeAreaProvider><View style={styles.authLoading}><StatusBar style={themeMode === 'light' ? 'dark' : 'light'} /><Image source={themeMode === 'light' ? require('./assets/icon-light.png') : require('./assets/icon-dark.png')} style={styles.authLoadingLogo} /><Text style={styles.authLoadingText}>botali</Text></View></SafeAreaProvider>

  if (!user && !continuedAsGuest) return <SafeAreaProvider><StatusBar style={themeMode === 'light' ? 'dark' : 'light'} /><AuthScreen onContinueAsGuest={() => setContinuedAsGuest(true)} /></SafeAreaProvider>

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        {tab === 'explore' ? <MapView key={`google-map-${themeMode}`} ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={visibleRegion} customMapStyle={themeMode === 'dark' ? darkMapStyle : []} userInterfaceStyle={themeMode} showsCompass={false} showsUserLocation showsMyLocationButton={false} toolbarEnabled={false} onRegionChangeComplete={(region) => { const next = { latitude: region.latitude, longitude: region.longitude }; setVisibleRegion(region); setPendingCenter(next); setShowSearchArea(Math.abs(next.latitude - mapCenter.latitude) > .002 || Math.abs(next.longitude - mapCenter.longitude) > .002) }}>
          {visibleStations.map((station) => <StationMarker key={`${station.id}-${mode}`} station={station} mode={mode} selected={selected?.id === station.id} featured={station.id === bestStationId} onPress={() => setSelected(station)} />)}
        </MapView> : tab === 'activity' ? <ActivityScreen authenticated={Boolean(user)} items={activity.items} loading={activity.loading} error={activity.error} onRetry={activity.refresh} onSignIn={() => { setTab('explore'); setShowAuth(true) }} onExplore={() => setTab('explore')} /> : <LibraryScreen stations={favoriteStations} onExplore={() => setTab('explore')} onSelect={(station) => { setSelected(station); setTab('explore') }} />}

        {tab === 'explore' ? <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
          {showSearch ? <StationSearch query={searchQuery} radiusKm={radiusKm} mode={mode} stations={visibleStations} onQueryChange={setSearchQuery} onRadiusChange={(value) => { setRadiusKm(value); setSelected(null); saveMapPreferences({ center: mapCenter, radiusKm: value }).catch(() => undefined); refresh(mapCenter, value) }} onClose={() => { setShowSearch(false); setContributionIntent(false) }} onSelect={selectFromSearch} onAddStation={openNewStation} /> : <>
          <View style={styles.header}><View style={styles.logo}><Image source={themeMode === 'light' ? require('./assets/icon-light.png') : require('./assets/icon-dark.png')} style={styles.logoImage} resizeMode="cover" /></View><Pressable accessibilityRole="button" accessibilityLabel="Pesquisar postos" style={styles.searchTrigger} onPress={() => { setShowFilters(false); setContributionIntent(false); setShowSearch(true) }}><MaterialCommunityIcons name="magnify" size={20} color={colors.brandText} /><Text numberOfLines={1} style={styles.searchTriggerText}>Pesquise aqui...</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={styles.avatar} onPress={() => setShowAuth(true)}>{user?.email ? <Text style={styles.avatarInitial}>{user.email[0].toUpperCase()}</Text> : <MaterialCommunityIcons name="account-circle-outline" size={23} color={colors.text} />}</Pressable></View>
          <View style={styles.mapActions}><View style={styles.mapActionSlot}><Pressable accessibilityRole="button" accessibilityLabel="Filtrar postos" accessibilityState={{ expanded: showFilters, selected: filtersActive }} style={[styles.filterButton, (showFilters || filtersActive) && styles.filterButtonActive]} onPress={() => setShowFilters((value) => !value)}><MaterialCommunityIcons name="tune-variant" size={22} color={showFilters || filtersActive ? colors.onBrand : colors.brandText} /></Pressable></View><View style={styles.mapActionSlot}>{showSearchArea ? <Pressable accessibilityRole="button" accessibilityLabel="Buscar postos nesta área" style={styles.searchArea} onPress={() => { setMapCenter(pendingCenter); setShowSearchArea(false); setSelected(null); saveMapPreferences({ center: pendingCenter, radiusKm }).catch(() => undefined); refresh(pendingCenter, radiusKm) }}><MaterialCommunityIcons name="map-search-outline" size={22} color={colors.text} /></Pressable> : null}</View><View style={styles.mapActionSlot}><Pressable accessibilityRole="button" accessibilityLabel="Cadastrar novo posto" style={styles.addStationButton} onPress={openNewStation}><MaterialCommunityIcons name="gas-station-outline" size={22} color={colors.onBrand} /></Pressable></View></View>
          {showFilters ? <StationFilters fuels={fuelOptions} services={serviceOptions} mode={mode} selectedServices={selectedServices} onModeChange={(value) => { setMode(value); setSelected(null) }} onToggleService={(code) => { setSelected(null); setSelectedServices((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]) }} onClear={() => { setMode('gasolina'); setSelectedServices([]); setSelected(null) }} /> : null}
          {stationsLoading || stationsError || isOnline === false || !stations.length ? <Pressable accessibilityRole="button" disabled={stationsLoading || isOnline === false} onPress={() => stationsError ? refresh(mapCenter, radiusKm) : setShowSearch(true)} style={[styles.mapStatus, (stale || isOnline === false) && styles.mapStatusOffline]}><Text style={styles.mapStatusText}>{stationsLoading ? 'Atualizando postos…' : isOnline === false || stale ? `Sem internet · dados salvos${cacheTime ? ` às ${cacheTime}` : ''}` : stationsError ? `${stationsError} · Toque para tentar novamente` : 'Nenhum posto encontrado neste raio · Toque para buscar ou cadastrar'}</Text></Pressable> : null}</>}
        </SafeAreaView> : null}

        {tab === 'explore' ? <Pressable accessibilityRole="button" accessibilityLabel="Usar minha localização" style={[styles.locate, selected ? styles.locateWithSheet : styles.locateFree]} onPress={locate}><MaterialCommunityIcons name="crosshairs-gps" size={25} color={colors.graphite} /></Pressable> : null}
        {locationMessage ? <Pressable onPress={() => setLocationMessage('')} style={styles.toast}><Text style={styles.toastText}>{locationMessage}</Text></Pressable> : null}
        {tab === 'explore' && !showSearch && !modalOpen && selected ? <StationSheet key={selected.id} station={selected} mode={mode} favorite={favorites.ids.includes(selected.id)} confirmingPrice={confirmingPrice} onToggleFavorite={() => favorites.toggle(selected.id)} onClose={() => setSelected(null)} onContribute={() => user ? setShowPrice(true) : setShowAuth(true)} onEdit={() => user ? setShowEditStation(true) : setShowAuth(true)} onConfirmPrice={confirmSelectedPrice} /> : null}
        <AuthModal visible={showAuth} user={user} stations={stations} onClose={() => setShowAuth(false)} onBack={returnToMap} onSignedOut={() => setContinuedAsGuest(false)} onOpenModeration={() => setShowModeration(true)} onOpenEditModeration={() => setShowEditModeration(true)} />
        <ModerationModal visible={showModeration} onClose={() => setShowModeration(false)} onBack={returnToMap} onModerated={() => { refresh(mapCenter, radiusKm); setSelected(null) }} />
        <EditModerationModal visible={showEditModeration} onClose={() => setShowEditModeration(false)} onBack={returnToMap} onModerated={() => { refresh(mapCenter, radiusKm); setSelected(null) }} />
        <PriceModal visible={showPrice} station={selected} initialFuel={mode === 'electric' ? 'gasolina' : mode} userId={user?.id ?? null} onClose={() => setShowPrice(false)} onBack={returnToMap} onSent={async () => { setShowPrice(false); setLocationMessage('Preço enviado! Valeu pela ajuda.'); const updated = await refresh(mapCenter, radiusKm); setSelected((current) => current ? updated.find((station) => station.id === current.id) ?? current : null); activity.refresh() }} />
        <EditStationModal visible={showEditStation} station={selected} onClose={() => setShowEditStation(false)} onBack={returnToMap} onSent={() => { setShowEditStation(false); setLocationMessage('Correção enviada para revisão. Obrigado!'); activity.refresh() }} />
        <NewStationModal visible={showNewStation} userId={user?.id ?? null} onClose={() => setShowNewStation(false)} onBack={returnToMap} onSent={() => { setShowNewStation(false); setLocationMessage('Posto cadastrado como pendente e visível apenas para você até a revisão.'); refresh(mapCenter, radiusKm) }} />
        <BottomNavigation value={tab} onChange={changeTab} notificationCount={unreadDecisionCount} />
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
  authLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, authLoadingLogo: { width: 76, height: 76, borderRadius: radius.xl }, authLoadingText: { marginTop: spacing[3], color: colors.text, fontFamily: typography.black, fontSize: typography.h2 },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: { marginHorizontal: spacing[4], marginTop: spacing[2], padding: spacing[3], borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', ...shadow.floating },
  logo: { width: 44, height: 44, borderRadius: radius.md, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  searchTrigger: { flex: 1, minHeight: 40, marginHorizontal: spacing[2], flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, backgroundColor: colors.surfaceAlt }, searchTriggerText: { flex: 1, color: colors.textMuted, fontFamily: typography.semibold, fontSize: typography.small },
  avatar: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.text, fontFamily: typography.bold, fontSize: 16 },
  mapActions: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing[4], marginTop: spacing[3] }, mapActionSlot: { flex: 1, alignItems: 'center' },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating },
  filterButtonActive: { backgroundColor: colors.brand },
  addStationButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.brand, ...shadow.floating },
  mapStatus: { alignSelf: 'center', maxWidth: '90%', marginTop: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating }, mapStatusOffline: { borderWidth: 1, borderColor: colors.amber }, mapStatusText: { color: colors.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  locate: { position: 'absolute', right: spacing[4], width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', ...shadow.floating }, locateWithSheet: { bottom: 248 }, locateFree: { bottom: 92 },
  searchArea: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.floating },
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
