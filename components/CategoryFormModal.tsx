import React, { useState } from 'react';
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
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CategoryDetailed, CreateCategoryRequest, UpdateCategoryRequest } from '@/types';
import { CategoryImage } from '@/components/CategoryImage';

interface CategoryFormModalProps {
  visible: boolean;
  category?: CategoryDetailed;
  onClose: () => void;
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  visible,
  category,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(category?.name || '');
  const [image, setImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState(category?.image_url || '');
  const [loading, setLoading] = useState(false);

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
    if (!name.trim()) return;

    setLoading(true);
    try {
      const data: any = { name: name.trim() };
      if (image) {
        data.image = {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || 'category.jpg',
        };
      }

      await onSubmit(data);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error submitting category:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setImage(null);
    setImagePreview('');
  };

  React.useEffect(() => {
    if (visible && category) {
      setName(category.name);
      setImagePreview(category.image_url || '');
      setImage(null);
    } else if (!visible) {
      resetForm();
    }
  }, [visible, category]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.imageSection}>
            {image ? (
              <Image 
                source={{ uri: imagePreview }} 
                style={styles.imagePreview} 
              />
            ) : category?.id ? (
              <CategoryImage 
                categoryId={category.id} 
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

          <View style={styles.field}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Bebidas, Snacks, etc."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>
                {category ? 'Actualizar' : 'Crear'}
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
