import { Colors } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { extendedProductService, categoryService, taxService } from '@/services/extended';
import { ProductDetailed, Category, Tax } from '@/types';
import { ProductImage } from '@/components/ProductImage';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ProductFormModal } from '@/components/ProductFormModal';
import { SearchBar } from '@/components/SearchBar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';

export default function ProductsScreen() {
  const toast = useToast();
  const [products, setProducts] = useState<ProductDetailed[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetailed | undefined>();
  const [deletingProduct, setDeletingProduct] = useState<ProductDetailed | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [productsData, categoriesData, taxesData] = await Promise.all([
        extendedProductService.getProducts(),
        categoryService.getCategories(),
        taxService.getTaxes(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setTaxes(taxesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar productos');
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreate = () => {
    setSelectedProduct(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (product: ProductDetailed) => {
    setSelectedProduct(product);
    setShowFormModal(true);
  };

  const handleDelete = (product: ProductDetailed) => {
    setDeletingProduct(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingProduct) return;

    try {
      await extendedProductService.deleteProduct(deletingProduct.id);
      setProducts(products.filter((p) => p.id !== deletingProduct.id));
      toast.success('Producto eliminado');
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedProduct) {
        const updated = await extendedProductService.updateProduct(selectedProduct.id, data);
        setProducts(products.map((p) => (p.id === updated.id ? updated : p)));
        toast.success('Producto actualizado');
      } else {
        const created = await extendedProductService.createProduct(data);
        setProducts([created, ...products]);
        toast.success('Producto creado');
      }
      setShowFormModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar producto');
      throw err;
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    const productName = (product.name || product.title || '').toLowerCase();
    const productSku = (product.sku || '').toLowerCase();
    const productBarcode = (product.barcode || '').toLowerCase();
    
    return productName.includes(searchLower) ||
           productSku.includes(searchLower) ||
           productBarcode.includes(searchLower);
  });

  const renderProduct = ({ item }: { item: ProductDetailed }) => {
    const productName = item.name || item.title || 'Sin nombre';
    
    return (
      <TouchableOpacity style={styles.productCard} onPress={() => handleEdit(item)}>
        <ProductImage 
          productId={item.id} 
          style={styles.productImage}
          placeholderColor={Colors.textSecondary}
          placeholderSize={32}
        />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>${Number(item.price || 0).toFixed(2)}</Text>
            <View style={[styles.stockBadge, Number(item.stock || 0) < Number(item.min_stock || 0) && styles.stockBadgeLow]}>
              <Text style={[styles.stockText, Number(item.stock || 0) < Number(item.min_stock || 0) && styles.stockTextLow]}>
                Stock: {Number(item.stock || 0)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre, SKU o código..."
        />
      </View>

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No hay productos"
          message={searchQuery ? 'No se encontraron productos' : 'Comienza creando tu primer producto'}
          actionLabel={!searchQuery ? 'Crear Producto' : undefined}
          onAction={!searchQuery ? handleCreate : undefined}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <ProductFormModal
        visible={showFormModal}
        product={selectedProduct}
        categories={categories}
        taxes={taxes}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${deletingProduct?.name || deletingProduct?.title || 'este producto'}"?`}
        confirmText="Eliminar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
  },
  list: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  stockBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeLow: {
    backgroundColor: '#FFEBEE',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  stockTextLow: {
    color: '#C62828',
  },
  deleteButton: {
    padding: 8,
  },
});
