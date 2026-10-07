import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import type { User } from '@supabase/supabase-js'
import { Image, Pressable, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native'
import { loadMyCommunityProfile, removeMyAvatar, updateMyCommunityProfile, uploadMyAvatar, type CommunityProfile } from '../../services/communityProfile'
import { recordAppFailure } from '../../services/diagnostics'
import type { AccountRole } from '../../services/moderation'
import { useTheme } from '../../theme/ThemeProvider'
import { radius, spacing, typography, type ThemeColors } from '../../theme/tokens'
import { userMessageForError } from '../../utils/appError'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const badgeIconNames: Record<string, IconName> = {
  'first-validated-price': 'check-decagram',
  'community-checker': 'account-check',
  'station-scout': 'map-marker-plus',
  'trusted-editor': 'map-check',
  'beta-pioneer': 'rocket-launch',
}

const levelFrames: Record<number, ImageSourcePropType> = {
  1: require('../../../assets/community/frame-explorador.png'),
  2: require('../../../assets/community/frame-colaborador.png'),
  3: require('../../../assets/community/frame-parceiro-da-estrada.png'),
  4: require('../../../assets/community/frame-referencia-local.png'),
  5: require('../../../assets/community/frame-guardiao-botali.png'),
}

const badgeArtwork: Record<string, ImageSourcePropType> = {
  'beta-pioneer': require('../../../assets/community/badge-beta-pioneer.png'),
  'first-validated-price': require('../../../assets/community/badge-first-validated-price.png'),
  'community-checker': require('../../../assets/community/badge-community-checker.png'),
  'station-scout': require('../../../assets/community/badge-station-scout.png'),
  'trusted-editor': require('../../../assets/community/badge-trusted-editor.png'),
}

export function CommunityProfileCard({ user, role }: { user: User; role: AccountRole }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [profile, setProfile] = useState<CommunityProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null)
  const [pendingAvatarBase64, setPendingAvatarBase64] = useState<string | null>(null)
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
        setProfile(value); setDisplayName(value.displayName); setAvatarPath(value.avatarPath); setAvatarPreviewUri(null); setPendingAvatarBase64(null); setIsPublic(value.isPublic); setMessage('')
      })
      .catch((error) => {
        recordAppFailure('profile.load', error).catch(() => undefined)
        if (active) setMessage(userMessageForError(error, 'Não foi possível carregar seu perfil comunitário.'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.id])

  async function save() {
    if (!profile) return
    if (displayName.trim().length < 2 || displayName.trim().length > 40) return setMessage('O nome público deve ter entre 2 e 40 caracteres.')
    setSaving(true); setMessage('')
    try {
      const nextAvatarPath = pendingAvatarBase64 ? await uploadMyAvatar(user.id, pendingAvatarBase64) : avatarPath
      await updateMyCommunityProfile({ displayName, avatarPath: nextAvatarPath, isPublic })
      if (!nextAvatarPath && profile.avatarPath) await removeMyAvatar(profile.avatarPath)
      const updated = await loadMyCommunityProfile()
      setProfile(updated); setDisplayName(updated.displayName); setAvatarPath(updated.avatarPath); setAvatarPreviewUri(null); setPendingAvatarBase64(null); setIsPublic(updated.isPublic); setEditing(false); setMessage('Perfil atualizado.')
    } catch (error) {
      recordAppFailure('profile.update', error).catch(() => undefined)
      setMessage(userMessageForError(error, 'Não foi possível atualizar seu perfil.'))
    } finally { setSaving(false) }
  }

  async function choosePhoto() {
    setMessage('')
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .85 })
      if (result.canceled) return
      const context = ImageManipulator.ImageManipulator.manipulate(result.assets[0].uri)
      context.resize({ width: 512, height: 512 })
      const rendered = await context.renderAsync()
      const prepared = await rendered.saveAsync({ base64: true, compress: .78, format: ImageManipulator.SaveFormat.JPEG })
      if (!prepared.base64) throw new Error('Não foi possível preparar a imagem selecionada.')
      if (prepared.base64.length * .75 > 2 * 1024 * 1024) throw new Error('A foto ficou muito grande. Escolha outra imagem.')
      setAvatarPreviewUri(prepared.uri)
      setPendingAvatarBase64(prepared.base64)
    } catch (error) {
      recordAppFailure('profile.avatar.pick', error).catch(() => undefined)
      setMessage(userMessageForError(error, 'Não foi possível abrir esta foto.'))
    }
  }

  function toggleEditing() {
    if (!editing) { setEditing(true); setMessage(''); return }
    if (profile) {
      setDisplayName(profile.displayName); setAvatarPath(profile.avatarPath); setAvatarPreviewUri(null); setPendingAvatarBase64(null); setIsPublic(profile.isPublic)
    }
    setEditing(false); setMessage('')
  }

  if (loading) return <View style={styles.loading}><Text style={styles.muted}>Carregando perfil comunitário…</Text></View>
  if (!profile) return <View style={styles.loading}><Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text></View>

  const fallbackName = profile.displayName || user.user_metadata.full_name || user.email?.split('@')[0] || 'Motorista botali'
  const initial = fallbackName.trim().charAt(0).toUpperCase() || 'B'
  const displayedAvatar = avatarPreviewUri ?? (avatarPath ? profile.avatarUrl : null)
  const levelColor = getLevelColor(profile.levelNumber, colors)
  const pointsToNextLevel = Math.max(0, profile.nextLevelPoints - profile.contributionPoints)

  return <View style={styles.card}>
    <View style={styles.identity}>
      <View style={styles.avatarFrame}>{displayedAvatar ? <Image source={{ uri: displayedAvatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>}<Image source={levelFrames[profile.levelNumber] ?? levelFrames[1]} style={styles.avatarFrameArtwork} resizeMode="contain" accessible={false} /></View>
      <View style={styles.identityCopy}><Text style={styles.name}>{profile.displayName}</Text><View style={styles.levelTitleRow}><MaterialCommunityIcons name="shield-star-outline" size={14} color={levelColor} /><Text style={[styles.levelTitle, { color: levelColor }]}>Nível {profile.levelNumber} · {profile.levelTitle}</Text></View><Text style={styles.visibility}>{profile.isPublic ? 'Perfil visível para a comunidade' : 'Perfil privado'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={editing ? 'Cancelar edição do perfil' : 'Editar perfil comunitário'} style={styles.editButton} onPress={toggleEditing}><MaterialCommunityIcons name={editing ? 'close' : 'pencil-outline'} size={19} color={colors.brandText} /></Pressable>
    </View>
    <View accessible accessibilityLabel={`${profile.contributionPoints} pontos comunitários. Progresso de ${profile.levelProgressPercent} por cento no nível ${profile.levelNumber}.`} style={styles.levelCard}>
      <View style={styles.levelHeader}><Text style={styles.levelPoints}>{profile.contributionPoints} pontos</Text><Text style={styles.levelNext}>{profile.levelNumber === 5 ? 'Nível máximo' : `${pointsToNextLevel} para o próximo nível`}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: levelColor, width: `${profile.levelProgressPercent}%` }]} /></View>
      <Text style={styles.levelRule}>Contam preços validados, confirmações e cadastros aprovados.</Text>
    </View>
    <View style={styles.stats}>
      <Stat value={profile.validatedPriceReports} label="Preços validados" styles={styles} />
      <Stat value={profile.priceConfirmations} label="Confirmações" styles={styles} />
      <Stat value={profile.verifiedStations + profile.approvedEdits} label="Cadastros aprovados" styles={styles} />
    </View>
    <Text style={styles.sentSummary}>{profile.priceReports} {profile.priceReports === 1 ? 'preço enviado' : 'preços enviados'} no total</Text>
    {role === 'moderator' ? <View style={styles.roleSection}><Text style={styles.sectionLabel}>FUNÇÃO NA COMUNIDADE</Text><View accessible accessibilityLabel="Moderador Botali. Revisa cadastros e correções de postos." style={styles.moderatorCard}><Image source={require('../../../assets/community/badge-moderator.png')} style={styles.badgeArtwork} resizeMode="contain" accessible={false} /><View style={styles.badgeCopy}><Text style={styles.badgeTitle}>Moderador Botali</Text><Text style={styles.badgeDescription}>Revisa cadastros e correções de postos.</Text></View></View></View> : null}
    {profile.badges.length ? <View style={styles.badgesSection}><Text style={styles.sectionLabel}>CONQUISTAS</Text><View style={styles.badgesGrid}>{profile.badges.map((badge) => <View key={badge.id} accessible accessibilityLabel={`${badge.title}. ${badge.description}`} style={[styles.badgeItem, { borderColor: badge.accentColor }]}>{badgeArtwork[badge.id] ? <Image source={badgeArtwork[badge.id]} style={styles.badgeArtwork} resizeMode="contain" accessible={false} /> : <MaterialCommunityIcons name={badgeIconNames[badge.id] ?? 'medal-outline'} size={25} color={badge.accentColor} />}<View style={styles.badgeCopy}><Text style={styles.badgeTitle}>{badge.title}</Text><Text numberOfLines={2} style={styles.badgeDescription}>{badge.description}</Text></View></View>)}</View></View> : null}
    {editing ? <View style={styles.form}>
      <Text style={styles.label}>NOME PÚBLICO</Text>
      <TextInput accessibilityLabel="Nome público" maxLength={40} value={displayName} onChangeText={setDisplayName} placeholder="Como quer aparecer" placeholderTextColor={colors.textMuted} style={styles.input} />
      <Text style={styles.label}>FOTO DO PERFIL (OPCIONAL)</Text>
      <View style={styles.photoActions}><Pressable accessibilityRole="button" style={styles.photoButton} onPress={choosePhoto}><MaterialCommunityIcons name="image-outline" size={19} color={colors.brandText} /><Text style={styles.photoButtonText}>{displayedAvatar ? 'Trocar foto' : 'Escolher foto'}</Text></Pressable>{displayedAvatar ? <Pressable accessibilityRole="button" style={styles.removePhotoButton} onPress={() => { setAvatarPath(null); setAvatarPreviewUri(null); setPendingAvatarBase64(null) }}><Text style={styles.removePhotoText}>Remover</Text></Pressable> : null}</View>
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
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] }, avatarFrame: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }, avatarFrameArtwork: { position: 'absolute', width: 76, height: 76 }, avatar: { width: 42, height: 42, borderRadius: radius.full, backgroundColor: colors.border }, avatarFallback: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.brand }, avatarInitial: { color: colors.onBrand, fontFamily: typography.black, fontSize: typography.h3 }, identityCopy: { flex: 1 }, name: { color: colors.offWhite, fontFamily: typography.black, fontSize: 18 }, levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }, levelTitle: { flex: 1, fontFamily: typography.bold, fontSize: 11 }, visibility: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, marginTop: 2 }, editButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.full },
  levelCard: { marginTop: spacing[4], padding: spacing[3], borderRadius: radius.md, backgroundColor: colors.graphite }, levelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[2] }, levelPoints: { color: colors.offWhite, fontFamily: typography.black, fontSize: typography.small }, levelNext: { flex: 1, color: colors.textMuted, fontFamily: typography.semibold, fontSize: 10, textAlign: 'right' }, progressTrack: { height: 7, marginTop: spacing[2], overflow: 'hidden', borderRadius: radius.full, backgroundColor: colors.border }, progressFill: { height: '100%', borderRadius: radius.full }, levelRule: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 10, lineHeight: 14, marginTop: spacing[2] },
  stats: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }, stat: { flex: 1, minHeight: 72, padding: spacing[2], alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.graphite }, statValue: { color: colors.brandText, fontFamily: typography.black, fontSize: typography.h3 }, statLabel: { color: colors.textMuted, fontFamily: typography.semibold, fontSize: 9, lineHeight: 12, textAlign: 'center', marginTop: 2 }, sentSummary: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, textAlign: 'center', marginTop: spacing[2] },
  roleSection: { marginTop: spacing[4] }, moderatorCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[2], borderWidth: 1, borderColor: colors.info, borderRadius: radius.md, backgroundColor: colors.graphite }, badgesSection: { marginTop: spacing[4] }, sectionLabel: { color: colors.brandText, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginBottom: spacing[2] }, badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }, badgeItem: { minWidth: '47%', flex: 1, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[2], borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.graphite }, badgeArtwork: { width: 42, height: 42 }, badgeCopy: { flex: 1 }, badgeTitle: { color: colors.offWhite, fontFamily: typography.bold, fontSize: 11 }, badgeDescription: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 9, lineHeight: 12, marginTop: 2 },
  form: { marginTop: spacing[4], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border }, label: { color: colors.brandText, fontFamily: typography.black, fontSize: 9, letterSpacing: .8, marginBottom: spacing[2] }, input: { minHeight: 48, marginBottom: spacing[3], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.graphite, color: colors.offWhite, fontFamily: typography.regular },
  photoActions: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }, photoButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.graphite }, photoButtonText: { color: colors.brandText, fontFamily: typography.bold, fontSize: typography.small }, removePhotoButton: { minHeight: 48, paddingHorizontal: spacing[3], alignItems: 'center', justifyContent: 'center' }, removePhotoText: { color: colors.dangerText, fontFamily: typography.bold, fontSize: typography.small },
  visibilityControl: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }, visibilityCopy: { flex: 1 }, preferenceTitle: { color: colors.offWhite, fontFamily: typography.bold, fontSize: typography.small }, preferenceText: { color: colors.textMuted, fontFamily: typography.regular, fontSize: 11, lineHeight: 16, marginTop: 2 }, toggle: { width: 48, height: 28, padding: 3, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.border }, toggleActive: { backgroundColor: colors.brand }, toggleKnob: { width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.offWhite }, toggleKnobActive: { alignSelf: 'flex-end', backgroundColor: colors.graphite },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.brand }, saveText: { color: colors.onBrand, fontFamily: typography.black }, muted: { color: colors.textMuted, fontFamily: typography.regular, fontSize: typography.small }, success: { color: colors.brandText, fontFamily: typography.semibold, fontSize: typography.caption, marginTop: spacing[3] }, error: { color: colors.dangerText, fontFamily: typography.semibold, fontSize: typography.caption, marginTop: spacing[3] },
})

function getLevelColor(level: number, colors: ThemeColors) {
  if (level >= 5) return colors.offWhite
  if (level === 4) return colors.amber
  if (level === 3) return colors.brand
  if (level === 2) return colors.info
  return colors.textMuted
}
