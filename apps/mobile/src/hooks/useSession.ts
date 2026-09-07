import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'

async function finishAuth(url: string) {
  if (!supabase || !url.startsWith('botali://auth/callback')) return
  const parsed = new URL(url)
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const code = parsed.searchParams.get('code')
  const accessToken = fragment.get('access_token') ?? parsed.searchParams.get('access_token')
  const refreshToken = fragment.get('refresh_token') ?? parsed.searchParams.get('refresh_token')
  if (code) await supabase.auth.exchangeCodeForSession(code)
  else if (accessToken && refreshToken) await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    Linking.getInitialURL().then((url) => { if (url) finishAuth(url) })
    const linking = Linking.addEventListener('url', ({ url }) => { finishAuth(url) })
    return () => { data.subscription.unsubscribe(); linking.remove() }
  }, [])

  return { user, loading }
}
