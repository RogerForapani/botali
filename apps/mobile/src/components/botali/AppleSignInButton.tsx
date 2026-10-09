import * as AppleAuthentication from 'expo-apple-authentication'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider'

export function AppleSignInButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const { mode } = useTheme()
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    let active = true
    AppleAuthentication.isAvailableAsync().then((value) => { if (active) setAvailable(value) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  if (!available) return null
  return <AppleAuthentication.AppleAuthenticationButton
    accessibilityLabel="Continuar com Apple"
    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
    buttonStyle={mode === 'light' ? AppleAuthentication.AppleAuthenticationButtonStyle.BLACK : AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
    cornerRadius={12}
    style={{ width: '100%', height: 52, marginTop: 12, opacity: busy ? 0.5 : 1 }}
    onPress={() => { if (!busy) onPress() }}
  />
}
