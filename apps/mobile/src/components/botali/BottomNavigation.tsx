import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider'
import { spacing, typography, type ThemeColors } from '../../theme/tokens'

export type AppTab = 'explore' | 'favorites' | 'contribute' | 'activity' | 'profile'
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']
const tabs: { value: AppTab; icon: IconName; label: string }[] = [{ value: 'explore', icon: 'map-marker-radius-outline', label: 'Explorar' }, { value: 'favorites', icon: 'heart-outline', label: 'Favoritos' }, { value: 'contribute', icon: 'pencil-plus-outline', label: 'Contribuir' }, { value: 'activity', icon: 'history', label: 'Atividade' }, { value: 'profile', icon: 'account-circle-outline', label: 'Perfil' }]

export function BottomNavigation({ value, onChange, notificationCount = 0 }: { value: AppTab; onChange: (tab: AppTab) => void; notificationCount?: number }) {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme(); const styles = createStyles(colors)
  return <View accessibilityRole="tablist" style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>{tabs.map((tab) => { const active = value === tab.value; return <Pressable key={tab.value} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} style={[styles.item, tab.value === 'contribute' && styles.contribute, active && styles.itemActive]} onPress={() => onChange(tab.value)}><View><MaterialCommunityIcons name={tab.icon} size={tab.value === 'contribute' ? 29 : 23} color={active || tab.value === 'contribute' ? colors.brandText : colors.textMuted} />{tab.value === 'activity' && notificationCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(notificationCount, 9)}</Text></View> : null}</View>{tab.value !== 'contribute' ? <Text style={[styles.label, active && styles.active]}>{tab.label}</Text> : null}</Pressable> })}</View>
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ root: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 66, paddingTop: spacing[2], flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, item: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, itemActive: { backgroundColor: colors.surfaceAlt, borderRadius: 14, marginHorizontal: 3 }, contribute: { marginTop: -21, alignSelf: 'flex-start', maxWidth: 64, minHeight: 52, borderWidth: 4, borderColor: colors.surface, borderRadius: 26, backgroundColor: colors.brand }, badge: { position: 'absolute', right: -9, top: -7, minWidth: 17, height: 17, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.danger }, badgeText: { color: '#FFFFFF', fontFamily: typography.black, fontSize: 9 }, label: { color: colors.textMuted, fontFamily: typography.semibold, fontSize: 9, marginTop: 2 }, active: { color: colors.brandText } })
