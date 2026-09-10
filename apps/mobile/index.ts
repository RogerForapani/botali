import { registerRootComponent } from 'expo'
import { createElement, useEffect } from 'react'
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter'
import * as SplashScreen from 'expo-splash-screen'

import App from './App'
import { ThemeProvider } from './src/theme/ThemeProvider'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

function Root() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_900Black })
  useEffect(() => { if (fontsLoaded || fontError) SplashScreen.hideAsync() }, [fontsLoaded, fontError])
  if (!fontsLoaded && !fontError) return null
  return createElement(ThemeProvider, null, createElement(App))
}

registerRootComponent(Root)
