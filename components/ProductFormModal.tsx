import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ProductDetailed, CreateProductRequest, UpdateProductRequest, Category, Tax } from '@/types';
import { ProductImage } from '@/components/ProductImage';

interface ProductFormModalProps {
  visible: boolean;
  product?: ProductDetailed;
  categories: Category[];
  taxes: Tax[];
  onClose: () => void;
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  visible,
  product,
  categories,
  taxes,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category_id: product?.category_id || categories[0]?.id || 0,
    price: product?.price?.toString() || '',
    cost: product?.cost?.toString() || '',
    stock: product?.stock?.toString() || '0',
    min_stock: product?.min_stock?.toString() || '0',
    tax_id: product?.tax_id || taxes[0]?.id || 0,
    description: product?.description || '',
    is_active: product?.is_active ?? true,
    is_inventory_managed: product?.is_inventory_managed ?? true,
  });
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || '');
  const [loading, setLoading] = useState(false);

  // Reset form when product changes or modal opens/closes
  useEffect(() => {
    if (visible) {
      if (product) {
        // Editing existing product
        const productName = product.name || product.title || '';
        const productImage = product.image_url || product.image || '';
        
        setFormData({
          name: productName,
          sku: product.sku || '',
          barcode: product.barcode || '',
          category_id: product.category_id || categories[0]?.id || 0,
          price: product.price?.toString() || '',
          cost: product.cost?.toString() || '',
          stock: product.stock?.toString() || '0',
          min_stock: product.min_stock?.toString() || '0',
          tax_id: product.tax_id || taxes[0]?.id || 0,
          description: product.description || '',
          is_active: product.is_active ?? true,
          is_inventory_managed: product.is_inventory_managed ?? true,
        });
        setImagePreview(productImage);
        setImage(null);
      } else {
        // Creating new product
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          category_id: categories[0]?.id || 0,
          price: '',
          cost: '',
          stock: '0',
          min_stock: '0',
          tax_id: taxes[0]?.id || 0,
          description: '',
          is_active: true,
          is_inventory_managed: true,
        });
        setImagePreview('');
        setImage(null);
      }
    }
  }, [visible, product, categories, taxes]);

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
    if (!formData.name.trim() || !formData.sku.trim()) return;

    setLoading(true);
    try {
      const data: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || undefined,
        category_id: formData.category_id,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        tax_id: formData.tax_id,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
        is_inventory_managed: formData.is_inventory_managed,
      };

      // Si hay imagen seleccionada, agregarla al objeto data
      if (image) {
        // React Native necesita el objeto completo para FormData
        data.image = image;
      }

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Error submitting product:', error);
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
          <Text style={styles.title}>
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Image Section */}
          <View style={styles.imageSection}>
            {image ? (
              <Image 
                source={{ uri: imagePreview }} 
                style={styles.imagePreview} 
              />
            ) : product?.id ? (
              <ProductImage 
                productId={product.id} 
                style={styles.imagePreview}
                placeholderColor={Colors.textSecondary}
                placeholderSize={48}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={Colors.textSecondary} />
              </View>
            )}
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.imageButtonText}>Cambiar Imagen</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.field}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Nombre del producto"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>SKU *</Text>
              <TextInput
                style={styles.input}
                value={formData.sku}
                onChangeText={(text) => setFormData({ ...formData, sku: text })}
                placeholder="SKU-001"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Código de Barras</Text>
              <TextInput
                style={styles.input}
                value={formData.barcode}
                onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                placeholder="7890123456789"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Category and Tax */}
          <View style={styles.field}>
            <Text style={styles.label}>Categoría *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                style={styles.picker}
              >
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
                onValueChange={(value) => setFormData({ ...formData, tax_id: value })}
                style={styles.picker}
              >
                {taxes.map((tax) => (
                  <Picker.Item key={tax.id} label={`${tax.name} (${tax.rate}%)`} value={tax.id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Prices */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Precio Venta *</Text>
              <TextInput
                style={styles.input}
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Costo</Text>
              <TextInput
                style={styles.input}
                value={formData.cost}
                onChangeText={(text) => setFormData({ ...formData, cost: text })}
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Stock */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Stock Inicial</Text>
              <TextInput
                style={styles.input}
                value={formData.stock}
                onChangeText={(text) => setFormData({ ...formData, stock: text })}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Stock Mínimo</Text>
              <TextInput
                style={styles.input}
                value={formData.min_stock}
                onChangeText={(text) => setFormData({ ...formData, min_stock: text })}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Descripción del producto"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Switches */}
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setFormData({ ...formData, is_inventory_managed: !formData.is_inventory_managed })}
          >
            <Text style={styles.switchLabel}>Gestionar Inventario</Text>
            <View style={[styles.switch, formData.is_inventory_managed && styles.switchActive]}>
              <View style={[styles.switchThumb, formData.is_inventory_managed && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
          >
            <Text style={styles.switchLabel}>Producto Activo</Text>
            <View style={[styles.switch, formData.is_active && styles.switchActive]}>
              <View style={[styles.switchThumb, formData.is_active && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading || !formData.name.trim() || !formData.sku.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>
                {product ? 'Actualizar' : 'Crear'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
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
