import { registerRootComponent } from 'expo'
import { createElement, useEffect } from 'react'
import { useFonts } from '@expo-google-fonts/inter/useFonts'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { Inter_900Black } from '@expo-google-fonts/inter/900Black'
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
