export const colors = { brand: '#22C55E', graphite: '#111827', offWhite: '#F8FAFC', amber: '#FBBF24', info: '#3B82F6', danger: '#EF4444', surface: '#1F2937', border: '#334155', textMuted: '#94A3B8' } as const
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const
export const typography = { caption: 12, small: 14, body: 16, h3: 20, h2: 24, h1: 28 } as const
export const shadow = {
  floating: { elevation: 7, shadowColor: '#000', shadowOpacity: .18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  marker: { elevation: 5, shadowColor: '#000', shadowOpacity: .2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  sheet: { elevation: 14, shadowColor: '#000', shadowOpacity: .3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
} as const
