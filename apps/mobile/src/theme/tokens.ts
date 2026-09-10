export const baseColors = { brand: '#22C55E', graphite: '#171717', offWhite: '#FAFAF7', amber: '#FBBF24', info: '#3B82F6', danger: '#EF4444' } as const
export const lightColors = { ...baseColors, graphite: '#FFFFFF', offWhite: '#171717', background: '#F7F7F5', surface: '#FFFFFF', surfaceAlt: '#EFEFEB', border: '#D6D6D0', text: '#171717', textMuted: '#5F5F5B', brandText: '#147A36', infoText: '#1D4ED8', warningText: '#7A4B08', dangerText: '#B42318', onBrand: '#102116', scrim: '#17171766' } as const
export const darkColors = { ...baseColors, background: '#111111', surface: '#1C1C1C', surfaceAlt: '#282826', border: '#42423E', text: '#FAFAF7', textMuted: '#B0B0AA', brandText: '#4ADE80', infoText: '#60A5FA', warningText: '#FBBF24', dangerText: '#FF8A80', onBrand: '#102116', scrim: '#00000099' } as const
export const colors = lightColors
export type ThemeColors = { [K in keyof typeof lightColors]: string }
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const
export const typography = { caption: 12, small: 14, body: 16, h3: 20, h2: 24, h1: 28, regular: 'Inter_400Regular', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold', black: 'Inter_900Black' } as const
export const shadow = {
  floating: { elevation: 7, shadowColor: '#000', shadowOpacity: .18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  marker: { elevation: 5, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  sheet: { elevation: 14, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
} as const
