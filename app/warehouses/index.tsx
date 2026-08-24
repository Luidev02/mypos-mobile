import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SearchBar } from '@/components/SearchBar';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { warehouseService } from '@/services/extended';
import { CreateWarehouseRequest, UpdateWarehouseRequest, Warehouse } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WarehousesScreen() {
  const toast = useToast();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | undefined>();
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Al llegar desde /warehouses/[id] con "Editar" abrimos el modal directamente.
  useEffect(() => {
    if (!editId || warehouses.length === 0) return;
    const target = warehouses.find((w) => String(w.id) === String(editId));
    if (target) {
      setSelectedWarehouse(target);
      setShowFormModal(true);
      router.setParams({ editId: undefined });
    }
  }, [editId, warehouses]);

  const loadWarehouses = async () => {
    try {
      setError(null);
      const data = await warehouseService.getWarehouses();
      setWarehouses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar bodegas');
      toast.error('Error al cargar bodegas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadWarehouses();
  };

  const handleCreate = () => {
    setSelectedWarehouse(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowFormModal(true);
  };

  const handleDelete = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingWarehouse) return;

    try {
      await warehouseService.deleteWarehouse(deletingWarehouse.id);
      setWarehouses(warehouses.filter((w) => w.id !== deletingWarehouse.id));
      toast.success('Bodega eliminada');
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar bodega');
    }
  };

  const handleSubmit = async (data: CreateWarehouseRequest | UpdateWarehouseRequest) => {
    try {
      if (selectedWarehouse) {
        const updated = await warehouseService.updateWarehouse(selectedWarehouse.id, {
          ...data,
          id: selectedWarehouse.id,
        });
        setWarehouses(warehouses.map((w) => (w.id === updated.id ? updated : w)));
        toast.success('Bodega actualizada');
      } else {
        const created = await warehouseService.createWarehouse(data as CreateWarehouseRequest);
        setWarehouses([created, ...warehouses]);
        toast.success('Bodega creada');
      }
      setShowFormModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar bodega');
      throw err;
    }
  };

  const filteredWarehouses = warehouses.filter((warehouse) =>
    warehouse.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderWarehouse = ({ item }: { item: Warehouse }) => (
    <TouchableOpacity style={styles.warehouseCard} onPress={() => handleEdit(item)}>
      <View style={styles.warehouseIcon}>
        <Ionicons name="business" size={24} color={Colors.primary} />
      </View>

      <View style={styles.warehouseInfo}>
        <Text style={styles.warehouseName}>{item.name}</Text>
        {item.address && <Text style={styles.warehouseDetail}>📍 {item.address}</Text>}
        {item.phone && <Text style={styles.warehouseDetail}>☎ {item.phone}</Text>}
        {item.employee_name && <Text style={styles.warehouseDetail}>Encargado: {item.employee_name}</Text>}
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={() => router.push(`/warehouses/${item.id}` as any)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="eye-outline" size={20} color={Colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadWarehouses} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Bodegas</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add-circle" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar por nombre, dirección o encargado..."
        />
      </View>

      {filteredWarehouses.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="No hay bodegas"
          message={searchQuery ? 'No se encontraron bodegas' : 'Comienza creando tu primera bodega'}
          actionLabel={!searchQuery ? 'Crear Bodega' : undefined}
          onAction={!searchQuery ? handleCreate : undefined}
        />
      ) : (
        <FlatList
          data={filteredWarehouses}
          renderItem={renderWarehouse}
          keyExtractor={(item) => item.id.toString()}
          style={styles.listBody}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <WarehouseFormModal
        visible={showFormModal}
        warehouse={selectedWarehouse}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Bodega"
        message={`¿Estás seguro de eliminar "${deletingWarehouse?.name}"?`}
        confirmText="Eliminar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

const WarehouseFormModal: React.FC<{
  visible: boolean;
  warehouse?: Warehouse;
  onClose: () => void;
  onSubmit: (data: CreateWarehouseRequest | UpdateWarehouseRequest) => Promise<void>;
}> = ({ visible, warehouse, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    address: warehouse?.address || '',
    phone: warehouse?.phone || '',
    employee_name: warehouse?.employee_name || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        employee_name: formData.employee_name.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && warehouse) {
      setFormData({
        name: warehouse.name,
        address: warehouse.address || '',
        phone: warehouse.phone || '',
        employee_name: warehouse.employee_name || '',
      });
    } else if (!visible) {
      setFormData({ name: '', address: '', phone: '', employee_name: '' });
    }
  }, [visible, warehouse]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{warehouse ? 'Editar Bodega' : 'Nueva Bodega'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Bodega Principal"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Calle 123 # 45-67"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="300 123 4567"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Encargado</Text>
            <TextInput
              style={styles.input}
              value={formData.employee_name}
              onChangeText={(text) => setFormData({ ...formData, employee_name: text })}
              placeholder="Nombre del encargado"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>{warehouse ? 'Actualizar' : 'Crear'}</Text>
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
    backgroundColor: Colors.primary,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryDark,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    marginLeft: Spacing.md,
  },
  addButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 16,
  },
  warehouseCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  warehouseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  warehouseDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  viewButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
