import { Marker } from 'react-native-maps'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, typography, type ThemeColors } from '../../theme/tokens'
import type { StationClusterItem } from '../../utils/mapClustering'

export function StationClusterMarker({ cluster, onPress }: { cluster: StationClusterItem; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <Marker coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }} onPress={onPress} tracksViewChanges={false} accessibilityLabel={`Grupo com ${cluster.stations.length} postos`}>
    <View style={styles.cluster}><MaterialCommunityIcons name="gas-station" size={17} color={colors.onBrand} /><Text style={styles.count}>{cluster.stations.length}</Text></View>
  </Marker>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cluster: { minWidth: 48, height: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 3, borderColor: colors.surface, borderRadius: radius.full, backgroundColor: colors.brand, ...shadow.marker },
  count: { color: colors.onBrand, fontFamily: typography.black, fontSize: 14 },
})
