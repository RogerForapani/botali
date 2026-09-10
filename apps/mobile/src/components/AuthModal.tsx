import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { loadMyRole, type AccountRole } from '../services/moderation'
import { disableSmartVisits, enableSmartVisits, smartVisitsEnabled } from '../services/smartVisits'
import { useTheme } from '../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../theme/tokens'
import type { Station } from '../types'

export function AuthModal({ visible, user, stations, onClose, onOpenModeration, onOpenEditModeration }: { visible: boolean; user: User | null; stations: Station[]; onClose: () => void; onOpenModeration: () => void; onOpenEditModeration: () => void }) {
  const { colors } = useTheme(); const styles = createStyles(colors)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [smartVisits, setSmartVisits] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [roleState, setRoleState] = useState<{ userId: string; role: AccountRole } | null>(null)
  const role = roleState && roleState.userId === user?.id ? roleState.role : 'user'
  useEffect(() => {
    if (visible && user) {
      smartVisitsEnabled().then(setSmartVisits)
      loadMyRole(user.id).then((loadedRole) => setRoleState({ userId: user.id, role: loadedRole })).catch(() => setRoleState(null))
    }
  }, [visible, user])

  async function submit() {
    if (!supabase) return setMessage('Configure o Supabase no arquivo .env.local para entrar.')
    if (!email || password.length < 6) return setMessage('Informe o e-mail e uma senha com pelo menos 6 caracteres.')
    setBusy(true); setMessage('')
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: 'botali://auth/callback', data: { full_name: name.trim() } } })
    setBusy(false)
    if (result.error) return setMessage(result.error.message)
    if (mode === 'signup' && !result.data.session) return setMessage('Confira seu e-mail para confirmar a conta.')
    onClose()
  }

  async function signOut() { await disableSmartVisits(); await supabase?.auth.signOut(); onClose() }
  async function deleteAccount() {
    if (!supabase || deleteText.trim().toUpperCase() !== 'EXCLUIR') return setMessage('Digite EXCLUIR para confirmar.')
    setBusy(true); setMessage('')
    try {
      await disableSmartVisits()
      const { error } = await supabase.rpc('delete_my_account', { confirmation: deleteText.trim() })
      if (error) throw error
      await supabase.auth.signOut({ scope: 'local' })
      setDeleteMode(false); setDeleteText(''); onClose()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível excluir a conta.') }
    finally { setBusy(false) }
  }
  async function toggleSmartVisits() {
    setBusy(true); setMessage('')
    try {
      if (smartVisits) await disableSmartVisits()
      else await enableSmartVisits(stations)
      setSmartVisits(!smartVisits)
      setMessage(smartVisits ? 'Lembretes desativados.' : 'Lembretes inteligentes ativados.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível alterar os lembretes.') }
    finally { setBusy(false) }
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar" style={styles.scrim} onPress={onClose} />
      <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled"><View style={styles.handle} />
        {user ? <><Text style={styles.eyebrow}>MINHA CONTA</Text><View style={styles.accountTitle}><Text style={styles.title}>Olá, {user.user_metadata.full_name || user.email?.split('@')[0]}</Text>{role !== 'user' ? <View style={styles.roleBadge}><Text style={styles.roleText}>{role === 'admin' ? 'ADMIN' : 'MODERADOR'}</Text></View> : null}</View><Text style={styles.description}>{user.email}</Text>{role !== 'user' ? <View style={styles.moderationGroup}><Pressable accessibilityRole="button" style={styles.moderationButton} onPress={() => { onClose(); onOpenModeration() }}><View><Text style={styles.moderationTitle}>Revisar postos pendentes</Text><Text style={styles.moderationCopy}>Aprovar ou rejeitar novos cadastros</Text></View><MaterialCommunityIcons name="chevron-right" size={28} color={colors.onBrand} style={styles.moderationArrow} /></Pressable><Pressable accessibilityRole="button" style={styles.moderationButton} onPress={() => { onClose(); onOpenEditModeration() }}><View><Text style={styles.moderationTitle}>Revisar correções pendentes</Text><Text style={styles.moderationCopy}>Comparar e aplicar alterações sugeridas</Text></View><MaterialCommunityIcons name="chevron-right" size={28} color={colors.onBrand} style={styles.moderationArrow} /></Pressable></View> : null}<View style={styles.preference}><View style={styles.preferenceCopy}><Text style={styles.preferenceTitle}>Lembretes inteligentes</Text><Text style={styles.preferenceText}>Detecta uma permanência no posto e envia no máximo uma sugestão por dia. Desligado por padrão.</Text></View><Pressable disabled={busy} accessibilityRole="switch" accessibilityState={{ checked: smartVisits }} style={[styles.toggle, smartVisits && styles.toggleActive]} onPress={toggleSmartVisits}><View style={[styles.toggleKnob, smartVisits && styles.toggleKnobActive]} /></Pressable></View><Pressable accessibilityRole="link" style={styles.privacyButton} onPress={() => Linking.openURL('https://github.com/RogerForapani/botali/blob/main/docs/PRIVACY_POLICY.md')}><MaterialCommunityIcons name="shield-lock-outline" size={19} color={colors.brandText} /><Text style={styles.privacyText}>Política de privacidade</Text></Pressable>{deleteMode ? <View style={styles.deleteCard}><Text style={styles.deleteTitle}>Excluir conta permanentemente?</Text><Text style={styles.deleteCopy}>Preços e solicitações pessoais serão removidos. Postos publicados podem permanecer de forma anônima. Digite EXCLUIR para continuar.</Text><TextInput autoCapitalize="characters" value={deleteText} onChangeText={setDeleteText} placeholder="EXCLUIR" placeholderTextColor={colors.textMuted} style={styles.deleteInput} /><View style={styles.deleteActions}><Pressable disabled={busy} style={styles.cancelDelete} onPress={() => { setDeleteMode(false); setDeleteText(''); setMessage('') }}><Text style={styles.cancelDeleteText}>Cancelar</Text></Pressable><Pressable disabled={busy || deleteText.trim().toUpperCase() !== 'EXCLUIR'} style={styles.confirmDelete} onPress={deleteAccount}><Text style={styles.confirmDeleteText}>{busy ? 'Excluindo…' : 'Excluir minha conta'}</Text></Pressable></View></View> : <Pressable style={styles.deleteButton} onPress={() => setDeleteMode(true)}><Text style={styles.deleteButtonText}>Excluir minha conta</Text></Pressable>}{message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}<Pressable style={styles.outlineButton} onPress={signOut}><Text style={styles.outlineText}>Sair da conta</Text></Pressable></> : <>
          <Text style={styles.eyebrow}>COMUNIDADE BOTALI</Text><Text style={styles.title}>{mode === 'signin' ? 'Entre para contribuir' : 'Crie sua conta'}</Text><Text style={styles.description}>Consultar preços é livre. Sua conta só é necessária para enviar ou confirmar informações.</Text>
          {mode === 'signup' ? <TextInput accessibilityLabel="Nome" style={styles.input} placeholder="Seu nome" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} /> : null}
          <TextInput accessibilityLabel="E-mail" style={styles.input} placeholder="seu@email.com" placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput accessibilityLabel="Senha" style={styles.input} placeholder="Sua senha" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <Pressable disabled={busy} style={styles.primaryButton} onPress={submit}><Text style={styles.primaryText}>{busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}</Text></Pressable>
          <Pressable style={styles.switchButton} onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}><Text style={styles.switchText}>{mode === 'signin' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</Text></Pressable>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, backgroundColor: colors.scrim }, card: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.graphite }, cardContent: { padding: spacing[5], paddingBottom: spacing[8] }, handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: radius.full, backgroundColor: colors.border, marginBottom: spacing[5] }, eyebrow: { color: colors.brandText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, accountTitle: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] }, title: { color: colors.offWhite, fontSize: typography.h2, fontWeight: '900', marginTop: spacing[2] }, roleBadge: { marginTop: spacing[2], paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radius.full, backgroundColor: colors.brand }, roleText: { color: colors.onBrand, fontSize: 9, fontWeight: '900', letterSpacing: .6 }, description: { color: colors.textMuted, fontSize: typography.small, lineHeight: 20, marginTop: spacing[2], marginBottom: spacing[4] }, moderationGroup: { gap: spacing[2], marginBottom: spacing[3] }, moderationButton: { minHeight: 68, padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center' }, moderationTitle: { color: colors.onBrand, fontWeight: '900' }, moderationCopy: { color: colors.onBrand, opacity: .8, fontSize: 11, marginTop: 2 }, moderationArrow: { marginLeft: 'auto' }, input: { minHeight: 50, marginBottom: spacing[3], paddingHorizontal: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, color: colors.offWhite, fontSize: typography.body }, message: { marginBottom: spacing[3], color: colors.warningText, fontSize: typography.small }, primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontWeight: '900' }, switchButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] }, switchText: { color: colors.brandText, fontWeight: '800' }, outlineButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, outlineText: { color: colors.offWhite, fontWeight: '800' }, preference: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4], padding: spacing[4], borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, preferenceCopy: { flex: 1 }, preferenceTitle: { color: colors.offWhite, fontWeight: '800' }, preferenceText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }, toggle: { width: 48, height: 28, padding: 3, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.border }, toggleActive: { backgroundColor: colors.brand }, toggleKnob: { width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.offWhite }, toggleKnobActive: { alignSelf: 'flex-end', backgroundColor: colors.graphite },
  privacyButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[2] }, privacyText: { color: colors.brandText, fontFamily: typography.bold, fontSize: 13 }, deleteButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] }, deleteButtonText: { color: colors.dangerText, fontFamily: typography.bold, fontSize: 13 }, deleteCard: { marginBottom: spacing[3], padding: spacing[4], borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }, deleteTitle: { color: colors.offWhite, fontFamily: typography.black, fontSize: 16 }, deleteCopy: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 12, lineHeight: 18, marginTop: spacing[1] }, deleteInput: { minHeight: 48, marginTop: spacing[3], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, color: colors.offWhite, fontFamily: typography.black }, deleteActions: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }, cancelDelete: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }, cancelDeleteText: { color: colors.offWhite, fontFamily: typography.bold }, confirmDelete: { flex: 1.5, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.danger }, confirmDeleteText: { color: '#FFFFFF', fontFamily: typography.black, fontSize: 12 },
})
