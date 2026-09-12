import DebtPaymentModal from '@/components/DebtPaymentModal';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { usePermissions } from '@/contexts/PermissionsContext';
import { debtsService, parseDebtError } from '@/services/debts';
import type { Debt, Debtor, DebtsSummary } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Deudores: la pantalla principal del módulo en móvil.
 *
 * Agrupa por cliente en vez de listar deudas sueltas, porque la pregunta que
 * se hace el tendero es "¿quién me debe?", no "¿qué deudas hay?".
 */

function formatCOP(value: any): string {
  const n = Number(value) || 0;
  return `$ ${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function DebtorsScreen() {
  const { can } = usePermissions();

  const [summary, setSummary]   = useState<DebtsSummary | null>(null);
  const [debtors, setDebtors]   = useState<Debtor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [search, setSearch]           = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [payingDebt, setPayingDebt]   = useState<Debt | null>(null);

  const load = useCallback(async (q = search, overdue = onlyOverdue) => {
    setError(null);
    try {
      const [summaryData, debtorsData] = await Promise.all([
        debtsService.getSummary(),
        debtsService.listDebtors({ q: q || undefined, only_overdue: overdue, limit: 300 }),
      ]);
      setSummary(summaryData);
      setDebtors(debtorsData.items);
    } catch (err) {
      setError(parseDebtError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, onlyOverdue]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  /**
   * Abonar desde la lista: se cobra contra la deuda más antigua del cliente.
   * Es lo que hace cualquier cuaderno de fiado y evita preguntarle al cajero a
   * cuál de varias deudas aplicar el dinero con el cliente enfrente.
   */
  async function handleQuickPay(debtor: Debtor) {
    try {
      const account = await debtsService.getCustomerAccount(debtor.customer_id);
      const open = account.debts
        .filter((d) => ['pending', 'partial'].includes(d.status) && Number(d.balance) > 0)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (open.length === 0) {
        load();
        return;
      }
      setPayingDebt({ ...open[0], customer_name: debtor.customer_name });
    } catch (err) {
      setError(parseDebtError(err).message);
    }
  }

  const renderHeader = () => (
    <View>
      {/* Tarjetas de resumen */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Cartera total</Text>
          <Text style={styles.statValue}>{formatCOP(summary?.total_receivable)}</Text>
          <Text style={styles.statHint}>{summary?.open_debts_count || 0} deuda(s)</Text>
        </View>
        <View style={[styles.statCard, Number(summary?.overdue_amount) > 0 && styles.statCardDanger]}>
          <Text style={styles.statLabel}>Vencido</Text>
          <Text style={[styles.statValue, Number(summary?.overdue_amount) > 0 && { color: Colors.error }]}>
            {formatCOP(summary?.overdue_amount)}
          </Text>
          <Text style={styles.statHint}>{summary?.overdue_count || 0} vencida(s)</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Deudores</Text>
          <Text style={styles.statValue}>{summary?.debtors_count || 0}</Text>
          <Text style={styles.statHint}>clientes con saldo</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Abonos de hoy</Text>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {formatCOP(summary?.today?.total_amount)}
          </Text>
          <Text style={styles.statHint}>{summary?.today?.payments_count || 0} abono(s)</Text>
        </View>
      </View>

      {/* Turno activo: lo que lleva recibido en abonos */}
      {summary?.active_shift && Number(summary.active_shift.total_amount) > 0 && (
        <View style={styles.shiftBanner}>
          <Ionicons name="information-circle-outline" size={18} color="#1E40AF" />
          <Text style={styles.shiftBannerText}>
            En tu turno llevas {summary.active_shift.payments_count} abono(s) por{' '}
            {formatCOP(summary.active_shift.total_amount)}, de los cuales{' '}
            {formatCOP(summary.active_shift.cash_amount)} entraron en efectivo.
          </Text>
        </View>
      )}

      {/* Buscador y filtro */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => load(search, onlyOverdue)}
            placeholder="Buscar por nombre o cédula…"
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => { setSearch(''); load('', onlyOverdue); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => { const next = !onlyOverdue; setOnlyOverdue(next); load(search, next); }}
          style={[styles.filterChip, onlyOverdue && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, onlyOverdue && { color: Colors.white }]}>
            Vencidos
          </Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderDebtor = ({ item }: { item: Debtor }) => {
    const overdue = Number(item.overdue_count) > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/debts/${item.customer_id}` as any)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>{item.customer_name}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.customer_ident_type || 'CC'} {item.customer_ident}
            {item.customer_phone ? ` · ${item.customer_phone}` : ''}
          </Text>
          <Text style={styles.rowMeta}>
            {item.debts_count} deuda(s) · desde {formatDate(item.oldest_debt_at)}
            {item.last_payment_at ? ` · último abono ${formatDate(item.last_payment_at)}` : ''}
          </Text>
          {overdue && (
            <View style={styles.overdueChip}>
              <Text style={styles.overdueChipText}>
                {item.overdue_count} vencida(s) · {formatCOP(item.overdue_balance)}
                {item.max_days_overdue ? ` · ${item.max_days_overdue} d` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rowRight}>
          <Text style={[styles.rowBalance, overdue && { color: Colors.error }]}>
            {formatCOP(item.balance)}
          </Text>
          {can('register_debt_payments') && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => handleQuickPay(item)}
            >
              <Text style={styles.payBtnText}>Abonar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Barra superior */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Deudores</Text>
        {can('create_debts') ? (
          <TouchableOpacity onPress={() => router.push('/debts/new' as any)} hitSlop={10}>
            <Ionicons name="add-circle-outline" size={26} color={Colors.white} />
          </TouchableOpacity>
        ) : <View style={{ width: 26 }} />}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={debtors}
          keyExtractor={(item) => String(item.customer_id)}
          renderItem={renderDebtor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="happy-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>
                {search || onlyOverdue ? 'Sin resultados' : 'Nadie te debe nada'}
              </Text>
              <Text style={styles.emptyHint}>
                {search || onlyOverdue
                  ? 'Prueba con otro filtro.'
                  : 'Las ventas a crédito y los préstamos aparecerán aquí.'}
              </Text>
            </View>
          }
        />
      )}

      <DebtPaymentModal
        visible={Boolean(payingDebt)}
        debt={payingDebt}
        onClose={() => { setPayingDebt(null); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  topBarTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  statsRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  statCardDanger: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary, marginTop: 2 },
  statHint:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  shiftBanner: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  shiftBannerText: { flex: 1, fontSize: FontSize.xs, color: '#1E40AF', lineHeight: 17 },

  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },
  filterChip: {
    paddingHorizontal: Spacing.md, justifyContent: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  filterChipActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  filterChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  row: {
    flexDirection: 'row', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  rowName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  rowMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', justifyContent: 'space-between' },
  rowBalance: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#C2410C' },
  payBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.success,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  payBtnText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  overdueChip: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: Colors.errorLight, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  overdueChipText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.semibold },

  errorBox: {
    backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error,
    borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: Spacing.md },
  emptyHint:  { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
