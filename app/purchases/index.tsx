import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { purchaseService } from '@/services/extended';
import type { Purchase, PurchaseStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_META: Record<PurchaseStatus, { label: string; bg: string; color: string }> = {
  ordered: { label: 'Ordenada', bg: '#FEF3C7', color: '#92400E' },
  received: { label: 'Recibida', bg: '#DCFCE7', color: '#166534' },
  cancelled: { label: 'Cancelada', bg: '#FEE2E2', color: '#991B1B' },
};

export default function PurchasesScreen() {
  const toast = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all');

  const loadPurchases = useCallback(async () => {
    try {
      setError(null);
      // El backend no filtra por query params — se trae todo y se filtra en
      // cliente, igual que `purchases/index.jsx` en el web.
      const data = await purchaseService.getPurchases();
      setPurchases(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar compras');
      toast.error('Error al cargar compras');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPurchases();
    }, [loadPurchases])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadPurchases();
  };

  const filtered = purchases.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.invoice_number_supplier || '').toLowerCase().includes(q)
    );
  });

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const orderedCount = filtered.filter((p) => p.status === 'ordered').length;

  const renderPurchase = ({ item }: { item: Purchase }) => {
    const meta = STATUS_META[item.status] || STATUS_META.ordered;
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/purchases/${item.id}` as any)}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.supplierName}>{item.supplier_name || 'Proveedor'}</Text>
            {item.invoice_number_supplier && (
              <Text style={styles.invoiceNumber}>Factura: {item.invoice_number_supplier}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
            <Text style={styles.metaText}>
              {new Date(item.purchase_date).toLocaleDateString('es-CO')}
            </Text>
          </View>
          {item.warehouse_name && (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={14} color={Colors.textLight} />
              <Text style={styles.metaText}>{item.warehouse_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${Number(item.total || 0).toFixed(0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <LoadingState message="Cargando compras..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPurchases} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Compras</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/purchases/new' as any)}>
          <Ionicons name="add-circle" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Buscar por proveedor o factura..." />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'ordered', 'received', 'cancelled'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterButton, statusFilter === s && styles.filterButtonActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s === 'all' ? 'Todas' : STATUS_META[s].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Compras</Text>
          <Text style={styles.statValue}>{filtered.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>${totalAmount.toFixed(0)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#92400E' }]}>{orderedCount}</Text>
          <Text style={styles.statLabel}>Ordenadas</Text>
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No hay compras"
          message="Registra una nueva compra para comenzar"
          actionLabel="Nueva Compra"
          onAction={() => router.push('/purchases/new' as any)}
        />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id.toString()}
          style={styles.listBody}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
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
    width: 40,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  searchContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.white,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.white,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
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
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  supplierName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  invoiceNumber: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  totalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
