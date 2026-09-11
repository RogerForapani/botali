import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { authRedirectUrl, signInWithGoogle } from '../services/auth'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'

export function AuthScreen({ onContinueAsGuest }: { onContinueAsGuest: () => void }) {
  const { colors, mode: themeMode } = useTheme()
  const styles = createStyles(colors)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!supabase) return setMessage('Não foi possível conectar ao serviço de login.')
    if (!email.trim() || password.length < 6) return setMessage('Informe o e-mail e uma senha com pelo menos 6 caracteres.')
    setBusy(true); setMessage('')
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authRedirectUrl, data: { full_name: name.trim() } } })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) setMessage('Confira seu e-mail para confirmar a conta.')
  }

  async function continueWithGoogle() {
    setBusy(true); setMessage('')
    try {
      const result = await signInWithGoogle()
      if (result === 'cancel' || result === 'dismiss') setMessage('Login cancelado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar com o Google.')
    } finally {
      setBusy(false)
    }
  }

  return <SafeAreaView style={styles.screen}>
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Image source={themeMode === 'light' ? require('../../assets/icon-light.png') : require('../../assets/icon-dark.png')} style={styles.logo} />
          <Text style={styles.name}>botali</Text>
          <Text style={styles.tagline}>O melhor posto tá ali.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'signin' ? 'Boas-vindas' : 'Crie sua conta'}</Text>
          <Text style={styles.description}>{mode === 'signin' ? 'Entre para contribuir com preços e postos.' : 'Faça parte da comunidade que mantém os preços atualizados.'}</Text>

          <Pressable disabled={busy} accessibilityRole="button" style={styles.googleButton} onPress={continueWithGoogle}>
            <MaterialCommunityIcons name="google" size={21} color={colors.text} />
            <Text style={styles.googleText}>Continuar com Google</Text>
          </Pressable>

          <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>ou</Text><View style={styles.dividerLine} /></View>

          {mode === 'signup' ? <TextInput accessibilityLabel="Nome" style={styles.input} placeholder="Seu nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} /> : null}
          <TextInput accessibilityLabel="E-mail" style={styles.input} placeholder="seu@email.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput accessibilityLabel="Senha" style={styles.input} placeholder="Sua senha" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <Pressable disabled={busy} style={styles.primaryButton} onPress={submit}><Text style={styles.primaryText}>{busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}</Text></Pressable>
          <Pressable disabled={busy} style={styles.switchButton} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}><Text style={styles.switchText}>{mode === 'signin' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</Text></Pressable>
        </View>

        <Pressable disabled={busy} accessibilityRole="button" style={styles.guestButton} onPress={onContinueAsGuest}>
          <Text style={styles.guestText}>Continuar sem conta</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.brandText} />
        </Pressable>
        <Text style={styles.guestHint}>Você pode consultar postos e preços sem fazer login.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, keyboard: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: spacing[5], paddingVertical: spacing[8] },
  brand: { alignItems: 'center', marginBottom: spacing[6] }, logo: { width: 76, height: 76, borderRadius: radius.xl }, name: { marginTop: spacing[3], color: colors.text, fontFamily: typography.black, fontSize: 30 }, tagline: { marginTop: spacing[1], color: colors.textMuted, fontFamily: typography.semibold, fontSize: typography.small },
  card: { padding: spacing[5], borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, backgroundColor: colors.surface }, title: { color: colors.text, fontFamily: typography.black, fontSize: typography.h2 }, description: { marginTop: spacing[1], marginBottom: spacing[5], color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.small, lineHeight: 20 },
  googleButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, googleText: { color: colors.text, fontFamily: typography.bold, fontSize: typography.small },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: spacing[4] }, dividerLine: { flex: 1, height: 1, backgroundColor: colors.border }, dividerText: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.caption },
  input: { minHeight: 50, marginBottom: spacing[3], paddingHorizontal: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: typography.regular, fontSize: typography.body }, message: { marginBottom: spacing[3], color: colors.warningText, fontFamily: typography.semibold, fontSize: typography.small },
  primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontFamily: typography.black }, switchButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] }, switchText: { color: colors.brandText, fontFamily: typography.bold },
  guestButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing[4] }, guestText: { color: colors.brandText, fontFamily: typography.bold }, guestHint: { color: colors.textMuted, textAlign: 'center', fontFamily: typography.regular, fontSize: typography.caption },
})
