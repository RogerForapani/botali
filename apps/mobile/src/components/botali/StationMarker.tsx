import { StyleSheet, Text, View } from 'react-native'
import { Marker } from 'react-native-maps'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, type ThemeColors } from '../../theme/tokens'
import type { MapMode, Station } from '../../types'

type Props = { station: Station; mode: MapMode; selected: boolean; featured: boolean; onPress: () => void }

export function StationMarker({ station, mode, selected, featured, onPress }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const price = mode === 'electric' ? null : station.prices[mode]
  const ratio = station.prices.gasolina && station.prices.etanol
    ? Math.round(station.prices.etanol.value / station.prices.gasolina.value * 100)
    : null

  return <Marker coordinate={{ latitude: station.latitude, longitude: station.longitude }} onPress={onPress} tracksViewChanges={false}>
    <View style={[styles.marker, featured && styles.featured, selected && styles.selected, mode === 'electric' && styles.electric]}>
      <Text style={[styles.price, (featured || mode === 'electric') && styles.coloredMarkerText]}>{mode === 'electric' ? '⚡ Recarga' : price ? `R$ ${price.value.toFixed(2).replace('.', ',')}` : 'Sem preço'}</Text>
      {ratio && mode !== 'electric' ? <Text style={[styles.ratio, ratio <= 70 && styles.goodRatio, featured && styles.featuredRatio]}>Etanol {ratio}%</Text> : null}
    </View>
  </Marker>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  marker: { minWidth: 86, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 3, borderColor: colors.offWhite, borderRadius: radius.md, backgroundColor: colors.graphite, alignItems: 'center', ...shadow.marker },
  featured: { backgroundColor: colors.brand },
  selected: { borderColor: colors.amber, transform: [{ scale: 1.08 }] },
  electric: { backgroundColor: colors.info },
  price: { color: colors.offWhite, fontWeight: '900', fontSize: 13 },
  coloredMarkerText: { color: colors.onBrand },
  ratio: { color: colors.textMuted, fontWeight: '700', fontSize: 9, marginTop: 2 },
  goodRatio: { color: colors.brandText },
  featuredRatio: { color: colors.onBrand },
})
