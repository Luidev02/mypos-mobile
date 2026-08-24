import { CategoryImage } from '@/components/CategoryImage';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { categoryService } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoryFormScreen() {
  const { id } = useLocalSearchParams();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [image, setImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const category = await categoryService.getCategory(Number(id));
        setName(category.name || '');
      } catch (error: any) {
        Alert.alert('Error', 'No se pudo cargar la categoría');
      } finally {
        setIsFetching(false);
      }
    })();
  }, [id, isEdit]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const imageFile = image
      ? {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: image.fileName || 'category.jpg',
        }
      : undefined;

    try {
      setIsLoading(true);
      if (isEdit) {
        await categoryService.updateCategory(Number(id), {
          id: Number(id),
          name: name.trim(),
          image: imageFile,
        });
        Alert.alert('Éxito', 'Categoría actualizada');
      } else {
        await categoryService.createCategory({ name: name.trim(), image: imageFile });
        Alert.alert('Éxito', 'Categoría creada');
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Editar' : 'Nueva'} Categoría</Text>
        <View style={{ width: 24 }} />
      </View>

      {isFetching ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.imageSection}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              ) : isEdit ? (
                <CategoryImage
                  categoryId={Number(id)}
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre de categoría"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: Colors.primary, ...Shadow.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  loadingBox: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  scrollBody: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  imageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  imagePreview: { width: 64, height: 64, borderRadius: BorderRadius.md },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  imageButtonText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  inputGroup: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadow.sm },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.md, fontSize: FontSize.md, color: Colors.text },
  submitButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.white },
});
