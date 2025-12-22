import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ProductImage } from '@/components/ProductImage';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedProductService, inventoryService } from '@/services';
import { extendedInventoryService } from '@/services/extended';
import type { CreateInventoryAdjustmentRequest, InventoryItem, ProductDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal de ajuste rápido
  const [showQuickAdjustModal, setShowQuickAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailed | null>(null);
  const [products, setProducts] = useState<ProductDetailed[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'exit' | 'adjustment'>('adjustment');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await inventoryService.getInventory();
      setInventory(data);
    } catch (error: any) {
      setError(error.message || 'Error al cargar inventario');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await extendedProductService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    loadInventory();
    loadProducts();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [searchQuery, inventory, filter]);

  const handleOpenQuickAdjust = () => {
    console.log('=== handleOpenQuickAdjust called ===');
    console.log('Setting modal to true');
    setSelectedProduct(null);
    setAdjustmentType('adjustment');
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setProductSearchQuery('');
    setShowQuickAdjustModal(true);
    console.log('Modal state should be true now');
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Seleccione un producto');
      return;
    }

    if (!adjustmentQuantity || Number(adjustmentQuantity) <= 0) {
      Alert.alert('Error', 'Ingrese una cantidad válida');
      return;
    }

    if (!adjustmentReason.trim()) {
      Alert.alert('Error', 'Ingrese un motivo');
      return;
    }

    try {
      const quantity = Number(adjustmentQuantity);
      const adjustmentData: CreateInventoryAdjustmentRequest = {
        product_id: selectedProduct.id,
        warehouse_id: 1,
        quantity: adjustmentType === 'exit' ? -quantity : quantity,
        type: adjustmentType,
        reason: adjustmentReason,
        notes: adjustmentNotes || undefined,
      };

      await extendedInventoryService.adjustInventory(adjustmentData);
      Alert.alert('Éxito', 'Ajuste de inventario realizado');
      setShowQuickAdjustModal(false);
      loadInventory();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo realizar el ajuste');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    const name = p.name?.toLowerCase() || '';
    const sku = p.sku?.toLowerCase() || '';
    return name.includes(query) || sku.includes(query);
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInventory();
  };

  const filterInventory = () => {
    let filtered = inventory;

    // Aplicar filtro de búsqueda
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const title = item.product_title?.toLowerCase() || '';
        const sku = item.sku?.toLowerCase() || '';
        return title.includes(query) || sku.includes(query);
      });
    }

    // Aplicar filtro de estado
    switch (filter) {
      case 'low':
        filtered = filtered.filter((item) => {
          const stockAlert = item.stock_alert || 10;
          const quantity = item.quantity || 0;
          return quantity <= stockAlert && quantity > 0;
        });
        break;
      case 'out':
        filtered = filtered.filter((item) => (item.quantity || 0) === 0);
        break;
    }

    setFilteredInventory(filtered);
  };

  const getStockStatus = (item: InventoryItem) => {
    const stockAlert = item.stock_alert || 10;
    if (item.quantity === 0) return 'out';
    if (item.quantity <= stockAlert) return 'low';
    return 'good';
  };

  const getStockColor = (status: string) => {
    switch (status) {
      case 'out':
        return '#EF4444';
      case 'low':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'out':
        return 'Sin Stock';
      case 'low':
        return 'Stock Bajo';
      default:
        return 'Disponible';
    }
  };

  // Calcular estadísticas
  const totalProducts = inventory.length;
  const lowStockCount = inventory.filter((item) => {
    const stockAlert = item.stock_alert || 10;
    return item.quantity <= stockAlert && item.quantity > 0;
  }).length;
  const outOfStockCount = inventory.filter((item) => item.quantity === 0).length;

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const status = getStockStatus(item);
    const statusColor = getStockColor(status);

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
          {item.sku && (
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
          )}
          <View style={styles.productMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStockLabel(status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.stockSection}>
          <Text style={styles.stockLabel}>Stock</Text>
          <Text style={[styles.stockValue, { color: statusColor }]}>
            {item.quantity}
          </Text>
          {item.stock_alert && (
            <Text style={styles.stockAlert}>
              Min: {item.stock_alert}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadInventory} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* <View style={styles.header}>
        <Text style={styles.title}>Inventario</Text>
        <TouchableOpacity
          onPress={() => {
            console.log('=== AJUSTAR INVENTARIO CLICKED ===');
            Alert.alert('Test', 'Botón presionado');
            handleOpenQuickAdjust();
          }}
          style={styles.adjustButton}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.adjustButtonText}>Ajustar Inventario</Text>
        </TouchableOpacity>
      </View> */}

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

      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre o SKU..."
        />
      </View>

      {/* Filters */}
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
          <Text style={[styles.filterText, filter === 'low' && styles.filterTextActive]}>
            Stock Bajo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'out' && styles.filterButtonActive]}
          onPress={() => setFilter('out')}
        >
          <Text style={[styles.filterText, filter === 'out' && styles.filterTextActive]}>
            Sin Stock
          </Text>
        </TouchableOpacity>
      </View>

      {filteredInventory.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No hay productos"
          message={searchQuery ? 'No se encontraron productos' : 'El inventario está vacío'}
        />
      ) : (
        <FlatList
          data={filteredInventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        />
      )}
      
      {/* Botón flotante para ajuste rápido */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('FAB pressed');
          handleOpenQuickAdjust();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de ajuste rápido */}
      <Modal visible={showQuickAdjustModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQuickAdjustModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ajuste Rápido</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Selector de tipo */}
            <Text style={styles.label}>Tipo de Ajuste</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentType === 'entry' && styles.typeButtonActive,
                  { borderColor: '#10B981' },
                ]}
                onPress={() => setAdjustmentType('entry')}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={24}
                  color={adjustmentType === 'entry' ? '#10B981' : Colors.textLight}
                />
                <Text style={[
                  styles.typeButtonText,
                  adjustmentType === 'entry' && { color: '#10B981' }
                ]}>
                  Entrada
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentType === 'exit' && styles.typeButtonActive,
                  { borderColor: '#EF4444' },
                ]}
                onPress={() => setAdjustmentType('exit')}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={24}
                  color={adjustmentType === 'exit' ? '#EF4444' : Colors.textLight}
                />
                <Text style={[
                  styles.typeButtonText,
                  adjustmentType === 'exit' && { color: '#EF4444' }
                ]}>
                  Salida
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  adjustmentType === 'adjustment' && styles.typeButtonActive,
                  { borderColor: Colors.primary },
                ]}
                onPress={() => setAdjustmentType('adjustment')}
              >
                <Ionicons
                  name="settings"
                  size={24}
                  color={adjustmentType === 'adjustment' ? Colors.primary : Colors.textLight}
                />
                <Text style={[
                  styles.typeButtonText,
                  adjustmentType === 'adjustment' && { color: Colors.primary }
                ]}>
                  Ajuste
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector de producto */}
            <Text style={styles.label}>
              Producto <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Buscar producto..."
              value={productSearchQuery}
              onChangeText={setProductSearchQuery}
            />

            {productSearchQuery.length > 0 && (
              <ScrollView style={styles.productsList} nestedScrollEnabled>
                {filteredProducts.slice(0, 5).map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productItem,
                      selectedProduct?.id === product.id && styles.productItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProduct(product);
                      setProductSearchQuery(product.name);
                    }}
                  >
                    <ProductImage
                      productId={product.id}
                      style={styles.productItemImage}
                      placeholderSize={16}
                    />
                    <View style={styles.productItemInfo}>
                      <Text style={styles.productItemName}>{product.name}</Text>
                      <Text style={styles.productItemSku}>SKU: {product.sku}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedProduct && (
              <View style={styles.selectedProductCard}>
                <ProductImage
                  productId={selectedProduct.id}
                  style={styles.selectedProductImage}
                  placeholderSize={24}
                />
                <View>
                  <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                  <Text style={styles.selectedProductStock}>
                    Stock actual: {selectedProduct.stock || selectedProduct.quantity || 0}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.label}>
              Cantidad <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={adjustmentQuantity}
              onChangeText={setAdjustmentQuantity}
              keyboardType="numeric"
            />

            <Text style={styles.label}>
              Motivo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Compra, Devolución, Ajuste por inventario"
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
            />

            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas adicionales (opcional)"
              value={adjustmentNotes}
              onChangeText={setAdjustmentNotes}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAdjustment}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Guardar Ajuste</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 8 : Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  adjustButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  headerButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    zIndex: 1000,
    elevation: 5,
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
    ...Shadow.sm,
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
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    padding: Spacing.md,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 90 : 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
  },
  typeButtonActive: {
    backgroundColor: Colors.background,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  productsList: {
    maxHeight: 200,
    marginBottom: Spacing.md,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '10',
  },
  productItemImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  productItemSku: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedProductImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  selectedProductName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  selectedProductStock: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  stockAlert: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
});
