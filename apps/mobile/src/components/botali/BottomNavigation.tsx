import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing } from '../../theme/tokens'

export type AppTab = 'explore' | 'favorites' | 'contribute' | 'activity' | 'profile'
const tabs: { value: AppTab; icon: string; label: string }[] = [{ value: 'explore', icon: '⌖', label: 'Explorar' }, { value: 'favorites', icon: '♡', label: 'Favoritos' }, { value: 'contribute', icon: '+', label: 'Contribuir' }, { value: 'activity', icon: '◷', label: 'Atividade' }, { value: 'profile', icon: '○', label: 'Perfil' }]

export function BottomNavigation({ value, onChange }: { value: AppTab; onChange: (tab: AppTab) => void }) {
  const insets = useSafeAreaInsets()
  return <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>{tabs.map((tab) => <Pressable key={tab.value} accessibilityRole="tab" accessibilityState={{ selected: value === tab.value }} style={[styles.item, tab.value === 'contribute' && styles.contribute]} onPress={() => onChange(tab.value)}><Text style={[styles.icon, value === tab.value && styles.active]}>{tab.icon}</Text><Text style={[styles.label, value === tab.value && styles.active]}>{tab.label}</Text></Pressable>)}</View>
}
const styles = StyleSheet.create({ root: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 66, paddingTop: spacing[2], flexDirection: 'row', backgroundColor: colors.graphite, borderTopWidth: 1, borderTopColor: colors.border }, item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, contribute: { marginTop: -21 }, icon: { color: colors.textMuted, fontSize: 22, fontWeight: '800' }, label: { color: colors.textMuted, fontSize: 9, marginTop: 2 }, active: { color: colors.brand } })
