import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedInventoryService } from '@/services';
import type { InventoryItem } from '@/types';
import { formatCurrency, getStockColor } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  useEffect(() => {
    loadInventory();
  }, [filter]);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      const data = filter === 'low' 
        ? await extendedInventoryService.getLowStock()
        : await extendedInventoryService.getInventory();
      setInventory(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el inventario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInventory();
    setIsRefreshing(false);
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.inventoryInfo}>
        <Text style={styles.productName}>{item.product.name}</Text>
        <Text style={styles.productSku}>SKU: {item.product.sku}</Text>
        <Text style={styles.productPrice}>{formatCurrency(item.product.price)}</Text>
      </View>
      <View style={styles.stockContainer}>
        <Text style={[
          styles.stockValue,
          { color: getStockColor(item.stock, Colors) }
        ]}>
          {item.stock}
        </Text>
        <Text style={styles.stockLabel}>unidades</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/hub')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventario</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'low' && styles.filterButtonActive]}
          onPress={() => setFilter('low')}
        >
          <Ionicons 
            name="warning-outline" 
            size={16} 
            color={filter === 'low' ? Colors.white : Colors.warning} 
          />
          <Text style={[styles.filterText, filter === 'low' && styles.filterTextActive]}>
            Stock Bajo
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={inventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.product_id.toString()}
        contentContainerStyle={styles.inventoryList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No hay productos en inventario</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  addButton: {
    padding: Spacing.sm,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.white,
  },
  inventoryList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  inventoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  inventoryInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  productSku: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  productPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  stockContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  stockValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  stockLow: {
    color: Colors.warning,
  },
  stockZero: {
    color: Colors.error,
  },
  stockLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
});
