import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { finishAuthRedirect } from '../services/auth'

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).finally(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setLoading(false) })
    Linking.getInitialURL().then((url) => { if (url) finishAuthRedirect(url).catch(() => undefined) })
    const linking = Linking.addEventListener('url', ({ url }) => { finishAuthRedirect(url).catch(() => undefined) })
    return () => { data.subscription.unsubscribe(); linking.remove() }
  }, [])

  return { user, loading }
}
