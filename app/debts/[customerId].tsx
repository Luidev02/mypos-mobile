import DebtPaymentModal from '@/components/DebtPaymentModal';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { usePermissions } from '@/contexts/PermissionsContext';
import { debtsService, parseDebtError } from '@/services/debts';
import type { CustomerAccount, Debt } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Estado de cuenta de un cliente.
 *
 * Es la pantalla que se le muestra al cliente cuando reclama "yo le aboné el
 * viernes": la línea de tiempo mezcla deudas y abonos en orden cronológico,
 * con hora, cajero y caja de cada movimiento.
 */

function formatCOP(value: any): string {
  const n = Number(value) || 0;
  return `$ ${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TYPE_LABELS: Record<string, string> = {
  sale: 'Venta a crédito',
  loan: 'Préstamo',
  manual: 'Deuda manual',
};

export default function CustomerAccountScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { can } = usePermissions();

  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<'timeline' | 'debts'>('timeline');
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAccount(await debtsService.getCustomerAccount(Number(customerId)));
    } catch (err) {
      setError(parseDebtError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !account) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Estado de cuenta</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Cliente no encontrado'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { customer, totals, debts, timeline } = account;
  const openDebts = debts.filter(
    (d) => ['pending', 'partial'].includes(d.status) && Number(d.balance) > 0
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{customer.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Saldo */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo pendiente</Text>
          <Text style={styles.balanceValue}>{formatCOP(totals.balance)}</Text>
          {Number(totals.overdue_balance) > 0 && (
            <Text style={styles.overdueText}>
              {formatCOP(totals.overdue_balance)} vencido
            </Text>
          )}
          <Text style={styles.customerMeta}>
            {customer.ident_type || 'CC'} {customer.ident}
            {customer.phone ? ` · ${customer.phone}` : ''}
          </Text>
        </View>

        {/* Cupo */}
        <View style={styles.creditRow}>
          <View style={styles.creditCard}>
            <Text style={styles.creditLabel}>Cupo</Text>
            <Text style={styles.creditValue}>
              {totals.credit_limit === null ? 'Sin límite' : formatCOP(totals.credit_limit)}
            </Text>
          </View>
          <View style={styles.creditCard}>
            <Text style={styles.creditLabel}>Disponible</Text>
            <Text style={styles.creditValue}>
              {totals.available_credit === null ? 'Sin límite' : formatCOP(totals.available_credit)}
            </Text>
          </View>
          <View style={styles.creditCard}>
            <Text style={styles.creditLabel}>Deudas</Text>
            <Text style={styles.creditValue}>{totals.open_debts}</Text>
          </View>
        </View>

        {openDebts.length > 0 && can('register_debt_payments') && (
          <TouchableOpacity
            style={styles.payAllBtn}
            onPress={() => setPayingDebt({ ...openDebts[0], customer_name: customer.name })}
          >
            <Ionicons name="cash-outline" size={20} color={Colors.white} />
            <Text style={styles.payAllBtnText}>Abonar a la deuda más antigua</Text>
          </TouchableOpacity>
        )}

        {/* Pestañas */}
        <View style={styles.tabs}>
          {([
            { id: 'timeline' as const, label: 'Movimientos' },
            { id: 'debts' as const, label: `Deudas (${debts.length})` },
          ]).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.id && { color: Colors.white }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Línea de tiempo */}
        {tab === 'timeline' && (
          <View>
            {timeline.length === 0 ? (
              <Text style={styles.emptyText}>Sin movimientos</Text>
            ) : timeline.map((m, i) => (
              <View key={`${m.kind}-${m.debt_id}-${i}`} style={styles.timelineRow}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: m.kind === 'payment' ? Colors.success : '#F97316' },
                ]}>
                  <Ionicons
                    name={m.kind === 'payment' ? 'arrow-down' : 'cart'}
                    size={13}
                    color={Colors.white}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTitle} numberOfLines={1}>
                      {m.kind === 'payment'
                        ? `Abono ${m.receipt_number || ''}`
                        : TYPE_LABELS[m.type] || 'Deuda'}
                    </Text>
                    <Text style={[
                      styles.timelineAmount,
                      { color: m.kind === 'payment' ? Colors.success : '#C2410C' },
                    ]}>
                      {m.kind === 'payment' ? '−' : '+'} {formatCOP(m.amount)}
                    </Text>
                  </View>

                  {!!m.description && (
                    <Text style={styles.timelineMeta} numberOfLines={2}>{m.description}</Text>
                  )}
                  <Text style={styles.timelineMeta}>
                    {formatDateTime(m.at)}
                    {m.user_name ? ` · ${m.user_name}` : ''}
                    {m.cash_register_name ? ` · ${m.cash_register_name}` : ''}
                  </Text>
                  <Text style={styles.timelineMeta}>
                    Saldo tras el movimiento: {formatCOP(m.balance)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Deudas */}
        {tab === 'debts' && (
          <View>
            {debts.map((d) => {
              const overdue = Boolean(Number(d.is_overdue));
              const open = ['pending', 'partial'].includes(d.status);
              return (
                <View key={d.id} style={styles.debtCard}>
                  <View style={styles.debtHeader}>
                    <Text style={styles.debtTitle}>
                      {TYPE_LABELS[d.type] || 'Deuda'} #{d.id}
                    </Text>
                    <View style={[
                      styles.statusChip,
                      overdue && open ? styles.statusOverdue
                        : d.status === 'paid' ? styles.statusPaid
                        : d.status === 'cancelled' ? styles.statusCancelled
                        : styles.statusPending,
                    ]}>
                      <Text style={styles.statusChipText}>
                        {overdue && open ? `Vencida ${d.days_overdue || 0} d`
                          : d.status === 'paid' ? 'Pagada'
                          : d.status === 'cancelled' ? 'Anulada'
                          : d.status === 'partial' ? 'Abonada' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>

                  {!!(d.description || d.order_invoice_number) && (
                    <Text style={styles.debtMeta} numberOfLines={2}>
                      {d.description || d.order_invoice_number}
                    </Text>
                  )}
                  <Text style={styles.debtMeta}>
                    Registrada {formatDate(d.created_at)} · Vence {formatDate(d.due_date)}
                  </Text>

                  <View style={styles.debtAmounts}>
                    <View>
                      <Text style={styles.debtAmountLabel}>Total</Text>
                      <Text style={styles.debtAmountValue}>{formatCOP(d.total_amount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.debtAmountLabel}>Abonado</Text>
                      <Text style={[styles.debtAmountValue, { color: Colors.success }]}>
                        {formatCOP(d.paid_amount)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.debtAmountLabel}>Saldo</Text>
                      <Text style={[styles.debtAmountValue, { color: '#C2410C' }]}>
                        {formatCOP(d.balance)}
                      </Text>
                    </View>
                  </View>

                  {open && can('register_debt_payments') && (
                    <TouchableOpacity
                      style={styles.debtPayBtn}
                      onPress={() => setPayingDebt({ ...d, customer_name: customer.name })}
                    >
                      <Text style={styles.debtPayBtnText}>Abonar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

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
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  topBarTitle: { flex: 1, marginHorizontal: Spacing.md, color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  balanceCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  balanceValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.primary, marginTop: 2 },
  overdueText:  { fontSize: FontSize.sm, color: Colors.error, fontWeight: FontWeight.semibold, marginTop: 4 },
  customerMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm },

  creditRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  creditCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  creditLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  creditValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },

  payAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, borderRadius: BorderRadius.lg,
    paddingVertical: 14, marginBottom: Spacing.md,
  },
  payAllBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },

  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center',
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  timelineRow: {
    flexDirection: 'row', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  timelineDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  timelineTitle:  { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  timelineAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  timelineMeta:   { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  debtCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  debtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  debtTitle:  { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  debtMeta:   { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  debtAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  debtAmountLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  debtAmountValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  debtPayBtn: {
    marginTop: Spacing.sm, backgroundColor: Colors.success,
    borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center',
  },
  debtPayBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.sm },

  statusChip: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text },
  statusPending:   { backgroundColor: Colors.warningLight },
  statusPaid:      { backgroundColor: Colors.successLight },
  statusOverdue:   { backgroundColor: Colors.errorLight },
  statusCancelled: { backgroundColor: '#E5E7EB' },

  emptyText: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: Spacing.xl },
  errorText: { color: Colors.error, fontSize: FontSize.md, textAlign: 'center' },
});
