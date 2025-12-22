import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { categoryService } from '@/services';
import type { CategoryDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryImage } from '@/components/CategoryImage';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [category, setCategory] = useState<CategoryDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategory();
  }, [id]);

  const loadCategory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryService.getCategory(Number(id));
      console.log('=== CATEGORIA CARGADA ===');
      console.log('Data completa:', JSON.stringify(data, null, 2));
      console.log('ID:', data.id);
      console.log('Nombre:', data.name);
      console.log('Company ID:', data.company_id);
      console.log('Image:', data.image);
      console.log('Creation Date:', data.creation_date);
      console.log('Updated At:', data.updated_at);
      setCategory(data);
    } catch (error: any) {
      console.error('Error cargando categoría:', error);
      setError(error.message || 'Error al cargar categoría');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!category) return;

    Alert.alert(
      'Eliminar Categoría',
      `¿Estás seguro de eliminar "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(category.id);
              Alert.alert('Éxito', 'Categoría eliminada');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !category) {
    return <ErrorState message={error || 'Categoría no encontrada'} onRetry={loadCategory} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Categoría</Text>
        <TouchableOpacity onPress={() => router.push(`/categories/edit/${id}` as any)}>
          <Ionicons name="create-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {category.id && (
          <CategoryImage 
            categoryId={category.id} 
            style={styles.image}
            placeholderColor={Colors.textSecondary}
            placeholderSize={48}
          />
        )}

        <View style={styles.infoCard}>
          <Text style={styles.label}>ID</Text>
          <Text style={styles.value}>{category.id}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{category.name}</Text>
        </View>

        {category.company_id && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>ID de Empresa</Text>
            <Text style={styles.value}>{category.company_id}</Text>
          </View>
        )}

        {category.image && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Ruta de Imagen</Text>
            <Text style={styles.value} numberOfLines={3}>{category.image}</Text>
          </View>
        )}

        {category.creation_date && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Fecha de Creación</Text>
            <Text style={styles.value}>
              {new Date(category.creation_date).toLocaleString()}
            </Text>
          </View>
        )}

        {category.updated_at && (
          <View style={styles.infoCard}>
            <Text style={styles.label}>Última Actualización</Text>
            <Text style={styles.value}>
              {new Date(category.updated_at).toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.white} />
          <Text style={styles.deleteButtonText}>Eliminar Categoría</Text>
        </TouchableOpacity>
      </ScrollView>
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
    gap: Spacing.md,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
