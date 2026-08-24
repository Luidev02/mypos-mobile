import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSale } from '@/contexts/SaleContext';
import { posService } from '@/services';
import type { CartItem, CreateSaleRequest, Shift } from '@/types';
import { calculateTax, formatCurrency } from '@/utils/helpers';
import { canSellQuantity, formatQuantityWithUnit, isWeighable, roundQuantity, unitShortLabel } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { editWeight } = useLocalSearchParams<{ editWeight?: string }>();
  const { user } = useAuth();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { customer, customerId, orderType, saleName, discount, couponId, couponCode, resetSaleData } = useSale();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    checkActiveShift();
  }, []);

  const checkActiveShift = async () => {
    setIsLoadingShift(true);
    try {
      const shift = await posService.getActiveShift();
      if (shift && shift.id) {
        setActiveShift(shift);
      } else {
        setActiveShift(null);
      }
    } catch (error: any) {
      console.log('No hay turno activo:', error);
      setActiveShift(null);
    } finally {
      setIsLoadingShift(false);
    }
  };

  const TAX_RATE = 0.19; // 19% IVA
  const discountAmount = subtotal * (discount / 100);
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax = calculateTax(subtotalAfterDiscount, TAX_RATE);
  const total = subtotalAfterDiscount + tax;
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(amountReceived || '0') - total) : 0;

  const handleQuantityChange = (productId: number, delta: number) => {
    const item = items.find(i => i.product_id === productId);
    if (item) {
      const newQuantity = item.quantity + delta;
      // El stock variable puede quedar en negativo (misma regla que el backend).
      if (!canSellQuantity(item.product, newQuantity)) {
        Alert.alert(
          'Stock Insuficiente',
          `Solo hay ${formatQuantityWithUnit(item.product.stock ?? 0, item.product)} disponible(s).`
        );
        return;
      }
      updateQuantity(productId, newQuantity);
    }
  };

  // Productos pesables (kg, lb...) no se incrementan de a 1 — el cajero digita
  // el peso que marca la balanza. `editingWeightId` controla qué fila del
  // carrito tiene el campo de cantidad abierto para edición.
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [weightDraft, setWeightDraft] = useState('');

  const handleStartWeightEdit = (item: CartItem) => {
    setEditingWeightId(item.product_id);
    setWeightDraft(item.quantity ? String(item.quantity) : '');
  };

  // Al llegar desde el POS con un pesable recién agregado (quantity: 0),
  // abrimos el editor de peso automáticamente — equivalente móvil del
  // teclado numérico que el web abre solo vía `pendingWeightProductId`.
  useEffect(() => {
    if (!editWeight) return;
    const pending = items.find((i) => String(i.product_id) === String(editWeight));
    if (pending) {
      handleStartWeightEdit(pending);
    }
  }, [editWeight, items.length]);

  const handleCommitWeightEdit = (item: CartItem) => {
    setEditingWeightId(null);
    const parsed = roundQuantity(parseFloat(weightDraft.replace(',', '.')) || 0);
    if (parsed <= 0) {
      Alert.alert('Cantidad inválida', 'Ingresa un peso mayor que cero.');
      return;
    }
    if (!canSellQuantity(item.product, parsed)) {
      Alert.alert(
        'Stock Insuficiente',
        `Solo hay ${formatQuantityWithUnit(item.product.stock ?? 0, item.product)} disponible(s).`
      );
      return;
    }
    updateQuantity(item.product_id, parsed);
  };

  const handleRemoveItem = (productId: number) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Deseas eliminar este producto del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeItem(productId) },
      ]
    );
  };

  const handleProcessPayment = async () => {
    // Igual que `handlePay` del web (`Newsales.jsx:587`): evita doble envío
    // si el usuario alcanza a tocar "Confirmar" otra vez antes del re-render.
    if (isProcessing) return;

    console.log('🔄 Iniciando proceso de pago...');
    console.log('Items en carrito:', items.length);
    console.log('Método de pago:', paymentMethod);
    console.log('Total:', total);
    console.log('Monto recibido:', amountReceived);
    
    if (items.length === 0) {
      setErrorMessage({ title: 'Carrito Vacío', message: 'El carrito está vacío' });
      setShowErrorModal(true);
      return;
    }

    // Validación de turno activo (igual que en web)
    if (!activeShift || !activeShift.id) {
      console.log('❌ No hay turno activo');
      setErrorMessage({ 
        title: 'Turno Requerido', 
        message: 'Debes abrir un turno antes de procesar ventas. Ve a la pantalla de POS para abrir un turno.' 
      });
      setShowErrorModal(true);
      return;
    }

    if (paymentMethod === 'cash' && (parseFloat(amountReceived || '0') < total)) {
      console.log('❌ Monto insuficiente');
      setErrorMessage({ title: 'Monto Insuficiente', message: 'El monto recibido es menor al total' });
      setShowErrorModal(true);
      return;
    }

    // El tipo de orden es opcional — igual que el web (`Newsales.jsx` nunca
    // valida `infoS.type` antes de cobrar).

    // Bloquea el cobro si queda un pesable sin peso digitado (quantity: 0) —
    // equivalente al guard de `pendingWeightProductId` en `Newsales.jsx:561-565`.
    const sinPeso = items.find((item) => !(item.quantity > 0));
    if (sinPeso) {
      setErrorMessage({
        title: 'Falta indicar la cantidad',
        message: `Ingresa el peso/cantidad de "${sinPeso.product.name}" antes de cobrar.`,
      });
      setShowErrorModal(true);
      return;
    }

    // Validar stock antes de cobrar — los productos de stock variable se
    // omiten, igual que en el web y en el backend.
    const sinStock = items.find((item) => !canSellQuantity(item.product, item.quantity));
    if (sinStock) {
      console.log('❌ Stock insuficiente para', sinStock.product.name);
      setErrorMessage({
        title: 'Stock Insuficiente',
        message: `Solo hay ${formatQuantityWithUnit(
          sinStock.product.stock ?? 0,
          sinStock.product
        )} disponible(s) de "${sinStock.product.name}".`,
      });
      setShowErrorModal(true);
      return;
    }

    console.log('✅ Validaciones pasadas, procesando...');
    setIsProcessing(true);
    try {
      // Mapeo de sale_type a los valores que espera el backend
      const saleTypeMap: Record<string, string> = {
        'Llevar': 'carry',
        'Entrega': 'delivery',
      };

      // Estructura exacta del flujo web
      const saleData: CreateSaleRequest = {
        shift_id: activeShift.id,
        customer_id: customerId,
        customer_name: customer,
        sale_type: saleTypeMap[orderType] || 'carry',
        payment_method: paymentMethod,
        coupon_id: couponId,
        discount_percentage: discount,
        subtotal: subtotal,
        total: total,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived || '0') : total,
        change_amount: paymentMethod === 'cash' ? change : 0,
        products: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
        })),
      };

      console.log('📦 Datos de venta:', JSON.stringify(saleData, null, 2));
      console.log('🚀 Enviando petición al servidor...');
      
      const response = await posService.createSale(saleData);
      console.log('✅ Respuesta recibida:', response);

      const sale = response;

      setCompletedSale({
        ...sale,
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'cash' ? parseFloat(amountReceived || '0') : total,
        change_amount: change,
        // Copia de las líneas para el comprobante — el carrito se limpia al
        // cerrar el modal de éxito, no antes (igual que `resetPos()` del web,
        // que solo se llama al cerrar/imprimir, no al cobrar).
        items: items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      });

      console.log('✅ Venta completada, mostrando modal de éxito');

      // Actualizar el turno activo para reflejar las ventas
      await checkActiveShift();

      setShowPaymentModal(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ Error al procesar venta:', error);
      console.error('Error completo:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error al Procesar Venta',
        error.response?.data?.message || error.message || 'No se pudo procesar la venta. Verifica que el turno esté activo.'
      );
    } finally {
      setIsProcessing(false);
      console.log('🔄 isProcessing = false');
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    clearCart();
    resetSaleData();
    router.back();
  };

  const handleShareReceipt = async () => {
    if (!completedSale) return;
    const lines = [
      `Factura: ${completedSale.invoice_number || completedSale.folio || `Venta #${completedSale.id}`}`,
      ...(completedSale.items || []).map(
        (i: any) => `${i.quantity} x ${i.name} — ${formatCurrency(i.subtotal)}`
      ),
      '',
      `Total: ${formatCurrency(completedSale.total || completedSale.total_amount || 0)}`,
      `Método: ${completedSale.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}`,
    ];
    if (completedSale.payment_method === 'cash') {
      lines.push(`Recibido: ${formatCurrency(completedSale.amount_received)}`);
      lines.push(`Vuelto: ${formatCurrency(completedSale.change_amount)}`);
    }
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e) {
      // El usuario canceló el share sheet — no es un error a reportar.
    }
  };

  const handleViewDetail = () => {
    if (!completedSale?.id) return;
    handleCloseSuccessModal();
    router.push(`/sales/${completedSale.id}` as any);
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const weighable = isWeighable(item.product);
    const isEditingWeight = editingWeightId === item.product_id;

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemPrice}>
            {formatCurrency(item.unit_price)}
            {weighable ? `/${unitShortLabel(item.product)}` : ''}
          </Text>
        </View>

        {weighable ? (
          isEditingWeight ? (
            <TextInput
              style={styles.weightInput}
              value={weightDraft}
              onChangeText={setWeightDraft}
              onBlur={() => handleCommitWeightEdit(item)}
              onSubmitEditing={() => handleCommitWeightEdit(item)}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.weightDisplay}
              onPress={() => handleStartWeightEdit(item)}
            >
              <Text style={styles.weightText}>{formatQuantityWithUnit(item.quantity, item.product)}</Text>
              <Ionicons name="create-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )
        ) : (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.product_id, -1)}
            >
              <Ionicons name="remove" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(item.product_id, 1)}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.itemRight}>
          <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
          <TouchableOpacity onPress={() => handleRemoveItem(item.product_id)}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoadingShift) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrito</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Verificando turno activo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrito</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={Colors.textLight} />
          <Text style={styles.emptyText}>El carrito está vacío</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrito ({items.length})</Text>
          <TouchableOpacity onPress={clearCart}>
            <Ionicons name="trash-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.product_id.toString()}
          contentContainerStyle={styles.cartList}
          keyboardShouldPersistTaps="handled"
        />
        
        <View style={[styles.summary, { paddingBottom: Spacing.lg + insets.bottom }]}>
          {/* Información del turno activo */}
          {activeShift && (
            <View style={styles.shiftInfo}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <View style={styles.shiftInfoText}>
                <Text style={styles.shiftInfoLabel}>Turno Activo</Text>
                <Text style={styles.shiftInfoValue}>
                  {activeShift.cash_register_name || `Caja #${activeShift.cash_register_id}`}
                </Text>
              </View>
            </View>
          )}
          {!activeShift && (
            <View style={[styles.shiftInfo, styles.shiftInfoWarning]}>
              <Ionicons name="warning" size={20} color={Colors.warning} />
              <View style={styles.shiftInfoText}>
                <Text style={styles.shiftInfoLabel}>Sin Turno Activo</Text>
                <Text style={styles.shiftInfoValue}>Debes abrir un turno para vender</Text>
              </View>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Descuento ({discount}%):</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                -{formatCurrency(discountAmount)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA (19%):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total:</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
          </View>

          {/* Mostrar info de venta */}
          {(customer !== 'Consumidor Final' || orderType || saleName) && (
            <View style={styles.saleInfo}>
              {customer !== 'Consumidor Final' && (
                <Text style={styles.saleInfoText}>Cliente: {customer}</Text>
              )}
              {orderType && (
                <Text style={styles.saleInfoText}>Tipo: {orderType}</Text>
              )}
              {saleName && (
                <Text style={styles.saleInfoText}>Venta: {saleName}</Text>
              )}
              {couponCode && (
                <Text style={styles.saleInfoText}>Cupón: {couponCode}</Text>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.checkoutButton, !activeShift && styles.checkoutButtonDisabled]}
            onPress={() => setShowPaymentModal(true)}
            disabled={!activeShift}
          >
            <Text style={styles.checkoutButtonText}>
              {activeShift ? 'Procesar Pago' : 'Abre un Turno para Vender'}
            </Text>
          </TouchableOpacity>
        </View>

      {showPaymentModal && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showPaymentModal}
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Método de Pago</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethod,
                    paymentMethod === 'cash' && styles.paymentMethodActive,
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="cash-outline"
                    size={32}
                    color={paymentMethod === 'cash' ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'cash' && styles.paymentMethodTextActive,
                    ]}
                  >
                    Efectivo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethod,
                    paymentMethod === 'transfer' && styles.paymentMethodActive,
                  ]}
                  onPress={() => {
                    setPaymentMethod('transfer');
                    // Igual que el web: transferencia se paga por el valor exacto.
                    setAmountReceived(total.toString());
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="card-outline"
                    size={32}
                    color={paymentMethod === 'transfer' ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'transfer' && styles.paymentMethodTextActive,
                    ]}
                  >
                    Transferencia
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'cash' && (
                <>
                  <Text style={styles.inputLabel}>Monto Recibido:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="$0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                    autoFocus
                  />
                  
                  {/* Botones rápidos - igual que en web */}
                  <View style={styles.quickAmounts}>
                    <TouchableOpacity
                      style={styles.quickAmountButton}
                      onPress={() => setAmountReceived(total.toString())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>Exacto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAmountButton}
                      onPress={() => setAmountReceived((Math.ceil(total / 5000) * 5000).toString())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>+5k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAmountButton}
                      onPress={() => setAmountReceived((Math.ceil(total / 10000) * 10000).toString())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>+10k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAmountButton}
                      onPress={() => setAmountReceived((Math.ceil(total / 20000) * 20000).toString())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>+20k</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAmountButton}
                      onPress={() => setAmountReceived((Math.ceil(total / 50000) * 50000).toString())}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickAmountText}>+50k</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {parseFloat(amountReceived || '0') > 0 && (
                    <View style={[
                      styles.changeContainer,
                      parseFloat(amountReceived || '0') >= total ? styles.changePositive : styles.changeNegative
                    ]}>
                      <Text style={styles.changeLabel}>
                        {parseFloat(amountReceived || '0') >= total ? 'Vuelto a Entregar' : 'Falta'}
                      </Text>
                      <Text style={styles.changeAmount}>
                        {formatCurrency(Math.abs(parseFloat(amountReceived || '0') - total))}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleProcessPayment}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Modal de Éxito */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
            </View>
            
            <Text style={styles.successTitle}>¡Venta Exitosa!</Text>
            
            {completedSale && (
              <View style={styles.successInfo}>
                <View style={styles.successRow}>
                  <Text style={styles.successLabel}>Factura:</Text>
                  <Text style={styles.successValue}>
                    {completedSale.invoice_number || completedSale.folio || `Venta #${completedSale.id}`}
                  </Text>
                </View>
                
                <View style={styles.successRow}>
                  <Text style={styles.successLabel}>Total Pagado:</Text>
                  <Text style={styles.successTotal}>
                    {formatCurrency(completedSale.total || completedSale.total_amount || 0)}
                  </Text>
                </View>

                {completedSale.total_profit !== undefined && completedSale.total_profit !== null && (
                  <View style={styles.successRow}>
                    <Text style={styles.successLabel}>Ganancia:</Text>
                    <Text style={[styles.successValue, { color: Colors.success }]}>
                      {formatCurrency(completedSale.total_profit)}
                    </Text>
                  </View>
                )}

                {completedSale.payment_method === 'cash' && (
                  <>
                    <View style={styles.successRow}>
                      <Text style={styles.successLabel}>Recibido:</Text>
                      <Text style={styles.successValue}>
                        {formatCurrency(completedSale.amount_received)}
                      </Text>
                    </View>
                    <View style={styles.successRow}>
                      <Text style={styles.successLabel}>Vuelto:</Text>
                      <Text style={[styles.successValue, { color: Colors.success, fontSize: FontSize.xl }]}>
                        {formatCurrency(completedSale.change_amount)}
                      </Text>
                    </View>
                  </>
                )}
                
                <View style={styles.successRow}>
                  <Text style={styles.successLabel}>Método:</Text>
                  <Text style={styles.successValue}>
                    {completedSale.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.successButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonShare]}
                onPress={handleShareReceipt}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={18} color={Colors.primary} />
                <Text style={styles.modalButtonShareText}>Compartir</Text>
              </TouchableOpacity>
              {completedSale?.id && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonShare]}
                  onPress={handleViewDetail}
                  activeOpacity={0.7}
                >
                  <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                  <Text style={styles.modalButtonShareText}>Ver Detalle</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel, { marginTop: Spacing.sm }]}
              onPress={handleCloseSuccessModal}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonCancelText}>Cerrar (Nueva Venta)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Error */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModalContent}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color={Colors.error} />
            </View>
            
            <Text style={styles.errorTitle}>{errorMessage.title}</Text>
            <Text style={styles.errorMessage}>{errorMessage.message}</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonConfirmText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  cartList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  itemInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  itemPrice: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  weightText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  weightInput: {
    minWidth: 70,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  itemSubtotal: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  summary: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  summaryTotal: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  shiftInfoWarning: {
    backgroundColor: Colors.warningLight,
  },
  shiftInfoText: {
    flex: 1,
  },
  shiftInfoLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  shiftInfoValue: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  checkoutButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  checkoutButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textLight,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    padding: Spacing.lg,
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
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  paymentMethodActive: {
    backgroundColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  paymentMethodTextActive: {
    color: Colors.white,
  },
  inputLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
  },
  changeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  modalButtonConfirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  modalButtonShare: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight + '20',
  },
  modalButtonShareText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  saleInfo: {
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  saleInfoText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.primary,
  },
  changeContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  changePositive: {
    backgroundColor: Colors.successLight,
  },
  changeNegative: {
    backgroundColor: Colors.warningLight,
  },
  changeLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  changeAmount: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  successModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
    maxWidth: 400,
    width: '100%',
  },
  successIcon: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  successInfo: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  successValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  successTotal: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  successButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  errorModalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  errorIcon: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
});
