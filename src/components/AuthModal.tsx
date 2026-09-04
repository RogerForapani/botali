import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) return setMessage('Confira seu e-mail para confirmar a conta.')
    onClose()
  }

  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-scrim" onClick={onClose} aria-label="Fechar" /><div className="modal-card"><button className="close" onClick={onClose}>×</button><span className="eyebrow">CONTRIBUA COM A COMUNIDADE</span><h2 id="auth-title">{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2><p>Você pode explorar livremente. O acesso é solicitado apenas para enviar informações.</p><form onSubmit={submit}>{mode === 'signup' && <label>Como devemos chamar você?<input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>}<label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required /></label>{message && <div className="form-message">{message}</div>}<button className="primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button></form><button className="switch-mode" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'}</button></div></div>
}
