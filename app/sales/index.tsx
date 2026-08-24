import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { salesService } from '@/services/extended';
import { DianStatus, SaleDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIAN_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  not_sent: { bg: '#F3F4F6', color: '#4B5563', label: 'Sin enviar' },
  processing: { bg: '#FEF3C7', color: '#92400E', label: 'Procesando' },
  approved: { bg: '#DCFCE7', color: '#166534', label: '✓ DIAN OK' },
  rejected: { bg: '#FEE2E2', color: '#B91C1C', label: '✗ Rechazada' },
};

// YYYY-MM-DD en horario local — igual que `moment().format('YYYY-MM-DD')` del web.
function toDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SalesScreen() {
  const toast = useToast();
  const [sales, setSales] = useState<SaleDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today');
  const [retryingId, setRetryingId] = useState<number | null>(null);

  useEffect(() => {
    loadSales(filter);
  }, [filter]);

  const dateRangeFor = (f: 'all' | 'today' | 'week') => {
    const now = new Date();
    if (f === 'today') {
      const today = toDateParam(now);
      return { date_from: today, date_to: today };
    }
    if (f === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { date_from: toDateParam(weekAgo), date_to: toDateParam(now) };
    }
    // 'all' — sin rango, el backend igual acota con `limit` (500 por defecto).
    return {};
  };

  const loadSales = async (f: 'all' | 'today' | 'week') => {
    try {
      setError(null);
      const data = await salesService.getSales(dateRangeFor(f));
      setSales(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar ventas');
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSales(filter);
  };

  const handleViewSale = (sale: SaleDetailed) => {
    router.push(`/sales/${sale.id}` as any);
  };

  const handleRetryDian = async (saleId: number) => {
    setRetryingId(saleId);
    try {
      await salesService.retryDianInvoice(saleId);
      const updated = await salesService.getDianStatus(saleId);
      setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, ...updated } : s)));
    } catch (err: any) {
      toast.error(err.message || 'No se pudo reintentar el envío a la DIAN');
    } finally {
      setRetryingId(null);
    }
  };

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalProfit = sales.reduce((sum, sale) => sum + Number(sale.profit_total || 0), 0);
  const totalCash = sales
    .filter((s) => s.payment_method === 'cash')
    .reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalOther = totalRevenue - totalCash;

  const renderSale = ({ item }: { item: SaleDetailed }) => {
    const dianBadge = item.dian_status && item.dian_status !== 'not_applicable' ? DIAN_BADGES[item.dian_status] : null;
    const canRetry = item.dian_status === 'rejected' || item.dian_status === 'not_sent';

    return (
      <TouchableOpacity style={styles.saleCard} onPress={() => handleViewSale(item)}>
        <View style={styles.saleHeader}>
          <View style={styles.saleHeaderLeft}>
            <Text style={styles.saleInvoice}>#{item.invoice_number || item.id}</Text>
            <Text style={styles.saleDate}>
              {new Date(item.created_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={styles.saleHeaderRight}>
            <Text style={styles.saleTotal}>${Number(item.total || 0).toFixed(0)}</Text>
            {item.status && (
              <View style={[styles.statusBadge, item.status === 'completed' && styles.statusCompleted]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.saleBody}>
          {item.customer_name && (
            <View style={styles.saleInfo}>
              <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.saleInfoText}>{item.customer_name}</Text>
            </View>
          )}
          <View style={styles.saleInfo}>
            <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.saleInfoText}>{item.payment_method}</Text>
          </View>
          {item.items_count && (
            <View style={styles.saleInfo}>
              <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.saleInfoText}>{item.items_count} productos</Text>
            </View>
          )}
        </View>

        <View style={styles.saleMeta}>
          <Text style={styles.metaLabel}>Subtotal:</Text>
          <Text style={styles.metaValue}>${Number(item.subtotal || 0).toFixed(0)}</Text>
        </View>
        {Number(item.discount_amount || item.discount || 0) > 0 && (
          <View style={styles.saleMeta}>
            <Text style={styles.metaLabel}>Descuento:</Text>
            <Text style={[styles.metaValue, { color: '#EF4444' }]}>
              -${Number(item.discount_amount || item.discount || 0).toFixed(0)}
            </Text>
          </View>
        )}
        <View style={styles.saleMeta}>
          <Text style={styles.metaLabel}>IVA:</Text>
          <Text style={styles.metaValue}>${Number(item.tax_amount || item.tax || 0).toFixed(0)}</Text>
        </View>

        {dianBadge && (
          <View style={styles.dianRow}>
            <View style={[styles.dianBadge, { backgroundColor: dianBadge.bg }]}>
              <Text style={[styles.dianBadgeText, { color: dianBadge.color }]}>{dianBadge.label}</Text>
            </View>
            {item.dian_status === 'approved' && item.dian_pdf_url && (
              <TouchableOpacity onPress={() => Linking.openURL(item.dian_pdf_url!)}>
                <Text style={styles.dianLink}>Ver PDF</Text>
              </TouchableOpacity>
            )}
            {canRetry && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleRetryDian(item.id);
                }}
                disabled={retryingId === item.id}
              >
                <Text style={[styles.dianRetry, retryingId === item.id && { opacity: 0.5 }]}>
                  {retryingId === item.id ? 'Enviando...' : 'Reintentar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => loadSales(filter)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Ventas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)/pos')}>
          <Ionicons name="add-circle" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
          onPress={() => setFilter('today')}
        >
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterText, filter === 'week' && styles.filterTextActive]}>
            Esta Semana
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ventas</Text>
          <Text style={styles.statValue}>{sales.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ingresos</Text>
          <Text style={styles.statValue}>${totalRevenue.toFixed(0)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ganancia</Text>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>${totalProfit.toFixed(0)}</Text>
        </View>
      </View>
      <View style={styles.statsCardSecondary}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Efectivo</Text>
          <Text style={styles.statValueSmall}>${totalCash.toFixed(0)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Otros medios</Text>
          <Text style={styles.statValueSmall}>${totalOther.toFixed(0)}</Text>
        </View>
      </View>

      {sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No hay ventas"
          message="Las ventas aparecerán aquí"
          actionLabel="Nueva Venta"
          onAction={() => router.push('/(tabs)/pos')}
        />
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id.toString()}
          style={styles.listBody}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryDark,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    marginLeft: Spacing.md,
  },
  addButton: {
    padding: Spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  filterTextActive: {
    color: 'white',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCardSecondary: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    flexShrink: 1,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  saleHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  saleInvoice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  saleHeaderRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '50%',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  saleBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  saleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saleInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
  dianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  dianBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dianBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dianLink: {
    fontSize: 12,
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  dianRetry: {
    fontSize: 12,
    color: '#C2410C',
    textDecorationLine: 'underline',
  },
});
