import { Colors } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { salesService } from '@/services/extended';
import { SaleDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';

export default function SalesScreen() {
  const toast = useToast();
  const [sales, setSales] = useState<SaleDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setError(null);
      const data = await salesService.getSales();
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
    loadSales();
  };

  const handleViewSale = async (sale: SaleDetailed) => {
    try {
      const saleDetail = await salesService.getSale(sale.id);
      // Navigate to detail screen or show modal
      toast.info(`Venta #${sale.invoice_number || sale.id}`);
    } catch (err: any) {
      toast.error('Error al cargar detalles de la venta');
    }
  };

  const filterSales = () => {
    const now = new Date();
    return sales.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      switch (filter) {
        case 'today':
          return saleDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return saleDate >= weekAgo;
        default:
          return true;
      }
    });
  };

  const filteredSales = filterSales();

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0) || 0;

  const renderSale = ({ item }: { item: SaleDetailed }) => (
    <TouchableOpacity style={styles.saleCard} onPress={() => handleViewSale(item)}>
      <View style={styles.saleHeader}>
        <View style={styles.saleHeaderLeft}>
          <Text style={styles.saleInvoice}>#{item.invoice_number || item.id}</Text>
          <Text style={styles.saleDate}>
            {new Date(item.created_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.saleHeaderRight}>
          <Text style={styles.saleTotal}>${Number(item.total || 0).toFixed(2)}</Text>
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
        <Text style={styles.metaValue}>${Number(item.subtotal || 0).toFixed(2)}</Text>
      </View>
      {Number(item.discount || 0) > 0 && (
        <View style={styles.saleMeta}>
          <Text style={styles.metaLabel}>Descuento:</Text>
          <Text style={[styles.metaValue, { color: '#EF4444' }]}>-${Number(item.discount || 0).toFixed(2)}</Text>
        </View>
      )}
      <View style={styles.saleMeta}>
        <Text style={styles.metaLabel}>IVA:</Text>
        <Text style={styles.metaValue}>${Number(item.tax || item.tax_amount || 0).toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSales} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Ventas</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
        </TouchableOpacity>
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
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Ventas</Text>
          <Text style={styles.statValue}>{filteredSales.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ingresos</Text>
          <Text style={styles.statValue}>${totalRevenue.toFixed(2)}</Text>
        </View>
      </View>

      {filteredSales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No hay ventas"
          message="Las ventas aparecerán aquí"
          actionLabel="Nueva Venta"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={filteredSales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id.toString()}
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
    backgroundColor: Colors.background,
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'white',
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
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
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
  },
  saleHeaderLeft: {
    flex: 1,
  },
  saleInvoice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  saleHeaderRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
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
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
