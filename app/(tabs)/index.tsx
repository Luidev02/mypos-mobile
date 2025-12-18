import BarcodeScanner from '@/components/BarcodeScanner';
import CalculatorModal from '@/components/CalculatorModal';
import { CategoryImage } from '@/components/CategoryImage';
import CloseShiftModal from '@/components/CloseShiftModal';
import CouponModal from '@/components/CouponModal';
import CustomerModal from '@/components/CustomerModal';
import OrdersModal from '@/components/OrdersModal';
import OrderTypeModal from '@/components/OrderTypeModal';
import { ProductImage } from '@/components/ProductImage';
import SettingsModal from '@/components/SettingsModal';
import ShiftModal from '@/components/ShiftModal';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSale } from '@/contexts/SaleContext';
import { posService } from '@/services';
import type { Category, Product, Sale, Shift } from '@/types';
import { formatCurrency, getStockColor } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
  const {
    customer,
    customerId,
    orderType,
    saleName,
    discount,
    couponId,
    setCustomer,
    setOrderType,
    setSaleName,
    setDiscount,
    clearDiscount,
    resetSaleData,
  } = useSale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  
  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

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

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // Buscar producto por código de barras
      const results = await posService.searchProducts(barcode);
      
      if (results.length === 0) {
        Alert.alert('Producto No Encontrado', `No se encontró ningún producto con el código: ${barcode}`);
        return;
      }

      // Si se encuentra exactamente un producto, agregarlo al carrito
      if (results.length === 1) {
        handleProductPress(results[0]);
      } else {
        // Si hay múltiples resultados, mostrarlos en la lista
        setProducts(results);
        setSelectedCategory(null);
        Alert.alert('Productos Encontrados', `Se encontraron ${results.length} productos`);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo buscar el producto');
    }
  };

  const handleShiftSuccess = async () => {
    try {
      const activeShift = await posService.getActiveShift();
      setShift(activeShift);
    } catch (error) {
      // Si no hay turno activo después del cierre, está bien
      setShift(null);
    }
  };

  const handleOpenShift = () => {
    // Si hay turno activo, mostrar modal de cierre
    // Si no hay turno, mostrar modal de apertura
    if (shift && shift.id) {
      setShowCloseShiftModal(true);
    } else {
      setShowShiftModal(true);
    }
  };

  const handlePay = () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'Agregue productos antes de pagar');
      return;
    }
    router.push('/cart');
  };

  const handlePause = async () => {
    if (items.length === 0) {
      Alert.alert('Carrito Vacío', 'No hay productos para pausar');
      return;
    }

    Alert.alert(
      'Pausar Venta',
      '¿Desea guardar esta venta para continuar después?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pausar',
          onPress: async () => {
            try {
              const orderNumber = `TEMP-${Date.now()}`;
              const taxAmount = subtotal * 0.19;
              const discountAmount = subtotal * (discount / 100);
              const totalAmount = subtotal + taxAmount - discountAmount;

              const pauseData = {
                customer_id: customerId,
                customer_name: customer,
                order_number: orderNumber,
                sale_type: orderType || '',
                coupon_id: couponId,
                discount_percentage: discount,
                subtotal: subtotal,
                discount: discountAmount,
                tax_total: taxAmount,
                total: totalAmount,
                products: items.map(item => ({
                  id: item.product_id,
                  price: item.unit_price,
                  quantity: item.quantity,
                  discount: item.discount || 0,
                })),
              };

              await posService.pauseOrder(pauseData);
              Alert.alert('Éxito', 'Venta pausada exitosamente');
              clearCart();
              resetSaleData();
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo pausar la venta');
            }
          },
        },
      ]
    );
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

  // Manejadores de los modales
  const handleSelectOrder = (order: Sale) => {
    // Cargar la orden en el carrito
    // TODO: Implementar carga de orden completa con items
    Alert.alert('Orden Cargada', `Orden ${order.invoice_number || order.folio} cargada`);
  };

  const handleSelectCustomer = (name: string, id: number) => {
    setCustomer(name, id);
  };

  const handleSelectOrderType = (type: string) => {
    const typeLabels: Record<string, string> = {
      'carry': 'Llevar',
      'delivery': 'Entrega',
      'dine_in': 'Comer Aquí',
    };
    setOrderType(typeLabels[type] || type);
  };

  const handleApplyCoupon = (discountValue: number, id: number, code: string) => {
    setDiscount(discountValue, id, code);
    Alert.alert('Cupón Aplicado', `Descuento de ${discountValue}% aplicado`);
  };

  const handleUpdateSettings = (name: string) => {
    setSaleName(name);
    Alert.alert('Configuración Guardada', `Nombre: ${name}`);
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
      <CategoryImage 
        categoryId={item.id}
        style={styles.categoryImage}
        placeholderSize={20}
        placeholderColor={selectedCategory === item.id ? '#fff' : '#94A3B8'}
      />
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
      <ProductImage 
        productId={item.id}
        style={styles.productImagePlaceholder}
        placeholderColor="#94A3B8"
      />
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
          onPress={() => router.push('/(tabs)/hub')}
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
          onPress={() => setShowOrdersModal(true)}
        >
          <Ionicons name="receipt-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>Órdenes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowOrderTypeModal(true)}
        >
          <Ionicons name="document-text-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText}>{orderType}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowCustomerModal(true)}
        >
          <Ionicons name="person-outline" size={16} color={Colors.white} />
          <Text style={styles.actionButtonText} numberOfLines={1}>{customer}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quick Actions Row */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setShowCouponModal(true)}
        >
          <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
          <Text style={styles.quickActionText}>Cupones</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Ionicons name="settings-outline" size={18} color={Colors.primary} />
          <Text style={styles.quickActionText}>Ajustes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setShowCalculatorModal(true)}
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
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowBarcodeScanner(true)}>
              <Ionicons name="barcode-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowBarcodeScanner(true)}>
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

      {/* Action Buttons Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarSummary}>
          <View style={styles.itemsCount}>
            <Ionicons name="cart-outline" size={20} color={Colors.text} />
            <Text style={styles.itemsCountText}>{totalItems} items</Text>
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionBarButton, styles.actionBarButtonSecondary]}
            onPress={handleClear}
            disabled={totalItems === 0}
          >
            <Ionicons name="trash-outline" size={20} color={totalItems === 0 ? Colors.textLight : Colors.error} />
            <Text style={[styles.actionBarButtonText, totalItems === 0 && styles.actionBarButtonTextDisabled]}>
              Limpiar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBarButton, styles.actionBarButtonSecondary]}
            onPress={handlePause}
            disabled={totalItems === 0}
          >
            <Ionicons name="pause-outline" size={20} color={totalItems === 0 ? Colors.textLight : Colors.warning} />
            <Text style={[styles.actionBarButtonText, totalItems === 0 && styles.actionBarButtonTextDisabled]}>
              Pausar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBarButton, styles.actionBarButtonPrimary]}
            onPress={handlePay}
            disabled={totalItems === 0}
          >
            <Ionicons name="card-outline" size={20} color={Colors.white} />
            <Text style={styles.actionBarButtonTextPrimary}>
              Procesar Pago
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shift Modal */}
      <ShiftModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSuccess={handleShiftSuccess}
      />

      {/* Close Shift Modal */}
      <CloseShiftModal
        visible={showCloseShiftModal}
        onClose={() => setShowCloseShiftModal(false)}
        onSuccess={handleShiftSuccess}
        activeShift={shift}
      />

      {/* Orders Modal */}
      <OrdersModal
        visible={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        onSelectOrder={handleSelectOrder}
      />

      {/* Customer Modal */}
      <CustomerModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        currentCustomer={customer}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Order Type Modal */}
      <OrderTypeModal
        visible={showOrderTypeModal}
        onClose={() => setShowOrderTypeModal(false)}
        currentType={orderType}
        onSelectType={handleSelectOrderType}
      />

      {/* Coupon Modal */}
      <CouponModal
        visible={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        onApplyCoupon={handleApplyCoupon}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSaleName={saleName}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Calculator Modal */}
      <CalculatorModal
        visible={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
        title="Escanear Código"
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
  categoryImage: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
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
    paddingBottom: Spacing.md,
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
  actionBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Shadow.lg,
  },
  actionBarSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  itemsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemsCountText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  totalLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  totalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionBarButtonSecondary: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBarButtonPrimary: {
    backgroundColor: Colors.primary,
    flex: 1.5,
  },
  actionBarButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  actionBarButtonTextDisabled: {
    color: Colors.textLight,
  },
  actionBarButtonTextPrimary: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
