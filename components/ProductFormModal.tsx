import BarcodeScanner from '@/components/BarcodeScanner';
import { ProductImage } from '@/components/ProductImage';
import { Colors } from '@/constants/theme';
import {
    Category,
    CreateProductRequest,
    MeasurementUnit,
    ProductDetailed,
    Tax,
    UpdateProductRequest,
} from '@/types';
import { UNIT_MEASURE_UNIDAD_ID, unitShortLabel } from '@/utils/units';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ProductFormModalProps {
  visible: boolean;
  product?: ProductDetailed;
  categories: Category[];
  taxes: Tax[];
  units: MeasurementUnit[];
  onClose: () => void;
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
}

/** Genera un SKU sugerido a partir del nombre — puerto de `products/form.jsx`. */
function generateSkuFromName(name: string): string {
  if (!name || !name.trim()) return '';
  const clean = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const prefix = words.slice(0, 3).map((w) => w.slice(0, 3)).join('');
  const suffix = String(Date.now()).slice(-4);
  return `${prefix}-${suffix}`;
}

const emptyForm = {
  title: '',
  sku: '',
  description: '',
  category_id: 0,
  tax_id: 0,
  cost: '',
  price: '',
  discount: '',
  stock_alert: '',
  barcode: '',
  unit_measure_id: UNIT_MEASURE_UNIDAD_ID,
  status: 'active' as 'active' | 'inactive',
  is_inventory_managed: true,
  stock_type: 'fixed' as 'fixed' | 'variable',
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  product,
  categories,
  taxes,
  units,
  onClose,
  onSubmit,
}) => {
  const isEdit = !!product;
  const [formData, setFormData] = useState(emptyForm);
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skuManuallySet, setSkuManuallySet] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (product) {
      setFormData({
        title: product.name || product.title || '',
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category_id || categories[0]?.id || 0,
        tax_id: product.tax_id || taxes[0]?.id || 0,
        cost: product.cost?.toString() || '',
        price: product.price?.toString() || '',
        discount: product.discount?.toString() || '',
        stock_alert: product.stock_alert?.toString() || '',
        barcode: product.barcode || '',
        unit_measure_id: product.unit_measure_id || UNIT_MEASURE_UNIDAD_ID,
        status: (product.status as 'active' | 'inactive') || 'active',
        is_inventory_managed: product.is_inventory_managed ?? true,
        stock_type: (product.stock_type as 'fixed' | 'variable') || 'fixed',
      });
      setImagePreview(product.image_url || product.image || '');
      setSkuManuallySet(true); // en edición el SKU no se autogenera
    } else {
      setFormData({
        ...emptyForm,
        category_id: categories[0]?.id || 0,
        tax_id: taxes[0]?.id || 0,
      });
      setImagePreview('');
      setSkuManuallySet(false);
    }
    setImage(null);
    setError('');
  }, [visible, product, categories, taxes]);

  const selectedUnit = units.find((u) => u.id === formData.unit_measure_id);
  const isWeighableForm = !!selectedUnit && selectedUnit.id !== UNIT_MEASURE_UNIDAD_ID;
  const selectedUnitShort = unitShortLabel({
    unit_measure_id: selectedUnit?.id,
    unit_measure_code: selectedUnit?.code,
    unit_measure_name: selectedUnit?.name,
  });

  const handleTitleChange = (text: string) => {
    setFormData((prev) => {
      const next = { ...prev, title: text };
      if (!isEdit && !skuManuallySet) {
        next.sku = generateSkuFromName(text);
      }
      return next;
    });
  };

  const handleRegenerateSku = () => {
    setSkuManuallySet(false);
    setFormData((prev) => ({ ...prev, sku: generateSkuFromName(prev.title) }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
      setImagePreview(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.sku.trim()) {
      setError('Nombre y SKU son obligatorios');
      return;
    }
    if (!formData.category_id) {
      setError('Selecciona una categoría');
      return;
    }
    if (!formData.tax_id) {
      setError('Selecciona un impuesto');
      return;
    }
    if (!formData.price.trim()) {
      setError('El precio de venta es obligatorio');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data: CreateProductRequest = {
        sku: formData.sku.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category_id: formData.category_id,
        tax_id: formData.tax_id,
        cost: parseFloat(formData.cost) || 0,
        price: parseFloat(formData.price) || 0,
        discount: parseFloat(formData.discount) || 0,
        stock_alert: parseInt(formData.stock_alert, 10) || 1,
        barcode: formData.barcode.trim() || undefined,
        unit_measure_id: formData.unit_measure_id,
        status: formData.status,
        is_inventory_managed: formData.is_inventory_managed,
        stock_type: formData.is_inventory_managed ? formData.stock_type : 'fixed',
      };

      if (image) {
        (data as any).image = image;
      }

      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Nombre + SKU */}
          <View style={styles.field}>
            <Text style={styles.label}>Nombre del Producto *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={handleTitleChange}
              placeholder="Ej: Coca Cola 350ml"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>
              Código SKU *
              {!isEdit && !skuManuallySet && formData.sku ? ' (auto-generado)' : ''}
            </Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }, isEdit && styles.inputDisabled]}
                value={formData.sku}
                onChangeText={(text) => {
                  setSkuManuallySet(true);
                  setFormData((prev) => ({ ...prev, sku: text }));
                }}
                editable={!isEdit}
                placeholder="Ej: COC-1234"
                placeholderTextColor={Colors.textSecondary}
              />
              {!isEdit && (
                <TouchableOpacity style={styles.iconButton} onPress={handleRegenerateSku}>
                  <Ionicons name="refresh" size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.field}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData((p) => ({ ...p, description: text }))}
              placeholder="Descripción del producto"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Categoría y impuesto */}
          <View style={styles.field}>
            <Text style={styles.label}>Categoría *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category_id}
                onValueChange={(value) => setFormData((p) => ({ ...p, category_id: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar categoría" value={0} />
                {categories.map((cat) => (
                  <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Impuesto *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.tax_id}
                onValueChange={(value) => setFormData((p) => ({ ...p, tax_id: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar impuesto" value={0} />
                {taxes.map((tax) => (
                  <Picker.Item key={tax.id} label={`${tax.name} (${tax.rate}%)`} value={tax.id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Costo y precio */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Costo</Text>
              <TextInput
                style={styles.input}
                value={formData.cost}
                onChangeText={(text) => setFormData((p) => ({ ...p, cost: text }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>
                Precio Venta{isWeighableForm ? ` (por ${selectedUnitShort})` : ''} *
              </Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData((p) => ({ ...p, price: text }))}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          {isWeighableForm && (
            <Text style={styles.hint}>
              Este producto se vende por peso: el precio es por {selectedUnit?.name?.toLowerCase()}.
            </Text>
          )}

          {/* Unidad de medida */}
          <View style={styles.field}>
            <Text style={styles.label}>Unidad de Medida</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.unit_measure_id}
                onValueChange={(value) => setFormData((p) => ({ ...p, unit_measure_id: value }))}
                style={styles.picker}
              >
                {units.length === 0 && <Picker.Item label="Unidad" value={UNIT_MEASURE_UNIDAD_ID} />}
                {units.map((u) => (
                  <Picker.Item key={u.id} label={u.name} value={u.id} />
                ))}
              </Picker>
            </View>
            <Text style={styles.hint}>
              {isWeighableForm
                ? 'Permite vender cantidades con decimales (ej. 0.23 kg) y leer etiquetas de balanza.'
                : 'Los productos en "Unidad" se venden en cantidades enteras. Elija Kilogramo o Libra para carnes, frutas y verduras.'}
            </Text>
          </View>

          {/* Alerta de stock y descuento */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Alerta de Stock</Text>
              <TextInput
                style={styles.input}
                value={formData.stock_alert}
                onChangeText={(text) => setFormData((p) => ({ ...p, stock_alert: text }))}
                placeholder="5"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Descuento (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.discount}
                onChangeText={(text) => setFormData((p) => ({ ...p, discount: text }))}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Código de barras */}
          <View style={styles.field}>
            <Text style={styles.label}>Código de Barras</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formData.barcode}
                onChangeText={(text) => setFormData((p) => ({ ...p, barcode: text }))}
                placeholder="Escribe o escanea"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
                <Ionicons name="camera" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            {isWeighableForm && (
              <Text style={styles.hintAmber}>
                ⚖️ Producto de balanza: registra el código interno (prefijo + PLU), no la etiqueta
                completa impresa, que incluye el peso y cambia en cada pesada.
              </Text>
            )}
          </View>

          {/* Imagen */}
          <View style={styles.field}>
            <Text style={styles.label}>Imagen del Producto</Text>
            <View style={styles.imageRow}>
              {image ? (
                <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
              ) : product?.id ? (
                <ProductImage
                  productId={product.id}
                  style={styles.imagePreview}
                  placeholderColor={Colors.textSecondary}
                  placeholderSize={32}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={Colors.textSecondary} />
                </View>
              )}
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={18} color={Colors.white} />
                <Text style={styles.imageButtonText}>Cambiar Imagen</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Estado y gestión de inventario */}
          <View style={styles.field}>
            <Text style={styles.label}>Estado del Producto</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.status}
                onValueChange={(value) => setFormData((p) => ({ ...p, status: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Activo" value="active" />
                <Picker.Item label="Inactivo" value="inactive" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() =>
              setFormData((p) => ({ ...p, is_inventory_managed: !p.is_inventory_managed }))
            }
          >
            <Text style={styles.switchLabel}>Gestionar Inventario</Text>
            <View style={[styles.switch, formData.is_inventory_managed && styles.switchActive]}>
              <View
                style={[styles.switchThumb, formData.is_inventory_managed && styles.switchThumbActive]}
              />
            </View>
          </TouchableOpacity>

          {/* Tipo de control de stock */}
          {formData.is_inventory_managed && (
            <View style={styles.field}>
              <Text style={styles.label}>Tipo de Control de Stock</Text>
              <TouchableOpacity
                style={[
                  styles.stockTypeOption,
                  formData.stock_type === 'fixed' && styles.stockTypeOptionActive,
                ]}
                onPress={() => setFormData((p) => ({ ...p, stock_type: 'fixed' }))}
              >
                <Ionicons
                  name={formData.stock_type === 'fixed' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={Colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockTypeTitle}>🔒 Stock Fijo</Text>
                  <Text style={styles.stockTypeSubtitle}>
                    Bloquea la venta cuando no hay stock disponible. Ideal para productos con
                    unidades exactas.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stockTypeOption,
                  formData.stock_type === 'variable' && styles.stockTypeOptionActiveAmber,
                ]}
                onPress={() => setFormData((p) => ({ ...p, stock_type: 'variable' }))}
              >
                <Ionicons
                  name={formData.stock_type === 'variable' ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={Colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockTypeTitle}>🔓 Stock Variable</Text>
                  <Text style={styles.stockTypeSubtitle}>
                    Permite ventas aunque el stock llegue a 0 o negativo. Ideal para carnicerías y
                    productos derivados.
                  </Text>
                </View>
              </TouchableOpacity>

              {formData.stock_type === 'variable' && (
                <Text style={styles.hintAmber}>
                  ⚠️ Modo variable activo: este producto puede venderse en negativo. Realiza
                  ajustes de inventario periódicamente para mantener el control.
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading || !formData.title.trim() || !formData.sku.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>{isEdit ? 'Actualizar Producto' : 'Crear Producto'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onBarcodeScanned={(code) => {
          setFormData((p) => ({ ...p, barcode: code }));
          setShowScanner(false);
        }}
        title="Escanear Código"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  field: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -12,
    marginBottom: 20,
  },
  hintAmber: {
    fontSize: 12,
    color: '#A16207',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputDisabled: {
    backgroundColor: Colors.background,
    color: Colors.textSecondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  scanButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePreview: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  stockTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  stockTypeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FDF8F8',
  },
  stockTypeOptionActiveAmber: {
    borderColor: Colors.warning,
    backgroundColor: '#FFFBEB',
  },
  stockTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  stockTypeSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
