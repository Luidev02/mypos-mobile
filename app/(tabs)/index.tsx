import ShiftModal from '@/components/ShiftModal';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { posService } from '@/services';
import type { Category, Product, Shift } from '@/types';
import { formatCurrency, getStockColor } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function POSScreen() {
  const { user } = useAuth();
  const { items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  const [customer, setCustomer] = useState('Consumidor Final');
  const [orderType, setOrderType] = useState('Sin tipo');
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Calculate tax and total
  const tax = subtotal * 0.19; // 19% IVA
  const total = subtotal + tax;

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search (500ms like web version)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await posService.searchProducts(searchQuery);
        setProducts(results);
        setSelectedCategory(null); // Clear category selection
      } catch (error: any) {
        Alert.alert('Error', 'No se pudo realizar la búsqueda');
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [categoriesData, activeShift] = await Promise.all([
        posService.getCategories(),
        posService.getActiveShift(),
      ]);
      
      setCategories(categoriesData);
      setShift(activeShift);
      
      // Si no hay turno activo, mostrar modal
      if (!activeShift) {
        setTimeout(() => setShowShiftModal(true), 500);
      }
      
      if (categoriesData.length > 0) {
        await handleCategorySelect(categoriesData[0]);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCategorySelect = async (category: Category) => {
    try {
      setSelectedCategory(category.id);
      setSearchQuery(''); // Clear search when selecting category
      const categoryProducts = await posService.getCategoryProducts(category.id);
      setProducts(categoryProducts);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    }
  };

  const handleProductPress = (product: Product) => {
    // Verificar turno activo
    if (!shift) {
      Alert.alert(
        'Sin Turno Activo',
        'Debe abrir un turno antes de realizar ventas',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Turno', onPress: () => setShowShiftModal(true) },
        ]
      );
      return;
    }

    if (product.stock <= 0) {
      Alert.alert('Sin Stock', 'Este producto no tiene stock disponible');
      return;
    }

    addItem(product);
  };

  const handleShiftSuccess = async () => {
    const activeShift = await posService.getActiveShift();
    setShift(activeShift);
  };

  const handleOpenShift = () => {
    setShowShiftModal(true);
  };

  const handlePay = () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'Agregue productos antes de pagar');
      return;
    }
    router.push('/cart');
  };

  const handlePause = () => {
    Alert.alert('Pausar Venta', 'Esta función estará disponible pronto');
  };

  const handleClear = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Limpiar Carrito',
      '¿Está seguro de eliminar todos los productos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  const filteredProducts = searchQuery.trim() === '' ? products : products;

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        selectedCategory === item.id && styles.categoryCardSelected,
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextSelected,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      disabled={item.stock <= 0}
    >
      <View style={styles.productImagePlaceholder}>
        <Ionicons name="image-outline" size={32} color={Colors.textLight} />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
        <Text style={[styles.productStock, { color: getStockColor(item.stock, Colors) }]}>
          Stock: {item.stock}
        </Text>
      </View>
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/hub')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Punto de Venta</Text>
        </View>
      </View>

      {/* Top Action Buttons - Compact */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.topActionsScroll}
        contentContainerStyle={styles.topActions}
      >
        <TouchableOpacity 
          style={[styles.actionButton, !shift && styles.actionButtonWarning]}
          onPress={handleOpenShift}
        >
          <Ionicons name="time-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>{shift ? 'Turno Activo' : 'Sin Turno'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Órdenes', 'Gestión de órdenes disponible pronto')}
        >
          <Ionicons name="receipt-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>Órdenes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Tipo de Orden', 'Selección de tipo disponible pronto')}
        >
          <Ionicons name="document-text-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>{orderType}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Cliente', 'Selección de cliente disponible pronto')}
        >
          <Ionicons name="person-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText} numberOfLines={1}>{customer}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quick Actions Row */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => Alert.alert('Cupones', 'Disponible pronto')}
        >
          <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
          <Text style={styles.quickActionText}>Cupones</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => Alert.alert('Ajustes', 'Disponible pronto')}
        >
          <Ionicons name="settings-outline" size={18} color={Colors.primary} />
          <Text style={styles.quickActionText}>Ajustes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => Alert.alert('Calculadora', 'Disponible pronto')}
        >
          <Ionicons name="calculator-outline" size={18} color={Colors.primary} />
          <Text style={styles.quickActionText}>Calculadora</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {isSearching && <ActivityIndicator size="small" color={Colors.primary} style={styles.iconButton} />}
        {!isSearching && (
          <>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="barcode-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        style={styles.categoriesContainer}
      />

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={isTablet ? 3 : 2}
        key={isTablet ? 'tablet' : 'mobile'}
        contentContainerStyle={styles.productsList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
          </View>
        }
      />

      {/* Floating Cart Button */}
      {totalItems > 0 && (
        <TouchableOpacity 
          style={styles.cartFloating}
          onPress={() => router.push('/cart')}
        >
          <View style={styles.cartFloatingContent}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
            <Ionicons name="cart" size={24} color={Colors.white} />
            <View style={styles.cartFloatingInfo}>
              <Text style={styles.cartFloatingLabel}>Ver Carrito</Text>
              <Text style={styles.cartFloatingTotal}>{formatCurrency(total)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Shift Modal */}
      <ShiftModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSuccess={handleShiftSuccess}
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  topActionsScroll: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionButtonWarning: {
    backgroundColor: Colors.warning,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  quickActionText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  iconButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  categoriesContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoriesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    marginRight: Spacing.sm,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  categoryTextSelected: {
    color: Colors.white,
  },
  productsList: {
    padding: Spacing.sm,
    paddingBottom: 100,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    margin: Spacing.xs,
    minWidth: isTablet ? 150 : 160,
    maxWidth: isTablet ? 200 : 180,
    ...Shadow.sm,
  },
  productImagePlaceholder: {
    width: '100%',
    height: isTablet ? 100 : 80,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  productInfo: {
    gap: Spacing.xs,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    minHeight: 36,
  },
  productPrice: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  productStock: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxl * 2,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
  cartFloating: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.lg,
  },
  cartFloatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cartBadge: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  cartFloatingInfo: {
    gap: Spacing.xs,
  },
  cartFloatingLabel: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  cartFloatingTotal: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});
