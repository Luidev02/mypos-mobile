import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ProductImage } from '@/components/ProductImage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedInventoryService, extendedProductService } from '@/services/extended';
import type { ProductDetailed, ProductMovement, CreateInventoryAdjustmentRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<ProductDetailed | null>(null);
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'entry' | 'exit' | 'adjustment'>('adjustment');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
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
  };

  const handleOpenAdjustModal = (type: 'entry' | 'exit' | 'adjustment') => {
    console.log('Opening adjust modal with type:', type);
    setAdjustmentType(type);
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustmentNotes('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
    console.log('Saving adjustment:', {
      quantity: adjustmentQuantity,
      reason: adjustmentReason,
      type: adjustmentType
    });

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
        product_id: Number(id),
        warehouse_id: 1,
        quantity: adjustmentType === 'exit' ? -quantity : quantity,
        type: adjustmentType,
        reason: adjustmentReason,
        notes: adjustmentNotes || undefined,
      };

      console.log('Sending adjustment data:', adjustmentData);
      await extendedInventoryService.adjustInventory(adjustmentData);
      Alert.alert('Éxito', 'Ajuste de inventario realizado');
      setShowAdjustModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving adjustment:', error);
      Alert.alert('Error', error.message || 'No se pudo realizar el ajuste');
    }
  };

  const getStockStatus = () => {
    if (!product) return { status: 'good', color: '#10B981', label: 'Disponible' };
    
    const stock = product.quantity || product.stock || 0;
    const stockAlert = product.stock_alert || 10;

    if (stock === 0) {
      return { status: 'out', color: '#EF4444', label: 'Sin Stock' };
    } else if (stock <= stockAlert) {
      return { status: 'low', color: '#F59E0B', label: 'Stock Bajo' };
    }
    return { status: 'good', color: '#10B981', label: 'Disponible' };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return 'arrow-down-circle';
      case 'purchase':
        return 'arrow-up-circle';
      case 'adjustment':
        return 'settings';
      case 'transfer':
        return 'swap-horizontal';
      default:
        return 'ellipse';
    }
  };

  const getMovementColor = (type: string, quantity: number) => {
    if (type === 'sale' || quantity < 0) return '#EF4444';
    if (type === 'purchase' || quantity > 0) return '#10B981';
    return Colors.textSecondary;
  };

  const renderMovementItem = ({ item }: { item: ProductMovement }) => {
    const quantity = item.quantity || 0;
    const color = getMovementColor(item.type, quantity);

    return (
      <View style={styles.movementCard}>
        <View style={[styles.movementIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={getMovementIcon(item.type)} size={20} color={color} />
        </View>
        <View style={styles.movementInfo}>
          <Text style={styles.movementType}>{item.type}</Text>
          <Text style={styles.movementDate}>
            {new Date(item.created_at).toLocaleString('es-ES')}
          </Text>
          {item.reason && (
            <Text style={styles.movementReason}>{item.reason}</Text>
          )}
        </View>
        <View style={styles.movementQuantity}>
          <Text style={[styles.movementQuantityText, { color }]}>
            {quantity > 0 ? '+' : ''}{quantity}
          </Text>
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Product Info */}
        <View style={styles.productSection}>
          <ProductImage
            productId={product.id}
            style={styles.productImageLarge}
            placeholderColor={Colors.textSecondary}
            placeholderSize={48}
          />
          <View style={styles.productDetails}>
            <Text style={styles.productName}>{product.name}</Text>
            {product.sku && (
              <Text style={styles.productSku}>SKU: {product.sku}</Text>
            )}
            <View style={[styles.statusBadgeLarge, { backgroundColor: stockStatus.color + '20' }]}>
              <Text style={[styles.statusTextLarge, { color: stockStatus.color }]}>
                {stockStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Stock Actual</Text>
            <Text style={[styles.statValue, { color: stockStatus.color }]}>
              {product.quantity || product.stock || 0}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Stock Mínimo</Text>
            <Text style={styles.statValue}>{product.stock_alert || 'N/A'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Precio</Text>
            <Text style={styles.statValue}>${Number(product.price || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonEntry]}
            onPress={() => {
              console.log('Entry button pressed');
              handleOpenAdjustModal('entry');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color="#10B981" />
            <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonExit]}
            onPress={() => {
              console.log('Exit button pressed');
              handleOpenAdjustModal('exit');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove-circle" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Salida</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonAdjust]}
            onPress={() => {
              console.log('Adjustment button pressed');
              handleOpenAdjustModal('adjustment');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings" size={20} color={Colors.primary} />
            <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Ajustar</Text>
          </TouchableOpacity>
        </View>

        {/* Movements History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Movimientos</Text>
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

      {/* Adjustment Modal */}
      <Modal visible={showAdjustModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {adjustmentType === 'entry' ? 'Entrada de Stock' :
               adjustmentType === 'exit' ? 'Salida de Stock' : 'Ajuste de Inventario'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>
              Cantidad <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={Colors.textLight}
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
              placeholderTextColor={Colors.textLight}
              value={adjustmentReason}
              onChangeText={setAdjustmentReason}
            />

            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas adicionales (opcional)"
              placeholderTextColor={Colors.textLight}
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
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    ...Shadow.sm,
  },
  actionButtonEntry: {
    borderColor: '#10B981',
  },
  actionButtonExit: {
    borderColor: '#EF4444',
  },
  actionButtonAdjust: {
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
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
    textTransform: 'capitalize',
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
  movementQuantity: {
    alignItems: 'flex-end',
  },
  movementQuantityText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
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
});
