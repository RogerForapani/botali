export const baseColors = { brand: '#22C55E', graphite: '#111827', offWhite: '#F8FAFC', amber: '#FBBF24', info: '#3B82F6', danger: '#EF4444' } as const
export const lightColors = { ...baseColors, graphite: '#FFFFFF', offWhite: '#111827', background: '#F8FAFC', surface: '#FFFFFF', surfaceAlt: '#F1F5F9', border: '#CBD5E1', text: '#111827', textMuted: '#475569', brandText: '#15803D', infoText: '#1D4ED8', warningText: '#92400E', dangerText: '#B91C1C', onBrand: '#111827', scrim: '#11182766' } as const
export const darkColors = { ...baseColors, background: '#111827', surface: '#202020', surfaceAlt: '#2A2A2A', border: '#404040', text: '#F8FAFC', textMuted: '#A3A3A3', brandText: '#4ADE80', infoText: '#60A5FA', warningText: '#FBBF24', dangerText: '#F87171', onBrand: '#111827', scrim: '#00000099' } as const
export const colors = lightColors
export type ThemeColors = { [K in keyof typeof lightColors]: string }
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const
export const typography = { caption: 12, small: 14, body: 16, h3: 20, h2: 24, h1: 28 } as const
export const shadow = {
  floating: { elevation: 7, shadowColor: '#000', shadowOpacity: .18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  marker: { elevation: 5, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  sheet: { elevation: 14, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
} as const
