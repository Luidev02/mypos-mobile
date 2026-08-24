import ShiftModal from '@/components/ShiftModal';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Shift } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAYMENT_LABELS: Record<string, { label: string; icon: string; bg: string; color: string }> = {
  cash_sales: { label: 'Efectivo', icon: '💵', bg: '#F0FDF4', color: '#15803D' },
  card_sales: { label: 'Tarjeta', icon: '💳', bg: '#EFF6FF', color: '#1D4ED8' },
  transfer_sales: { label: 'Transferencia', icon: '🏦', bg: '#FAF5FF', color: '#7E22CE' },
  credit_sales: { label: 'Crédito', icon: '📝', bg: '#FFF7ED', color: '#C2410C' },
};

function formatDateTime(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ShiftsScreen() {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { activeShift: active, history: hist } = await posService.getShiftHistory(30);
      setActiveShift(active);
      setHistory(hist);
    } catch (e: any) {
      setError(e.message || 'Error al cargar turnos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const closedShifts = history.filter((s) => s.status === 'closed');
  // Ganancia real (solo efectivo) — ver nota en `types/index.ts#ShiftSalesSummary`
  // sobre por qué no se usa `shift.total_profit` acá.
  const totalCashProfit = closedShifts.reduce(
    (sum, s) => sum + (s.sales_summary?.cash_profit ?? 0),
    0
  );
  const avgProfit = closedShifts.length > 0 ? totalCashProfit / closedShifts.length : 0;

  const renderShiftCard = ({ item }: { item: Shift }) => {
    const sales = item.sales_summary;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.shiftId}>Turno #{item.id}</Text>
            <Text style={styles.registerName}>
              {item.cash_register_name || `Caja #${item.cash_register_id}`}
              {item.cash_register_code ? ` (${item.cash_register_code})` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'open' ? styles.statusOpen : styles.statusClosed]}>
            <Text style={[styles.statusText, item.status === 'open' ? styles.statusTextOpen : styles.statusTextClosed]}>
              {item.status === 'open' ? 'Abierto' : 'Cerrado'}
            </Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeLabel}>Inicio</Text>
            <Text style={styles.timeValue}>{formatDateTime(item.start_time)}</Text>
          </View>
          {item.end_time && (
            <View style={{ flex: 1 }}>
              <Text style={styles.timeLabel}>Fin</Text>
              <Text style={styles.timeValue}>{formatDateTime(item.end_time)}</Text>
            </View>
          )}
        </View>
        {!!item.hours_worked && <Text style={styles.hoursWorked}>{item.hours_worked}h trabajadas</Text>}

        {sales && sales.total_sales > 0 && (
          <View style={styles.salesSection}>
            <Text style={styles.salesCount}>
              🛒 {sales.total_sales} venta{sales.total_sales !== 1 ? 's' : ''} · {formatCurrency(sales.total_amount)}
            </Text>
            <View style={styles.paymentMethodsRow}>
              {(['cash_sales', 'card_sales', 'transfer_sales', 'credit_sales'] as const).map((key) => {
                const value = sales[key];
                if (!value) return null;
                const meta = PAYMENT_LABELS[key];
                return (
                  <View key={key} style={[styles.paymentChip, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.paymentChipText, { color: meta.color }]}>
                      {meta.icon} {formatCurrency(value)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Base</Text>
            <Text style={styles.statValue}>{formatCurrency(item.base_amount)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Esperado</Text>
            <Text style={styles.statValue}>
              {item.final_cash_expected !== undefined ? formatCurrency(item.final_cash_expected) : '-'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Real</Text>
            <Text style={styles.statValue}>
              {item.final_cash_real !== undefined ? formatCurrency(item.final_cash_real) : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          {item.difference !== undefined && item.difference !== null && (
            <Text
              style={[
                styles.differenceText,
                { color: item.difference < 0 ? '#DC2626' : item.difference > 0 ? '#2563EB' : Colors.textLight },
              ]}
            >
              {item.difference >= 0 ? '+' : ''}
              {formatCurrency(item.difference)}
            </Text>
          )}
          {sales && (
            <Text style={styles.profitText}>💰 {formatCurrency(sales.cash_profit)}</Text>
          )}
        </View>
        {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
      </View>
    );
  };

  if (isLoading) {
    return <LoadingState message="Cargando turnos..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turnos</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        renderItem={renderShiftCard}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {activeShift ? (
              <View style={styles.activeCard}>
                <Text style={styles.activeTitle}>Turno Activo</Text>
                <Text style={styles.activeSubtitle}>
                  Caja: {activeShift.cash_register_name || `Caja #${activeShift.cash_register_id}`}
                  {activeShift.cash_register_code ? ` (${activeShift.cash_register_code})` : ''}
                </Text>
                <View style={styles.activeStatsRow}>
                  <View>
                    <Text style={styles.activeStatLabel}>Monto Base</Text>
                    <Text style={styles.activeStatValue}>{formatCurrency(activeShift.base_amount)}</Text>
                  </View>
                  <View>
                    <Text style={styles.activeStatLabel}>Abierto desde</Text>
                    <Text style={styles.activeStatValueSmall}>{formatDateTime(activeShift.start_time)}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeShiftButton} onPress={() => setShowCloseModal(true)}>
                  <Text style={styles.closeShiftButtonText}>Cerrar Turno</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noActiveCard}>
                <Text style={styles.noActiveTitle}>No hay turno activo</Text>
                <Text style={styles.noActiveText}>Inicia un nuevo turno para comenzar a registrar ventas</Text>
                <TouchableOpacity style={styles.openShiftButton} onPress={() => setShowOpenModal(true)}>
                  <Text style={styles.openShiftButtonText}>Abrir Nuevo Turno</Text>
                </TouchableOpacity>
              </View>
            )}

            {closedShifts.length > 0 && (
              <View style={styles.profitSummaryCard}>
                <Text style={styles.profitSummaryIcon}>💰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profitSummaryTitle}>Ganancia en Efectivo (turnos cerrados)</Text>
                  <Text style={styles.profitSummarySubtitle}>{closedShifts.length} turnos cerrados</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.profitSummaryValue}>{formatCurrency(totalCashProfit)}</Text>
                  <Text style={styles.profitSummaryAvg}>Prom: {formatCurrency(avgProfit)}</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Historial de Turnos</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay turnos registrados</Text>
        }
      />

      <ShiftModal
        visible={showOpenModal}
        mode="open"
        onClose={() => setShowOpenModal(false)}
        onSuccess={loadData}
      />
      <ShiftModal
        visible={showCloseModal}
        mode="close"
        activeShift={activeShift}
        onClose={() => setShowCloseModal(false)}
        onSuccess={loadData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 8 : Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  activeCard: {
    backgroundColor: '#16A34A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  activeTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  activeSubtitle: {
    fontSize: FontSize.sm,
    color: '#DCFCE7',
    marginBottom: Spacing.md,
  },
  activeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  activeStatLabel: {
    fontSize: FontSize.xs,
    color: '#DCFCE7',
    marginBottom: Spacing.xs,
  },
  activeStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  activeStatValueSmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  closeShiftButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  closeShiftButtonText: {
    color: '#16A34A',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  noActiveCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  noActiveTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  noActiveText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  openShiftButton: {
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  openShiftButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  profitSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  profitSummaryIcon: {
    fontSize: 32,
  },
  profitSummaryTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  profitSummarySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  profitSummaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#16A34A',
  },
  profitSummaryAvg: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  shiftId: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  registerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusClosed: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  statusTextOpen: {
    color: '#166534',
  },
  statusTextClosed: {
    color: '#374151',
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  timeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  timeValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  hoursWorked: {
    fontSize: FontSize.xs,
    color: '#2563EB',
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  salesSection: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  salesCount: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  paymentChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paymentChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  differenceText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  profitText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#16A34A',
  },
  notesText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
});
