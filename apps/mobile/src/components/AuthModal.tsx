import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { colors, radius, spacing, typography } from '../theme/tokens'

export function AuthModal({ visible, user, onClose }: { visible: boolean; user: User | null; onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!supabase) return setMessage('Configure o Supabase no arquivo .env.local para entrar.')
    if (!email || password.length < 6) return setMessage('Informe o e-mail e uma senha com pelo menos 6 caracteres.')
    setBusy(true); setMessage('')
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) return setMessage('Confira seu e-mail para confirmar a conta.')
    onClose()
  }

  async function signOut() { await supabase?.auth.signOut(); onClose() }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
      <View style={styles.card}><View style={styles.handle} />
        {user ? <><Text style={styles.eyebrow}>MINHA CONTA</Text><Text style={styles.title}>Olá, {user.user_metadata.full_name || user.email?.split('@')[0]}</Text><Text style={styles.description}>{user.email}</Text><Pressable style={styles.outlineButton} onPress={signOut}><Text style={styles.outlineText}>Sair da conta</Text></Pressable></> : <>
          <Text style={styles.eyebrow}>COMUNIDADE BOTALI</Text><Text style={styles.title}>{mode === 'signin' ? 'Entre para contribuir' : 'Crie sua conta'}</Text><Text style={styles.description}>Consultar preços é livre. Sua conta só é necessária para enviar ou confirmar informações.</Text>
          {mode === 'signup' ? <TextInput accessibilityLabel="Nome" style={styles.input} placeholder="Seu nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} /> : null}
          <TextInput accessibilityLabel="E-mail" style={styles.input} placeholder="seu@email.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput accessibilityLabel="Senha" style={styles.input} placeholder="Sua senha" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <Pressable disabled={busy} style={styles.primaryButton} onPress={submit}><Text style={styles.primaryText}>{busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}</Text></Pressable>
          <Pressable style={styles.switchButton} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}><Text style={styles.switchText}>{mode === 'signin' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</Text></Pressable>
        </>}
      </View>
    </KeyboardAvoidingView>
  </Modal>
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: '#02061799' }, card: { padding: spacing[5], paddingBottom: spacing[8], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[5] }, eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[2] }, description: { color: colors.textMuted, fontSize: typography.small, lineHeight: 20, marginTop: spacing[2], marginBottom: spacing[4] }, input: { minHeight: 50, marginBottom: spacing[3], paddingHorizontal: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.offWhite, fontSize: typography.body }, message: { marginBottom: spacing[3], color: colors.amber, fontSize: typography.small }, primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.graphite, fontWeight: '900' }, switchButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] }, switchText: { color: colors.brand, fontWeight: '800' }, outlineButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, outlineText: { color: colors.offWhite, fontWeight: '800' },
})
