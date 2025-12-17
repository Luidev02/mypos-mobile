import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { posService } from '@/services';
import type { CartItem, CreateSaleRequest, Shift } from '@/types';
import { calculateTax, calculateTotal, formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CartScreen() {
  const { user } = useAuth();
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoadingShift, setIsLoadingShift] = useState(true);

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
  const tax = calculateTax(subtotal, TAX_RATE);
  const total = calculateTotal(subtotal, TAX_RATE);
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(amountReceived || '0') - total) : 0;

  const handleQuantityChange = (productId: number, delta: number) => {
    const item = items.find(i => i.product_id === productId);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity > item.product.stock) {
        Alert.alert('Stock Insuficiente', `Solo hay ${item.product.stock} unidades disponibles`);
        return;
      }
      updateQuantity(productId, newQuantity);
    }
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
    if (items.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }

    // Validación de turno activo (igual que en web)
    if (!activeShift || !activeShift.id) {
      Alert.alert(
        'Turno Requerido',
        'Debes abrir un turno antes de procesar ventas. Ve a la pantalla de POS para abrir un turno.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a POS', onPress: () => router.replace('/(tabs)') }
        ]
      );
      return;
    }

    if (paymentMethod === 'cash' && (parseFloat(amountReceived || '0') < total)) {
      Alert.alert('Error', 'El monto recibido es menor al total');
      return;
    }

    setIsProcessing(true);
    try {
      // Estructura exacta del flujo web
      const saleData: CreateSaleRequest = {
        customer_id: 1, // Consumidor Final (igual que web)
        cash_register_id: activeShift.cash_register_id,
        shift_id: activeShift.id,
        warehouse_id: activeShift.warehouse_id,
        payment_method: paymentMethod,
        resolution_id: null, // Para facturación electrónica futura
        invoice_number: null,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.unit_price,
          tax_rate: 19, // 19% IVA Colombia (igual que web)
          discount: item.discount || 0,
          is_inventory_managed: true, // Siempre descontar del inventario
        })),
      };

      const response = await posService.createSale(saleData);
      const sale = response; // response.data ya viene procesado del service
      
      Alert.alert(
        'Venta Exitosa',
        `${sale.invoice_number || sale.folio || `Venta #${sale.id}`}\nTotal: ${formatCurrency(sale.total || sale.total_amount || 0)}${
          paymentMethod === 'cash' ? `\nCambio: ${formatCurrency(change)}` : ''
        }`,
        [
          { text: 'OK', onPress: () => {
            clearCart();
            setShowPaymentModal(false);
            router.back();
          }},
        ]
      );
    } catch (error: any) {
      console.error('Error al procesar venta:', error);
      Alert.alert(
        'Error al Procesar Venta',
        error.response?.data?.message || error.message || 'No se pudo procesar la venta. Verifica que el turno esté activo.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.unit_price)}</Text>
      </View>
      
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

      <View style={styles.itemRight}>
        <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
        <TouchableOpacity onPress={() => handleRemoveItem(item.product_id)}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoadingShift) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
      />

      <View style={styles.summary}>
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
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>IVA (19%):</Text>
          <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total:</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
        </View>

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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Método de Pago</Text>

            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentMethod,
                  paymentMethod === 'cash' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
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
                onPress={() => setPaymentMethod('transfer')}
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
                />
                {parseFloat(amountReceived || '0') >= total && (
                  <Text style={styles.changeText}>
                    Cambio: {formatCurrency(change)}
                  </Text>
                )}
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleProcessPayment}
                disabled={isProcessing}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
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
});
