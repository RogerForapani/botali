import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { darkColors, lightColors, type ThemeColors } from './tokens'

export type ThemeMode = 'light' | 'dark'
const STORAGE_KEY = 'botali.theme'
const ThemeContext = createContext<{ mode: ThemeMode; colors: ThemeColors; toggle: () => void }>({ mode: 'light', colors: lightColors, toggle: () => undefined })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')
  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((saved) => { if (saved === 'dark') setMode('dark') }) }, [])
  const value = useMemo(() => ({ mode, colors: mode === 'light' ? lightColors : darkColors, toggle: () => setMode((current) => { const next = current === 'light' ? 'dark' : 'light'; AsyncStorage.setItem(STORAGE_KEY, next); return next }) }), [mode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
