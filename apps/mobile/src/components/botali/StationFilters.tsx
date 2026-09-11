import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, shadow, spacing, typography, type ThemeColors } from '../../theme/tokens'
import type { MapMode } from '../../types'
import { Chip } from '../ui/Chip'

type CatalogOption = { code: string; name: string }
type Props = {
  fuels: CatalogOption[]
  services: CatalogOption[]
  mode: MapMode
  selectedServices: string[]
  onModeChange: (mode: MapMode) => void
  onToggleService: (code: string) => void
  onClear: () => void
}

export function StationFilters({ fuels, services, mode, selectedServices, onModeChange, onToggleService, onClear }: Props) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const hasFilters = mode !== 'gasolina' || selectedServices.length > 0
  return <View style={styles.panel}>
    <View style={styles.heading}><View><Text style={styles.eyebrow}>FILTROS DO MAPA</Text><Text style={styles.title}>O que você procura?</Text></View>{hasFilters ? <Pressable accessibilityRole="button" onPress={onClear} style={styles.clear}><Text style={styles.clearText}>Limpar filtros</Text></Pressable> : null}</View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
      <Text style={styles.label}>COMBUSTÍVEL EXIBIDO</Text>
      <View style={styles.options}>{fuels.map((item) => <Chip key={item.code} label={item.name} selected={mode === item.code} onPress={() => onModeChange(item.code)} />)}<Chip icon="ev-station" label="Recarga elétrica" selected={mode === 'electric'} onPress={() => onModeChange('electric')} /></View>
      <Text style={styles.label}>SERVIÇOS DO POSTO</Text>
      <Text style={styles.hint}>Você pode selecionar mais de um.</Text>
      <View style={styles.options}>{services.map((item) => <Chip key={item.code} label={item.name} selected={selectedServices.includes(item.code)} onPress={() => onToggleService(item.code)} />)}</View>
    </ScrollView>
  </View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: { maxHeight: 410, marginHorizontal: spacing[4], marginTop: spacing[2], padding: spacing[4], borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.floating },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.brandText, fontFamily: typography.black, fontSize: 9, letterSpacing: .9 },
  title: { color: colors.text, fontFamily: typography.black, fontSize: 18, marginTop: 2 },
  clear: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing[3] },
  clearText: { color: colors.infoText, fontFamily: typography.black, fontSize: 12 },
  scroll: { marginTop: spacing[2] },
  content: { paddingBottom: spacing[2] },
  label: { color: colors.textMuted, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginTop: spacing[3], marginBottom: spacing[2] },
  hint: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: -spacing[1], marginBottom: spacing[2] },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
})
