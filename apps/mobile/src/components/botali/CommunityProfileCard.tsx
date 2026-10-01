import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { loadMyCommunityProfile, updateMyCommunityProfile, type CommunityProfile } from '../../services/communityProfile'
import { recordAppFailure } from '../../services/diagnostics'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { userMessageForError } from '../../utils/appError'

export function CommunityProfileCard({ user }: { user: User }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [profile, setProfile] = useState<CommunityProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    loadMyCommunityProfile()
      .then((value) => {
        if (!active) return
        setProfile(value); setDisplayName(value.displayName); setAvatarUrl(value.avatarUrl ?? ''); setIsPublic(value.isPublic); setMessage('')
      })
      .catch((error) => {
        recordAppFailure('profile.load', error).catch(() => undefined)
        if (active) setMessage(userMessageForError(error, 'Não foi possível carregar seu perfil comunitário.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id])

  async function save() {
    if (displayName.trim().length < 2 || displayName.trim().length > 40) return setMessage('O nome público deve ter entre 2 e 40 caracteres.')
    if (avatarUrl.trim() && !avatarUrl.trim().startsWith('https://')) return setMessage('Use um endereço de imagem que comece com https://.')
    setSaving(true); setMessage('')
    try {
      await updateMyCommunityProfile({ displayName, avatarUrl: avatarUrl || null, isPublic })
      const updated = await loadMyCommunityProfile()
      setProfile(updated); setDisplayName(updated.displayName); setAvatarUrl(updated.avatarUrl ?? ''); setIsPublic(updated.isPublic); setEditing(false); setMessage('Perfil atualizado.')
    } catch (error) {
      recordAppFailure('profile.update', error).catch(() => undefined)
      setMessage(userMessageForError(error, 'Não foi possível atualizar seu perfil.'))
    } finally { setSaving(false) }
  }

  if (loading) return <View style={styles.loading}><Text style={styles.muted}>Carregando perfil comunitário…</Text></View>
  if (!profile) return <View style={styles.loading}><Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text></View>

  const fallbackName = profile.displayName || user.user_metadata.full_name || user.email?.split('@')[0] || 'Motorista botali'
  const initial = fallbackName.trim().charAt(0).toUpperCase() || 'B'

  return <View style={styles.card}>
    <View style={styles.identity}>
      {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>}
      <View style={styles.identityCopy}><Text style={styles.name}>{profile.displayName}</Text><Text style={styles.visibility}>{profile.isPublic ? 'Perfil visível para a comunidade' : 'Perfil privado'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil comunitário" style={styles.editButton} onPress={() => { setEditing((value) => !value); setMessage('') }}><MaterialCommunityIcons name={editing ? 'close' : 'pencil-outline'} size={19} color={colors.brandText} /></Pressable>
    </View>
    <View style={styles.stats}>
      <Stat value={profile.validatedPriceReports} label="Preços validados" styles={styles} />
      <Stat value={profile.priceConfirmations} label="Confirmações" styles={styles} />
      <Stat value={profile.verifiedStations + profile.approvedEdits} label="Cadastros aprovados" styles={styles} />
    </View>
    <Text style={styles.sentSummary}>{profile.priceReports} {profile.priceReports === 1 ? 'preço enviado' : 'preços enviados'} no total</Text>
    {editing ? <View style={styles.form}>
      <Text style={styles.label}>NOME PÚBLICO</Text>
      <TextInput accessibilityLabel="Nome público" maxLength={40} value={displayName} onChangeText={setDisplayName} placeholder="Como quer aparecer" placeholderTextColor={colors.textMuted} style={styles.input} />
      <Text style={styles.label}>FOTO DO PERFIL (OPCIONAL)</Text>
      <TextInput accessibilityLabel="Endereço da foto do perfil" autoCapitalize="none" keyboardType="url" value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://..." placeholderTextColor={colors.textMuted} style={styles.input} />
      <View style={styles.visibilityControl}><View style={styles.visibilityCopy}><Text style={styles.preferenceTitle}>Perfil público</Text><Text style={styles.preferenceText}>Mostra somente seu nome, foto e números agregados. E-mail, locais e histórico detalhado continuam privados.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: isPublic }} style={[styles.toggle, isPublic && styles.toggleActive]} onPress={() => setIsPublic((value) => !value)}><View style={[styles.toggleKnob, isPublic && styles.toggleKnobActive]} /></Pressable></View>
      <Pressable disabled={saving} accessibilityRole="button" style={styles.saveButton} onPress={save}><Text style={styles.saveText}>{saving ? 'Salvando…' : 'Salvar perfil'}</Text></Pressable>
    </View> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={message === 'Perfil atualizado.' ? styles.success : styles.error}>{message}</Text> : null}
  </View>
}

function Stat({ value, label, styles }: { value: number; label: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { marginBottom: spacing[4], padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  loading: { minHeight: 72, marginBottom: spacing[4], padding: spacing[4], justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, avatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.border }, avatarFallback: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.brand }, avatarInitial: { color: colors.onBrand, fontFamily: typography.black, fontSize: typography.h3 }, identityCopy: { flex: 1 }, name: { color: colors.offWhite, fontFamily: typography.black, fontSize: 18 }, visibility: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: 2 }, editButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
  stats: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }, stat: { flex: 1, minHeight: 72, padding: spacing[2], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.graphite }, statValue: { color: colors.brandText, fontFamily: typography.black, fontSize: typography.h3 }, statLabel: { color: colors.textMuted, fontFamily: typography.semibold, fontSize: 9, lineHeight: 12, textAlign: 'center', marginTop: 2 }, sentSummary: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, textAlign: 'center', marginTop: spacing[2] },
  form: { marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border }, label: { color: colors.brandText, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginBottom: spacing[2] }, input: { minHeight: 48, marginBottom: spacing[3], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.graphite, color: colors.offWhite, fontFamily: typography.regular },
  visibilityControl: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }, visibilityCopy: { flex: 1 }, preferenceTitle: { color: colors.offWhite, fontFamily: typography.bold, fontSize: typography.small }, preferenceText: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, lineHeight: 16, marginTop: 2 }, toggle: { width: 48, height: 28, padding: 3, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.border }, toggleActive: { backgroundColor: colors.brand }, toggleKnob: { width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.offWhite }, toggleKnobActive: { alignSelf: 'flex-end', backgroundColor: colors.graphite },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, saveText: { color: colors.onBrand, fontFamily: typography.black }, muted: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.small }, success: { color: colors.brandText, fontFamily: typography.semibold, fontSize: typography.caption, marginTop: spacing[3] }, error: { color: colors.dangerText, fontFamily: typography.semibold, fontSize: typography.caption, marginTop: spacing[3] },
})
