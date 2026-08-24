import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { extendedProductService, purchaseService, supplierService, warehouseService } from '@/services/extended';
import type { CreatePurchaseItem, CreateSupplierRequest, ProductDetailed, PurchaseStatus, Supplier, Warehouse } from '@/types';
import { isWeighable, roundQuantity, unitShortLabel } from '@/utils/units';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LineItem {
  key: string;
  product: ProductDetailed;
  quantity: string;
  unitCost: string;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewPurchaseScreen() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductDetailed[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayStr());
  const [status, setStatus] = useState<PurchaseStatus>('received');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  // El backend no tiene ninguna pantalla de administración de proveedores
  // (ni el web) — se agrega este alta rápida mínima porque, sin ella, el
  // picker quedaría vacío para cualquier tenant nuevo y el módulo de
  // compras sería inutilizable. Solo pide lo que el backend exige (nit, name).
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierNit, setNewSupplierNit] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [supplierData, warehouseData, productData] = await Promise.all([
          supplierService.getSuppliers(),
          warehouseService.getWarehouses(),
          extendedProductService.getProducts(),
        ]);
        setSuppliers(supplierData);
        setWarehouses(warehouseData);
        setProducts(productData);
        if (warehouseData.length > 0) setWarehouseId(String(warehouseData[0].id));
      } catch (e) {
        console.error('Error cargando datos para nueva compra:', e);
        toast.error('No se pudieron cargar proveedores/bodegas/productos');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter((p) => (p.name || p.title || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [productSearch, products]);

  const handleAddProduct = (product: ProductDetailed) => {
    if (lineItems.some((li) => li.product.id === product.id)) {
      toast.error('Este producto ya está en la lista');
      return;
    }
    setLineItems((prev) => [
      ...prev,
      {
        key: String(product.id),
        product,
        quantity: isWeighable(product) ? '' : '1',
        unitCost: product.cost ? String(product.cost) : '',
      },
    ]);
    setProductSearch('');
    setShowProductPicker(false);
  };

  const handleRemoveLine = (key: string) => {
    setLineItems((prev) => prev.filter((li) => li.key !== key));
  };

  const handleUpdateLine = (key: string, field: 'quantity' | 'unitCost', value: string) => {
    setLineItems((prev) => prev.map((li) => (li.key === key ? { ...li, [field]: value } : li)));
  };

  const total = lineItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantity.replace(',', '.')) || 0;
    const cost = parseFloat(li.unitCost.replace(',', '.')) || 0;
    return sum + qty * cost;
  }, 0);

  const handleCreateSupplier = async () => {
    if (!newSupplierNit.trim() || !newSupplierName.trim()) {
      toast.error('NIT y nombre son obligatorios');
      return;
    }
    try {
      setIsSavingSupplier(true);
      const payload: CreateSupplierRequest = {
        nit: newSupplierNit.trim(),
        name: newSupplierName.trim(),
      };
      const created = await supplierService.createSupplier(payload);
      setSuppliers((prev) => [...prev, created]);
      setSupplierId(String(created.id));
      setShowNewSupplier(false);
      setNewSupplierNit('');
      setNewSupplierName('');
      toast.success('Proveedor creado');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo crear el proveedor');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error('Selecciona un proveedor');
      return;
    }
    if (!warehouseId) {
      toast.error('Selecciona una bodega');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    const items: CreatePurchaseItem[] = [];
    for (const li of lineItems) {
      const quantity = roundQuantity(li.quantity.replace(',', '.'));
      const unitCost = parseFloat(li.unitCost.replace(',', '.')) || 0;
      if (quantity <= 0 || unitCost <= 0) {
        toast.error(`Cantidad y costo de "${li.product.name || li.product.title}" deben ser mayores a cero`);
        return;
      }
      items.push({ product_id: li.product.id, quantity, unit_cost: unitCost });
    }

    try {
      setIsSaving(true);
      await purchaseService.createPurchase({
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        invoice_number_supplier: invoiceNumber.trim() || undefined,
        purchase_date: purchaseDate,
        status,
        items,
      });
      toast.success('Compra registrada');
      router.back();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo registrar la compra');
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
        <Text style={styles.headerTitle}>Nueva Compra</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>
          Proveedor <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.supplierRow}>
          <View style={[styles.pickerWrapper, { flex: 1 }]}>
            <Picker selectedValue={supplierId} onValueChange={(v) => setSupplierId(String(v))}>
              <Picker.Item label="-- Seleccionar proveedor --" value="" />
              {suppliers.map((s) => (
                <Picker.Item key={s.id} label={`${s.name} - ${s.nit}`} value={String(s.id)} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity style={styles.newSupplierButton} onPress={() => setShowNewSupplier(true)}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>
          Bodega <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={warehouseId} onValueChange={(v) => setWarehouseId(String(v))}>
            <Picker.Item label="-- Seleccionar bodega --" value="" />
            {warehouses.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={String(w.id)} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Número de Factura del Proveedor</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: FAC-00123"
          placeholderTextColor={Colors.textLight}
          value={invoiceNumber}
          onChangeText={setInvoiceNumber}
        />

        <Text style={styles.label}>
          Fecha de Compra <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={Colors.textLight}
          value={purchaseDate}
          onChangeText={setPurchaseDate}
        />

        <Text style={styles.label}>Estado</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={status} onValueChange={(v) => setStatus(v as PurchaseStatus)}>
            <Picker.Item label="Recibida — suma el stock de inmediato" value="received" />
            <Picker.Item label="Ordenada — aún no llega a la bodega" value="ordered" />
          </Picker>
        </View>
        {status === 'received' && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Al guardar como "Recibida" se suma el stock de cada producto en la bodega
              seleccionada de inmediato y se genera el movimiento de inventario correspondiente.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Productos</Text>

        <TouchableOpacity style={styles.addProductButton} onPress={() => setShowProductPicker(true)}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addProductText}>Agregar Producto</Text>
        </TouchableOpacity>

        {lineItems.length === 0 ? (
          <Text style={styles.emptyItems}>No has agregado productos todavía.</Text>
        ) : (
          lineItems.map((li) => {
            const weighable = isWeighable(li.product);
            const qty = parseFloat(li.quantity.replace(',', '.')) || 0;
            const cost = parseFloat(li.unitCost.replace(',', '.')) || 0;
            return (
              <View key={li.key} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {li.product.name || li.product.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveLine(li.key)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.lineRow}>
                  <View style={styles.lineField}>
                    <Text style={styles.lineFieldLabel}>
                      Cantidad {weighable ? `(${unitShortLabel(li.product)})` : ''}
                    </Text>
                    <TextInput
                      style={styles.lineInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      value={li.quantity}
                      onChangeText={(v) => handleUpdateLine(li.key, 'quantity', v)}
                      keyboardType={weighable ? 'decimal-pad' : 'number-pad'}
                    />
                  </View>
                  <View style={styles.lineField}>
                    <Text style={styles.lineFieldLabel}>Costo Unitario</Text>
                    <TextInput
                      style={styles.lineInput}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      value={li.unitCost}
                      onChangeText={(v) => handleUpdateLine(li.key, 'unitCost', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.lineField}>
                    <Text style={styles.lineFieldLabel}>Subtotal</Text>
                    <Text style={styles.lineSubtotal}>${(qty * cost).toFixed(0)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {lineItems.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(0)}</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveButtonText}>Registrar Compra</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Selector de producto */}
      <Modal visible={showProductPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductPicker(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar Producto</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Buscar por nombre o SKU..."
              placeholderTextColor={Colors.textLight}
              value={productSearch}
              onChangeText={setProductSearch}
              autoFocus
            />
            <ScrollView style={{ marginTop: Spacing.md }} keyboardShouldPersistTaps="handled">
              {filteredProducts.map((p) => (
                <TouchableOpacity key={p.id} style={styles.productResult} onPress={() => handleAddProduct(p)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productResultName}>{p.name || p.title}</Text>
                    <Text style={styles.productResultSku}>SKU: {p.sku}</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Alta rápida de proveedor */}
      <Modal visible={showNewSupplier} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.newSupplierCard}>
            <Text style={styles.modalTitle}>Nuevo Proveedor</Text>
            <Text style={[styles.label, { marginTop: Spacing.md }]}>
              NIT <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="900123456-7"
              placeholderTextColor={Colors.textLight}
              value={newSupplierNit}
              onChangeText={setNewSupplierNit}
            />
            <Text style={styles.label}>
              Nombre <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Distribuidora S.A.S"
              placeholderTextColor={Colors.textLight}
              value={newSupplierName}
              onChangeText={setNewSupplierName}
            />
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewSupplier(false)}
                disabled={isSavingSupplier}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSavingSupplier && { opacity: 0.6 }]}
                onPress={handleCreateSupplier}
                disabled={isSavingSupplier}
              >
                {isSavingSupplier ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: Spacing.xl,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  supplierRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  newSupplierButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  warningText: {
    fontSize: FontSize.xs,
    color: '#92400E',
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
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addProductText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  emptyItems: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  lineCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  lineName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  lineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  lineField: {
    flex: 1,
  },
  lineFieldLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: 4,
  },
  lineInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  lineSubtotal: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    paddingVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  productResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productResultName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  productResultSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  newSupplierCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
});
