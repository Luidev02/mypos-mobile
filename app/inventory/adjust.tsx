import { ConfirmModal } from '@/components/ConfirmModal';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { extendedInventoryService, extendedProductService, warehouseService } from '@/services/extended';
import type { CreateInventoryAdjustmentRequest, InventoryAdjustmentType, ProductDetailed, Warehouse } from '@/types';
import { hasVariableStock, isWeighable, roundQuantity, unitShortLabel } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TYPE_OPTIONS: { value: InventoryAdjustmentType; label: string }[] = [
  { value: 'adjustment', label: '📊 Ajuste de Inventario' },
  { value: 'damage', label: '💔 Producto Dañado' },
  { value: 'return', label: '↩️ Devolución' },
];

export default function AdjustInventoryScreen() {
  const toast = useToast();
  const params = useLocalSearchParams<{ product_id?: string; warehouse_id?: string }>();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<InventoryAdjustmentType>('adjustment');
  const [sign, setSign] = useState<'+' | '-'>('+');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [wData, pData] = await Promise.all([
          warehouseService.getWarehouses(),
          extendedProductService.getProducts(),
        ]);
        setWarehouses(wData);
        setProducts(pData);

        setWarehouseId(
          params.warehouse_id ? String(params.warehouse_id) : wData.length > 0 ? String(wData[0].id) : ''
        );
        if (params.product_id) {
          setProductId(String(params.product_id));
        }
      } catch (e) {
        console.error('Error cargando datos para ajuste', e);
        toast.error('No se pudieron cargar bodegas/productos');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === productId);
  const isVariableStock = hasVariableStock(selectedProduct);
  const isWeighableProduct = isWeighable(selectedProduct);
  const unitLabel = unitShortLabel(selectedProduct);

  const validate = (): string | null => {
    if (!warehouseId) return 'Seleccione una bodega';
    if (!productId) return 'Seleccione un producto';
    if (!quantity || Number(quantity) <= 0) return 'Ingrese una cantidad válida';
    if (!notes.trim()) return 'Ingrese una nota';
    return null;
  };

  const handlePressSave = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const absQty = Math.abs(Number(quantity));
    const signedQty = sign === '-' ? -absQty : absQty;

    try {
      setIsSaving(true);
      const payload: CreateInventoryAdjustmentRequest = {
        warehouse_id: Number(warehouseId),
        product_id: Number(productId),
        quantity: isWeighableProduct ? roundQuantity(signedQty) : Math.trunc(signedQty),
        type,
        notes: notes.trim(),
      };
      await extendedInventoryService.adjustInventory(payload);
      setShowConfirm(false);
      toast.success('Ajuste de inventario realizado');
      router.back();
    } catch (e: any) {
      setShowConfirm(false);
      toast.error(e.message || 'No se pudo realizar el ajuste');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando datos..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Ajuste de Inventario</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>1. Selección</Text>

        <Text style={styles.label}>
          Bodega Afectada <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={warehouseId} onValueChange={(v) => setWarehouseId(String(v))}>
            <Picker.Item label="-- Seleccionar bodega --" value="" />
            {warehouses.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={String(w.id)} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>
          Producto <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={productId} onValueChange={(v) => setProductId(String(v))}>
            <Picker.Item label="-- Seleccionar producto --" value="" />
            {products.map((p) => (
              <Picker.Item
                key={p.id}
                label={`${p.name || p.title} (${p.sku})${p.stock_type === 'variable' ? ' 🔓' : ''}`}
                value={String(p.id)}
              />
            ))}
          </Picker>
        </View>
        {isVariableStock && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>🔓</Text>
            <Text style={styles.warningText}>
              <Text style={{ fontWeight: FontWeight.bold }}>Stock Variable:</Text> este producto permite stock
              negativo. Puedes ingresar cantidades que lleven el stock por debajo de 0.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>2. Detalles del Ajuste</Text>

        <Text style={styles.label}>
          Tipo de Movimiento <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={type} onValueChange={(v) => setType(v as InventoryAdjustmentType)}>
            {TYPE_OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>
          Cantidad {isWeighableProduct && <Text style={styles.hint}>({unitLabel})</Text>}{' '}
          <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={[styles.signButton, sign === '+' && styles.signButtonEntry]}
            onPress={() => setSign('+')}
          >
            <Ionicons name="add" size={20} color={sign === '+' ? Colors.white : '#10B981'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.signButton, sign === '-' && styles.signButtonExit]}
            onPress={() => setSign('-')}
          >
            <Ionicons name="remove" size={20} color={sign === '-' ? Colors.white : '#EF4444'} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.quantityInput]}
            placeholder="0"
            placeholderTextColor={Colors.textLight}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType={isWeighableProduct ? 'decimal-pad' : 'number-pad'}
          />
        </View>
        <Text style={styles.hint}>
          {isVariableStock
            ? 'Cantidad positiva para entrada, negativa para salida. Se permite stock negativo.'
            : 'Use entrada (+) para aumentar o salida (-) para reducir stock'}
          {isWeighableProduct && ' Admite decimales (ej. 12.5).'}
        </Text>

        <Text style={styles.label}>
          Notas Adicionales <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe el motivo del ajuste: conteo físico, merma, devolución, etc."
          placeholderTextColor={Colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, sign === '-' && styles.saveButtonExit]}
            onPress={handlePressSave}
          >
            <Text style={styles.saveButtonText}>
              {sign === '-' ? 'Confirmar Salida' : 'Confirmar Entrada'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showConfirm}
        title="Confirmar ajuste"
        message={`¿Confirmas ${sign === '-' ? 'la salida' : 'la entrada'} de ${quantity || 0} ${unitLabel} de "${
          selectedProduct?.name || selectedProduct?.title || ''
        }"?`}
        confirmText="Confirmar"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
        loading={isSaving}
        type="info"
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
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  warningIcon: {
    fontSize: FontSize.sm,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#92400E',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  signButtonEntry: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  signButtonExit: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
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
  quantityInput: {
    flex: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: '#10B981',
  },
  saveButtonExit: {
    backgroundColor: '#EF4444',
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
