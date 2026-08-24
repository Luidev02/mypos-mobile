import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ProductImage } from '@/components/ProductImage';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedInventoryService, extendedProductService } from '@/services/extended';
import type { ProductDetailed, ProductMovement } from '@/types';
import { formatQuantity, formatQuantityWithUnit } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_LABELS: Record<string, string> = {
  ADJUSTMENT: 'Ajuste',
  PURCHASE: 'Compra',
  SALE: 'Venta',
  TRANSFER: 'Transferencia',
  RETURN: 'Devolución',
  DAMAGE: 'Daño',
};

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<ProductDetailed | null>(null);
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [productData, movementsData] = await Promise.all([
        extendedProductService.getProduct(Number(id)),
        extendedInventoryService.getProductMovements(Number(id)),
      ]);
      setProduct(productData);
      setMovements(movementsData);
    } catch (error: any) {
      console.error('Error loading inventory data:', error);
      setError(error.message || 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getStockStatus = () => {
    if (!product) return { status: 'good', color: '#10B981', label: 'Disponible' };

    const stock = product.quantity ?? product.stock ?? 0;
    const stockAlert = product.stock_alert || 10;

    if (stock === 0) {
      return { status: 'out', color: '#EF4444', label: 'Sin Stock' };
    } else if (stock <= stockAlert) {
      return { status: 'low', color: '#F59E0B', label: 'Stock Bajo' };
    }
    return { status: 'good', color: '#10B981', label: 'Disponible' };
  };

  const renderMovementItem = ({ item }: { item: ProductMovement }) => {
    const quantity = item.quantity || 0;
    const isEntry = quantity > 0;
    const color = isEntry ? '#10B981' : '#EF4444';
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    return (
      <View style={styles.movementCard}>
        <View style={[styles.movementIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={isEntry ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={color} />
        </View>
        <View style={styles.movementInfo}>
          <Text style={styles.movementType}>{typeLabel}</Text>
          <Text style={styles.movementDate}>
            {new Date(item.created_at).toLocaleString('es-CO', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.warehouse_name && <Text style={styles.movementReason}>{item.warehouse_name}</Text>}
          {item.notes && <Text style={styles.movementReason}>{item.notes}</Text>}
          <Text style={styles.movementUser}>{item.user_name || 'Sistema'}</Text>
        </View>
        <View style={styles.movementQuantity}>
          <Text style={[styles.movementQuantityText, { color }]}>
            {isEntry ? '+' : ''}
            {formatQuantity(quantity, item)}
          </Text>
          <Text style={styles.movementBalance}>{formatQuantity(item.new_stock, item)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !product) {
    return <ErrorState message={error || 'Producto no encontrado'} onRetry={loadData} />;
  }

  const stockStatus = getStockStatus();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Inventario</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        {/* Product Info */}
        <View style={styles.productSection}>
          <ProductImage
            productId={product.id}
            style={styles.productImageLarge}
            placeholderColor={Colors.textSecondary}
            placeholderSize={48}
          />
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{product.name || product.title}</Text>
            {product.sku && <Text style={styles.productSku}>SKU: {product.sku}</Text>}
            <View style={[styles.statusBadgeLarge, { backgroundColor: stockStatus.color + '20' }]}>
              <Text style={[styles.statusTextLarge, { color: stockStatus.color }]}>{stockStatus.label}</Text>
            </View>
          </View>
        </View>

        {/* Stock Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Stock Actual</Text>
            <Text style={[styles.statValue, { color: stockStatus.color }]}>
              {formatQuantityWithUnit(product.quantity ?? product.stock ?? 0, product)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Stock Mínimo</Text>
            <Text style={styles.statValue}>{product.stock_alert ?? 'N/A'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Precio</Text>
            <Text style={styles.statValue}>${Number(product.price || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Ajustar */}
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => router.push({ pathname: '/inventory/adjust', params: { product_id: product.id } } as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical" size={20} color={Colors.white} />
          <Text style={styles.adjustButtonText}>Ajustar Inventario</Text>
        </TouchableOpacity>

        {/* Movements History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kardex del Producto</Text>
          {movements.length === 0 ? (
            <View style={styles.emptyMovements}>
              <Ionicons name="list-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyMovementsText}>Sin movimientos registrados</Text>
            </View>
          ) : (
            <FlatList
              data={movements}
              renderItem={renderMovementItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
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
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  productSection: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  productImageLarge: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  productSku: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusTextLarge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#3B82F6',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  adjustButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  movementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  movementInfo: {
    flex: 1,
  },
  movementType: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  movementDate: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  movementReason: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  movementUser: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  movementQuantity: {
    alignItems: 'flex-end',
  },
  movementQuantityText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  movementBalance: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  emptyMovements: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyMovementsText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
});
