import BarcodeScanner from '@/components/BarcodeScanner';
import CalculatorModal from '@/components/CalculatorModal';
import { CategoryImage } from '@/components/CategoryImage';
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
import { companyService } from '@/services/extended';
import type { Category, Product, Sale, Shift } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { canSellQuantity, formatQuantityWithUnit, hasVariableStock, isWeighable } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

// Mismas medidas que la web (BtnProducts.jsx): cuadros de 100px en móvil y
// 135px en pantallas grandes, distribuidos con wrap y centrados.
const GRID_PADDING = 8;
const GRID_GAP = 8;
const TILE_SIZE = isTablet ? 135 : 100;

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, totalItems, subtotal, addItem, removeItem, updateQuantity, clearCart } = useCart();
  const {
    customer,
    customerId,
    orderType,
    saleName,
    discount,
    couponId,
    companyReportsDian,
    companyDisplayName,
    requiresElectronicInvoice,
    setCustomer,
    setOrderType,
    setSaleName,
    setDiscount,
    clearDiscount,
    resetSaleData,
    setDefaultCustomer,
    setCompanyInfo,
    setEmployeeName,
  } = useSale();

  // Réplica exacta de `getInvoiceType()` en Newsales.jsx.
  const invoiceType = !companyReportsDian
    ? { label: 'Sin Factura', icon: '📋', bg: '#F3F4F6', color: '#4B5563' }
    : requiresElectronicInvoice
    ? { label: 'Factura Electrónica', icon: '📄', bg: '#DBEAFE', color: '#1D4ED8' }
    : { label: 'Factura POS', icon: '🧾', bg: '#DCFCE7', color: '#15803D' };

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [shift, setShift] = useState<Shift | null>(null);
  
  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalMode, setShiftModalMode] = useState<'open' | 'close'>('open');
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

  // Contexto de empresa — igual que `Newsales.jsx`: resuelve el cliente por
  // defecto real ("Consumidor Final") en vez de asumir id=1, y si la empresa
  // reporta a la DIAN para decidir el badge de tipo de factura. El nombre de
  // empresa/cajero ya vienen en el usuario autenticado (no hace falta
  // refetch como en el web).
  useEffect(() => {
    if (user?.username) setEmployeeName(user.username);

    posService
      .getCustomers()
      .then((customers) => {
        const consumidorFinal = customers.find((c) => c.ident === '222222222222');
        if (consumidorFinal) {
          setDefaultCustomer(consumidorFinal.name, consumidorFinal.id);
        }
      })
      .catch((e) => console.error('Error resolviendo cliente por defecto:', e));

    companyService
      .getCompany()
      .then((company) => {
        setCompanyInfo(company.trade_name || company.name || user?.company_name || '', company.report_dian === 'YES');
      })
      .catch((e) => console.error('Error cargando configuración de empresa:', e));
  }, []);

  // Refrescar datos cuando la pantalla gana foco (después de volver del carrito)
  useFocusEffect(
    useCallback(() => {
      // Refrescar turno activo y productos al volver
      refreshPOSData();
    }, [])
  );

  const refreshPOSData = async () => {
    try {
      const activeShift = await posService.getActiveShift();
      setShift(activeShift);
      
      // Recargar productos si hay una categoría seleccionada
      if (selectedCategory) {
        const productsData = await posService.getCategoryProducts(selectedCategory.id);
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error refreshing POS data:', error);
    }
  };

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
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const activeShift = await posService.getActiveShift();
      setShift(activeShift);

      if (searchQuery.trim() !== '') {
        const results = await posService.searchProducts(searchQuery);
        setProducts(results);
      } else if (selectedCategory) {
        const productsData = await posService.getCategoryProducts(selectedCategory.id);
        setProducts(productsData);
      } else {
        const categoriesData = await posService.getCategories();
        setCategories(categoriesData);
      }
    } catch (error) {
      // Silencioso: el pull-to-refresh no debe interrumpir con alertas
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCategorySelect = async (category: Category) => {
    try {
      setSelectedCategory(category);
      setSearchQuery(''); // Clear search when selecting category
      const categoryProducts = await posService.getCategoryProducts(category.id);
      setProducts(categoryProducts);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    }
  };

  const handleGoHome = () => {
    setSelectedCategory(null);
    setSearchQuery('');
    setProducts([]);
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

    // Los pesables no se incrementan de a 1: el cajero debe digitar el peso
    // que marca la balanza. Se agrega en 0 y se navega al carrito, que abre
    // el editor de peso para esa línea — equivalente móvil del teclado
    // numérico que el web abre automáticamente (`pendingWeightProductId`).
    if (isWeighable(product)) {
      addItem(product, 0);
      router.push({ pathname: '/cart', params: { editWeight: product.id } } as any);
      return;
    }

    // El stock variable (carnicería, fruver…) puede quedar en negativo: el
    // backend lo permite explícitamente, así que aquí tampoco se bloquea.
    const inCart = items.find((i) => i.product_id === product.id)?.quantity ?? 0;
    if (!canSellQuantity(product, inCart + 1)) {
      const available = product.stock ?? 0;
      Alert.alert(
        'Stock insuficiente',
        available <= 0
          ? 'Este producto no tiene stock disponible'
          : `Solo hay ${formatQuantityWithUnit(available, product)} disponible(s).`
      );
      return;
    }

    addItem(product);
  };

  const handleBarcodeScanned = async (barcode: string) => {
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

    try {
      // `/api/pos/products/scan` — a diferencia de la búsqueda por texto,
      // interpreta etiquetas de balanza (EAN-13 de peso variable) y devuelve
      // el peso ya parseado en `quantity`.
      const scan = await posService.scanBarcode(barcode);

      if (scan.requiresWeightInput) {
        addItem(scan.product, 0);
        router.push({ pathname: '/cart', params: { editWeight: scan.product.id } } as any);
        return;
      }

      const inCart = items.find((i) => i.product_id === scan.product.id)?.quantity ?? 0;
      if (!canSellQuantity(scan.product, inCart + scan.quantity)) {
        const available = scan.product.stock ?? 0;
        Alert.alert(
          'Stock insuficiente',
          available <= 0
            ? 'Este producto no tiene stock disponible'
            : `Solo hay ${formatQuantityWithUnit(available, scan.product)} disponible(s).`
        );
        return;
      }

      addItem(scan.product, scan.quantity);
    } catch (error: any) {
      Alert.alert(
        'Producto No Encontrado',
        error.response?.data?.message || `No se encontró ningún producto con el código: ${barcode}`
      );
    }
  };

  const handleShiftSuccess = async () => {
    try {
      const activeShift = await posService.getActiveShift();
      setShift(activeShift);
      
      // Refrescar también los productos por si cambió el almacén
      await refreshPOSData();
    } catch (error) {
      // Si no hay turno activo después del cierre, está bien
      setShift(null);
    }
  };

  const handleOpenShift = () => {
    // Si hay turno activo, mostrar modal de cierre
    // Si no hay turno, mostrar modal de apertura
    if (shift && shift.id) {
      setShiftModalMode('close');
      setShowShiftModal(true);
    } else {
      setShiftModalMode('open');
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
    console.log('handleClear presionado, items:', items.length);
    if (items.length === 0) {
      console.log('Carrito vacío, no hay nada que limpiar');
      return;
    }
    console.log('Mostrando alerta de confirmación');
    Alert.alert(
      'Limpiar Carrito',
      '¿Está seguro de eliminar todos los productos y resetear los datos de venta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpiar', 
          style: 'destructive', 
          onPress: () => {
            console.log('Limpiando carrito y reseteando datos...');
            clearCart();
            resetSaleData();
            console.log('Carrito limpiado exitosamente');
            Alert.alert('Carrito Limpiado', 'Se eliminaron todos los productos y datos de venta');
          }
        },
      ]
    );
  };

  // Manejadores de los modales
  const handleSelectOrder = async (order: Sale): Promise<boolean> => {
    console.log('=== INICIO handleSelectOrder ===');
    console.log('Orden recibida:', JSON.stringify(order, null, 2));
    
    try {
      // Obtener el detalle completo de la orden con sus productos
      console.log('Obteniendo detalle de orden ID:', order.id);
      const orderDetail = await posService.getOrderDetail(order.id);
      console.log('Detalle obtenido:', JSON.stringify(orderDetail, null, 2));
      
      // Verificar que tenga productos
      const items = orderDetail.items || [];
      console.log('Cantidad de items:', items.length);
      
      if (items.length === 0) {
        console.warn('La orden no tiene productos');
        Alert.alert('Error', 'Esta orden no tiene productos asociados');
        return false;
      }

      // Limpiar el carrito actual y resetear datos de venta
      console.log('Limpiando carrito...');
      clearCart();
      console.log('Reseteando datos de venta...');
      resetSaleData();
      
      // Cargar los datos de la venta (cliente)
      if (orderDetail.customer_name && orderDetail.customer_id) {
        console.log('Estableciendo cliente:', orderDetail.customer_name);
        setCustomer(orderDetail.customer_name, orderDetail.customer_id);
      }
      
      // Cargar tipo de orden si existe
      if (orderDetail.sale_type) {
        console.log('Estableciendo tipo de orden:', orderDetail.sale_type);
        setOrderType(orderDetail.sale_type);
      }
      
      // Aplicar descuento/cupón si existe
      if (orderDetail.discount && orderDetail.discount > 0) {
        console.log('Aplicando descuento:', orderDetail.discount);
        setDiscount(
          orderDetail.discount,
          orderDetail.coupon_id || null,
          ''
        );
      }

      // Cargar cada producto en el carrito
      console.log('Cargando productos al carrito...');
      let productosAgregados = 0;
      
      for (const item of items) {
        console.log(`Procesando producto ${item.product_id}, cantidad: ${item.quantity}`);
        
        try {
          // Intentar obtener el producto completo
          const fullProduct = await posService.getProductById(item.product_id);
          console.log('Producto completo obtenido:', fullProduct.name);
          addItem(fullProduct, item.quantity);
          productosAgregados++;
        } catch (prodError) {
          // Si no se puede obtener el producto completo, usar datos básicos del item
          console.warn(`No se pudo obtener producto ${item.product_id}, usando datos básicos`, prodError);
          const basicProduct: Product = {
            id: item.product_id,
            sku: '',
            name: `Producto #${item.product_id}`,
            price: item.price,
            cost: 0,
            tax_id: 0,
            stock: 999,
            image_url: undefined,
            category_id: 0,
            is_active: true,
          };
          addItem(basicProduct, item.quantity);
          productosAgregados++;
        }
      }

      console.log(`Total de productos agregados al carrito: ${productosAgregados}`);

      // Eliminar la orden del backend después de cargarla exitosamente
      console.log('Eliminando orden del backend...');
      await posService.deleteOrder(order.id);
      console.log('Orden eliminada exitosamente');
      
      // Cerrar el modal
      console.log('Cerrando modal...');
      setShowOrdersModal(false);
      
      // Mostrar mensaje de éxito
      setTimeout(() => {
        Alert.alert(
          'Orden Cargada',
          `Se cargaron ${productosAgregados} productos de la orden ${orderDetail.invoice_number || orderDetail.folio || `#${order.id}`}`
        );
      }, 300);
      
      console.log('=== FIN handleSelectOrder - ÉXITO ===');
      return true;
      
    } catch (error: any) {
      console.error('=== ERROR en handleSelectOrder ===');
      console.error('Error completo:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      Alert.alert(
        'Error',
        'No se pudo cargar la orden: ' + (error.response?.data?.message || error.message || 'Error desconocido')
      );
      
      console.log('=== FIN handleSelectOrder - ERROR ===');
      return false;
    }
  };

  const handleSelectCustomer = (name: string, id: number, requiresElectronicInvoice?: boolean) => {
    console.log('handleSelectCustomer llamado:', name, id);
    setCustomer(name, id, requiresElectronicInvoice);
    console.log('Cliente actualizado');
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

  // Igual que en el frontend web: una sola grilla de cuadros que muestra
  // categorías en "Inicio" y, al entrar a una, sus productos en el mismo lugar.
  const viewMode: 'categories' | 'products' | 'search' =
    searchQuery.trim() !== '' ? 'search' : selectedCategory ? 'products' : 'categories';
  const gridItems: Array<Category | Product> = viewMode === 'categories' ? categories : products;

  // Tile igual al de la web (BtnProducts.jsx): cuadro con la imagen a pantalla
  // completa y una franja blanca semitransparente abajo con el nombre.
  const renderGridTile = (item: Category | Product) => {
    const isCategory = viewMode === 'categories';
    const product = isCategory ? null : (item as Product);
    const isVariable = hasVariableStock(product);
    // Solo se marca "sin stock" a los productos de stock fijo: los de stock
    // variable se venden aunque queden en negativo (misma regla del backend).
    const outOfStock = !!product && !isVariable && (product.stock ?? 0) <= 0;

    return (
      <TouchableOpacity
        key={`${isCategory ? 'cat' : 'prod'}-${item.id}`}
        style={[styles.tile, outOfStock && styles.tileDisabled]}
        activeOpacity={0.75}
        disabled={outOfStock}
        onPress={() =>
          isCategory ? handleCategorySelect(item as Category) : handleProductPress(product!)
        }
      >
        {isCategory ? (
          <CategoryImage categoryId={item.id} style={styles.tileImage} placeholderColor="#CBD5E1" />
        ) : (
          <ProductImage productId={item.id} style={styles.tileImage} placeholderColor="#CBD5E1" />
        )}
        {/* Indicador de stock variable — equivale al 🔓 de la web */}
        {isVariable && (
          <View style={styles.tileBadgeVariable}>
            <Text style={styles.tileBadgeText}>🔓</Text>
          </View>
        )}
        {outOfStock && (
          <View style={styles.tileBadge}>
            <Text style={styles.tileBadgeText}>Sin stock</Text>
          </View>
        )}
        <View style={styles.tileLabel}>
          <Text style={styles.tileLabelText} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Punto de Venta</Text>
          {!!companyDisplayName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{companyDisplayName}</Text>
          )}
        </View>
        <View style={[styles.invoiceBadge, { backgroundColor: invoiceType.bg }]}>
          <Text style={[styles.invoiceBadgeText, { color: invoiceType.color }]} numberOfLines={1}>
            {invoiceType.icon} {invoiceType.label}
          </Text>
        </View>
      </View>

      {/* Barra de acciones — misma estructura que la web:
          fila 1 = Turno / Órdenes / Tipo / Cliente, fila 2 = Cupones / Ajustes / Calculadora */}
      <View style={styles.toolbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.btnRowScroll}
          contentContainerStyle={styles.btnRow}
        >
          {/* BtnShift — tarjeta con icono arriba y etiqueta abajo */}
          <TouchableOpacity
            style={[styles.shiftBtn, shift ? styles.shiftBtnActive : styles.shiftBtnInactive]}
            onPress={handleOpenShift}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time-outline"
              size={28}
              color={shift ? Colors.footer : '#6B7280'}
            />
            <Text style={[styles.shiftBtnText, { color: shift ? Colors.footer : '#4B5563' }]}>
              {shift ? 'Turno Activo' : 'Sin Turno'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowOrdersModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Órdenes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowOrderTypeModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText} numberOfLines={1}>{orderType || 'Tipo de orden'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowCustomerModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText} numberOfLines={1}>{customer || 'Cliente'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.btnRowSecondary}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowCouponModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>
              {discount > 0 ? `Cupón ${discount}%` : 'Cupones'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowSettingsModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>Ajustes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setShowCalculatorModal(true)} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>Calculadora</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity style={styles.iconButton} onPress={handleGoHome}>
              <Ionicons name="close-circle" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowBarcodeScanner(true)}>
              <Ionicons name="scan-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Breadcrumb — igual que "Inicio - Categoría" / "Inicio - Búsqueda" en la web */}
      <View style={styles.breadcrumb}>
        <TouchableOpacity
          onPress={handleGoHome}
          disabled={viewMode === 'categories'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.breadcrumbHome}>Inicio</Text>
        </TouchableOpacity>
        {viewMode === 'search' && (
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
            {' - '}Búsqueda: "{searchQuery}"
          </Text>
        )}
        {viewMode === 'products' && selectedCategory && (
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
            {' - '}{selectedCategory.name}
          </Text>
        )}
      </View>

      {/* Grilla única de categorías/productos — misma forma que en la web */}
      <ScrollView
        style={styles.gridScroll}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {gridItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>
              {viewMode === 'search'
                ? 'No se encontraron productos'
                : viewMode === 'products'
                ? 'No hay productos en esta categoría'
                : 'No hay categorías disponibles'}
            </Text>
          </View>
        ) : (
          gridItems.map((item) => renderGridTile(item))
        )}
      </ScrollView>

      {/* Action Buttons Bar */}
      <View style={[styles.actionBar, { paddingBottom: Spacing.md + insets.bottom }]}>
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
            onPress={() => {
              console.log('Botón limpiar presionado');
              handleClear();
            }}
            disabled={totalItems === 0}
            activeOpacity={0.7}
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
        mode={shiftModalMode}
        activeShift={shift}
        onClose={() => setShowShiftModal(false)}
        onSuccess={handleShiftSuccess}
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
    backgroundColor: Colors.primary,
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
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  invoiceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    maxWidth: 150,
  },
  invoiceBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  // ─── Barra de herramientas ────────────────────────────────────────────────
  // ─── Barra de acciones (equivalente a la barra superior de la web) ────────
  toolbar: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  btnRowScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  // BtnShift: h-[65px] w-[100px] border-2 rounded-lg, icono + etiqueta
  shiftBtn: {
    height: 65,
    width: 100,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  shiftBtnActive: {
    backgroundColor: '#EDE4DD', // brand-surface
    borderColor: Colors.footer, // brand
  },
  shiftBtnInactive: {
    backgroundColor: '#F3F4F6', // gray-100
    borderColor: '#9CA3AF', // gray-400
  },
  shiftBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  // Botones marrones: bg-brand-dark text-white py-2 px-10 rounded-lg
  btnPrimary: {
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    maxWidth: 200,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  // Fila 2: bg-[#E5E7EB] text-black py-3 px-5 rounded-lg
  btnRowSecondary: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#000000',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: '#D4C4B0', // border-[#D4C4B0] de la web
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    color: '#3d2713',
  },
  iconButton: {
    paddingLeft: Spacing.sm,
  },

  // ─── Breadcrumb: "Inicio - Categoría" en gris, igual que la web ───────────
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
  },
  breadcrumbHome: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#8A8A8A',
  },
  breadcrumbCurrent: {
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#6B4423',
  },

  // ─── Grilla: tiles cuadrados con etiqueta superpuesta (BtnProducts.jsx) ───
  gridScroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'flex-start',
    gap: GRID_GAP,
    paddingHorizontal: GRID_PADDING,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 2,
    borderColor: '#E5E7EB', // border-gray-200
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.white,
  },
  tileDisabled: {
    opacity: 0.55,
  },
  tileImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  tileLabel: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tileLabelText: {
    fontSize: FontSize.xs,
    color: '#111827', // text-gray-900
    textAlign: 'center',
  },
  tileBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  // Stock variable: mismo lugar que el 🔓 de la web (arriba a la derecha)
  tileBadgeVariable: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 10,
    backgroundColor: '#FBBF24', // amber-400, igual que la web
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tileBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  emptyContainer: {
    width: '100%',
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
