import { CategoryImage } from '@/components/CategoryImage';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ProductImage } from '@/components/ProductImage';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { categoryService, posService } from '@/services';
import type { CategoryDetailed, Product } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams();
  const [category, setCategory] = useState<CategoryDetailed | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategory();
  }, [id]);

  const loadCategory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [data, categoryProducts] = await Promise.all([
        categoryService.getCategory(Number(id)),
        posService.getCategoryProducts(Number(id)),
      ]);
      setCategory(data);
      setProducts(categoryProducts);
    } catch (error: any) {
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
        <TouchableOpacity onPress={() => router.push({ pathname: '/categories/new', params: { id } })}>
          <Ionicons name="create-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
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

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Productos en esta categoría ({products.length})</Text>
          {products.length === 0 ? (
            <Text style={styles.emptyText}>Esta categoría no tiene productos todavía.</Text>
          ) : (
            products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productRow}
                onPress={() => router.push(`/products` as any)}
              >
                <ProductImage
                  productId={product.id}
                  style={styles.productImage}
                  placeholderColor={Colors.textSecondary}
                  placeholderSize={18}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productSku}>SKU: {product.sku}</Text>
                </View>
                <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

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
    backgroundColor: Colors.primary,
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
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
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
  productsSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  productImage: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  productSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  productPrice: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
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
