import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { finishAuthRedirect } from '../services/auth'
import { recordAppFailure } from '../services/diagnostics'
import { userMessageForError } from '../utils/appError'

export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    let active = true
    let receivedAuthEvent = false
    const reportAuthError = (authError: unknown) => {
      recordAppFailure('auth.session', authError).catch(() => undefined)
      if (active) setError(userMessageForError(authError, 'Não foi possível recuperar sua sessão. Você ainda pode continuar sem conta.'))
    }
    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError
        if (active && !receivedAuthEvent) setUser(data.session?.user ?? null)
      })
      .catch(reportAuthError)
      .finally(() => { if (active) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      receivedAuthEvent = true
      setUser(session?.user ?? null)
      setError('')
      setLoading(false)
    })
    const handleRedirect = (url: string) => finishAuthRedirect(url).catch(reportAuthError)
    Linking.getInitialURL().then((url) => { if (url) handleRedirect(url) }).catch(reportAuthError)
    const linking = Linking.addEventListener('url', ({ url }) => { handleRedirect(url) })
    return () => { active = false; data.subscription.unsubscribe(); linking.remove() }
  }, [])

  return { user, loading, error }
}
