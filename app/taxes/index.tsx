import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SearchBar } from '@/components/SearchBar';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { taxService } from '@/services/extended';
import { CreateTaxRequest, Tax, UpdateTaxRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

export default function TaxesScreen() {
  const toast = useToast();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<Tax | undefined>();
  const [deletingTax, setDeletingTax] = useState<Tax | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTaxes();
  }, []);

  const loadTaxes = async () => {
    try {
      setError(null);
      const data = await taxService.getTaxes();
      setTaxes(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar impuestos');
      toast.error('Error al cargar impuestos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTaxes();
  };

  const handleCreate = () => {
    setSelectedTax(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (tax: Tax) => {
    setSelectedTax(tax);
    setShowFormModal(true);
  };

  const handleDelete = (tax: Tax) => {
    setDeletingTax(tax);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingTax) return;

    try {
      await taxService.deleteTax(deletingTax.id);
      setTaxes(taxes.filter((t) => t.id !== deletingTax.id));
      toast.success('Impuesto eliminado');
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar impuesto');
    }
  };

  const handleSubmit = async (data: CreateTaxRequest | UpdateTaxRequest) => {
    try {
      if (selectedTax) {
        const updated = await taxService.updateTax(selectedTax.id, data);
        setTaxes(taxes.map((t) => (t.id === updated.id ? updated : t)));
        toast.success('Impuesto actualizado');
      } else {
        const created = await taxService.createTax(data as CreateTaxRequest);
        setTaxes([created, ...taxes]);
        toast.success('Impuesto creado');
      }
      setShowFormModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar impuesto');
      throw err;
    }
  };

  const filteredTaxes = taxes.filter((tax) =>
    tax.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTax = ({ item }: { item: Tax }) => (
    <TouchableOpacity style={styles.taxCard} onPress={() => handleEdit(item)}>
      <View style={styles.taxIcon}>
        <Ionicons name="receipt" size={24} color={Colors.primary} />
      </View>
      
      <View style={styles.taxInfo}>
        <Text style={styles.taxName}>{item.name || 'Sin nombre'}</Text>
        <Text style={styles.taxRate}>{Number(item.rate || 0)}%</Text>
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadTaxes} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Impuestos</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Ionicons name="add-circle" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar impuesto..."
        />
      </View>

      {filteredTaxes.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No hay impuestos"
          message={searchQuery ? 'No se encontraron impuestos' : 'Comienza creando tu primer impuesto'}
          actionLabel={!searchQuery ? 'Crear Impuesto' : undefined}
          onAction={!searchQuery ? handleCreate : undefined}
        />
      ) : (
        <FlatList
          data={filteredTaxes}
          renderItem={renderTax}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      <TaxFormModal
        visible={showFormModal}
        tax={selectedTax}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Impuesto"
        message={`¿Estás seguro de eliminar "${deletingTax?.name}"?`}
        confirmText="Eliminar"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

const TaxFormModal: React.FC<{
  visible: boolean;
  tax?: Tax;
  onClose: () => void;
  onSubmit: (data: CreateTaxRequest | UpdateTaxRequest) => Promise<void>;
}> = ({ visible, tax, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: tax?.name || '',
    rate: tax?.rate?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.rate) return;

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name.trim(),
        rate: parseFloat(formData.rate),
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && tax) {
      setFormData({
        name: tax.name,
        rate: tax.rate.toString(),
      });
    } else if (!visible) {
      setFormData({ name: '', rate: '' });
    }
  }, [visible, tax]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{tax ? 'Editar Impuesto' : 'Nuevo Impuesto'}</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="IVA, Impoconsumo, etc."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tasa (%) *</Text>
            <TextInput
              style={styles.input}
              value={formData.rate}
              onChangeText={(text) => setFormData({ ...formData, rate: text })}
              placeholder="19"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              En Colombia, el IVA estándar es del 19%. Otros impuestos comunes son el impoconsumo (4%, 8%, 16%).
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading || !formData.name.trim() || !formData.rate}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>{tax ? 'Actualizar' : 'Crear'}</Text>
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
  list: {
    padding: 16,
  },
  taxCard: {
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
  taxIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taxInfo: {
    flex: 1,
  },
  taxName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  taxRate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
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
