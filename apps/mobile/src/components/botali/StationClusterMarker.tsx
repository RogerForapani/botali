import { Marker } from 'react-native-maps'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, typography, type ThemeColors } from '../../theme/tokens'
import type { StationClusterItem } from '../../utils/mapClustering'

export function StationClusterMarker({ cluster, featured, onPress }: { cluster: StationClusterItem; featured: boolean; onPress: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <Marker coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }} onPress={onPress} tracksViewChanges={false} accessibilityLabel={`${featured ? 'Grupo com o posto de menor preço. ' : ''}Grupo com ${cluster.stations.length} postos`}>
    <View style={[styles.cluster, featured && styles.featured]}><MaterialCommunityIcons name={featured ? 'star' : 'gas-station'} size={17} color={featured ? colors.onBrand : colors.text} /><Text style={[styles.count, featured && styles.featuredCount]}>{cluster.stations.length}</Text></View>
  </Marker>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cluster: { minWidth: 48, height: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 3, borderColor: colors.border, borderRadius: radius.full, backgroundColor: colors.surface, ...shadow.marker },
  featured: { borderColor: colors.surface, backgroundColor: colors.brand },
  count: { color: colors.text, fontFamily: typography.black, fontSize: 14 },
  featuredCount: { color: colors.onBrand },
})
