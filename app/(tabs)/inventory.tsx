import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ProductImage } from '@/components/ProductImage';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { warehouseService } from '@/services/extended';
import type { Warehouse, WarehouseStock } from '@/types';
import { formatQuantityWithUnit } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [items, setItems] = useState<WarehouseStock[]>([]);
  const [filteredItems, setFilteredItems] = useState<WarehouseStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await warehouseService.getWarehouses();
        setWarehouses(data);
        if (data.length > 0) {
          setSelectedWarehouse(String(data[0].id));
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error cargando bodegas', e);
        setIsLoading(false);
      }
    })();
  }, []);

  const loadStock = useCallback(async () => {
    if (!selectedWarehouse) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await warehouseService.getWarehouseStock(Number(selectedWarehouse));
      setItems(data);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el inventario');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedWarehouse]);

  useFocusEffect(
    useCallback(() => {
      loadStock();
    }, [loadStock])
  );

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setFilteredItems(items);
      return;
    }
    setFilteredItems(
      items.filter(
        (it) =>
          (it.product_title || '').toLowerCase().includes(query) ||
          (it.sku || '').toLowerCase().includes(query) ||
          (it.barcode || '').toLowerCase().includes(query) ||
          (it.location_in_warehouse || '').toLowerCase().includes(query)
      )
    );
  }, [searchQuery, items]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStock();
  };

  const getStockStatus = (item: WarehouseStock) => {
    const qty = Number(item.quantity) || 0;
    const alert = Number(item.stock_alert) || 5;
    if (qty === 0) return { status: 'critical', color: '#EF4444', label: 'Agotado' };
    if (qty <= alert) return { status: 'low', color: '#F59E0B', label: 'Stock Bajo' };
    return { status: 'normal', color: '#10B981', label: 'Normal' };
  };

  const totalProducts = items.length;
  const lowStockCount = items.filter((it) => {
    const s = getStockStatus(it);
    return s.status === 'low';
  }).length;
  const outOfStockCount = items.filter((it) => (Number(it.quantity) || 0) === 0).length;

  const renderItem = ({ item }: { item: WarehouseStock }) => {
    const status = getStockStatus(item);

    return (
      <TouchableOpacity
        style={styles.inventoryCard}
        onPress={() => router.push(`/inventory/${item.product_id}` as any)}
        activeOpacity={0.7}
      >
        <ProductImage
          productId={item.product_id}
          style={styles.productImage}
          placeholderColor={Colors.textSecondary}
          placeholderSize={24}
        />

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product_title || `Producto #${item.product_id}`}
          </Text>
          {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
          {item.location_in_warehouse ? (
            <Text style={styles.productLocation}>{item.location_in_warehouse}</Text>
          ) : null}
          <View style={styles.productMeta}>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.stockSection}>
          <Text style={styles.stockLabel}>Stock</Text>
          <Text style={[styles.stockValue, { color: status.color }]}>
            {formatQuantityWithUnit(item.quantity, item)}
          </Text>
          {item.stock_alert !== undefined && (
            <Text style={styles.stockAlert}>Min: {item.stock_alert}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (isLoading && items.length === 0) {
    return <LoadingState message="Cargando inventario..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadStock} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario</Text>
        <TouchableOpacity onPress={() => router.push('/inventory/low-stock' as any)} style={styles.addButton}>
          <Ionicons name="alert-circle" size={26} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="cube-outline" size={24} color={Colors.primary} />
          <Text style={styles.statValue}>{totalProducts}</Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <Ionicons name="alert-circle-outline" size={24} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Stock Bajo</Text>
        </View>
        <View style={[styles.statCard, styles.statCardDanger]}>
          <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{outOfStockCount}</Text>
          <Text style={styles.statLabel}>Sin Stock</Text>
        </View>
      </View>

      {/* Bodega */}
      <View style={styles.warehouseContainer}>
        <Text style={styles.filterLabel}>Bodega</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={selectedWarehouse} onValueChange={(v) => setSelectedWarehouse(String(v))}>
            {warehouses.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={String(w.id)} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Nombre, SKU, código de barras o ubicación..."
        />
      </View>

      {/* Botón de ajuste */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.adjustButton} onPress={() => router.push('/inventory/adjust' as any)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.adjustButtonText}>Ajustar Inventario</Text>
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No hay productos"
          message={searchQuery ? 'No se encontraron productos' : 'Esta bodega no tiene stock registrado'}
        />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.warehouse_id}-${item.product_id}`}
          style={styles.listBody}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
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
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    marginLeft: Spacing.md,
  },
  addButton: {
    padding: Spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardWarning: {
    backgroundColor: '#FEF3C7',
  },
  statCardDanger: {
    backgroundColor: '#FEE2E2',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  warehouseContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  actionsRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  adjustButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  productSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  productLocation: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  stockSection: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  stockLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  stockValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  stockAlert: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
});
