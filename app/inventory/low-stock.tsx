import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedInventoryService } from '@/services/extended';
import type { LowStockItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LowStockScreen() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await extendedInventoryService.getLowStock();
      setItems(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando reporte de stock bajo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const renderItem = ({ item }: { item: LowStockItem }) => {
    const currentQty = Number(item.quantity) || 0;
    const minStock = Number(item.stock_alert) || 0;
    const deficit = Math.max(0, minStock - currentQty);
    const isNegative = currentQty < 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productSku}>{item.sku}</Text>
          </View>
          <View style={[styles.statusBadge, isNegative && styles.statusBadgeCritical]}>
            <Text style={styles.statusBadgeText}>{isNegative ? 'CRÍTICO' : 'BAJO'}</Text>
          </View>
        </View>

        <Text style={styles.warehouseName}>
          <Ionicons name="business-outline" size={12} color={Colors.textLight} /> {item.warehouse_name}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Disponible</Text>
            <Text style={[styles.statValue, styles.statValueDanger]}>
              {isNegative ? Math.abs(currentQty).toFixed(2) : currentQty.toFixed(2)}
            </Text>
            {isNegative && <Text style={styles.noStockLabel}>Sin Stock</Text>}
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Mínimo</Text>
            <Text style={styles.statValue}>{minStock.toFixed(2)}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Déficit</Text>
            <View style={styles.deficitBadge}>
              <Text style={styles.deficitBadgeText}>{deficit.toFixed(2)} un.</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingState message="Analizando inventario..." />;
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
        <Text style={styles.headerTitle}>Alerta de Stock Bajo</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.warehouse_id}-${item.id}-${index}`}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>¡Excelente! Todo el inventario está en niveles óptimos.</Text>
          </View>
        }
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
    gap: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  productTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  productSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#DC2626',
  },
  warehouseName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    paddingTop: Spacing.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statValueDanger: {
    color: '#DC2626',
  },
  noStockLabel: {
    fontSize: FontSize.xs,
    color: '#EF4444',
    fontWeight: FontWeight.semibold,
  },
  deficitBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  deficitBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#991B1B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#10B981',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
