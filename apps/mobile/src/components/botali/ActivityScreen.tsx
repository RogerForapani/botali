import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ActivityItem } from '../../hooks/useActivity'
import { colors, radius, spacing, typography } from '../../theme/tokens'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

type Props = { authenticated: boolean; items: ActivityItem[]; loading: boolean; error: string; onSignIn: () => void; onExplore: () => void }

export function ActivityScreen({ authenticated, items, loading, error, onSignIn, onExplore }: Props) {
  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.eyebrow}>BOTALI</Text><Text style={styles.title}>Atividade</Text></View>
    {!authenticated ? <EmptyState icon="○" title="Entre para ver suas contribuições" description="Seus preços enviados ficam organizados neste histórico." />
      : loading ? <EmptyState icon="◷" title="Carregando sua atividade" description="Buscando suas contribuições mais recentes." />
      : error ? <EmptyState icon="!" title="Atividade indisponível" description={error} />
      : items.length ? <ScrollView contentContainerStyle={styles.list}>{items.map((item) => <View key={item.id} style={styles.card}><View style={styles.cardCopy}><Text style={styles.fuel}>{item.fuelName.toUpperCase()}</Text><Text style={styles.station}>{item.stationName}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View><Text style={styles.price}>R$ {item.price.toFixed(2).replace('.', ',')}</Text></View>)}</ScrollView>
      : <EmptyState icon="◷" title="Sua atividade vai aparecer aqui" description="Os preços que você enviar serão organizados neste histórico." />}
    <View style={styles.action}><Button onPress={authenticated ? onExplore : onSignIn}>{authenticated ? 'Explorar mapa' : 'Entrar'}</Button></View>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 82, backgroundColor: colors.graphite },
  header: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] },
  eyebrow: { color: colors.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.offWhite, fontSize: typography.h1, fontWeight: '900', marginTop: spacing[1] },
  list: { padding: spacing[4], gap: spacing[3] },
  card: { padding: spacing[4], borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  cardCopy: { flex: 1 },
  fuel: { color: colors.brand, fontSize: 10, fontWeight: '900' },
  station: { color: colors.offWhite, fontSize: typography.body, fontWeight: '800', marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  price: { color: colors.offWhite, fontSize: typography.h3, fontWeight: '900' },
  action: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
})
