import { ErrorState } from '@/components/ErrorState';
import { MunicipalityAutocomplete } from '@/components/MunicipalityAutocomplete';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { posService } from '@/services';
import type { Customer, CustomerIdentType, Municipality } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Switch,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ID_TYPES: { value: CustomerIdentType; label: string }[] = [
  { value: 'CC', label: 'CC' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'CE' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const emptyForm = () => ({
  name: '',
  identification: '',
  identificationType: 'CC' as CustomerIdentType,
  dv: '',
  phone: '',
  email: '',
  address: '',
  municipalityId: undefined as number | undefined,
  municipalityLabel: '',
  requiresElectronicInvoice: false,
  isActive: true,
});

export default function CustomersScreen() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await posService.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.response?.data?.message || 'No se pudieron cargar los clientes');
      toast.error('No se pudieron cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(query) ||
          (customer.ident || '').includes(query) ||
          (customer.email || '').toLowerCase().includes(query)
      )
    );
  }, [searchQuery, customers]);

  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormData(emptyForm());
    setModalVisible(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      identification: customer.ident || '',
      identificationType: customer.ident_type || 'CC',
      dv: customer.dv || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      municipalityId: customer.municipality_id,
      municipalityLabel: customer.municipality_id && customer.municipality_name
        ? `${customer.municipality_name}${customer.municipality_department ? ` — ${customer.municipality_department}` : ''}`
        : '',
      requiresElectronicInvoice: !!customer.requires_electronic_invoice,
      isActive: customer.status !== 'disable',
    });
    setModalVisible(true);
  };

  const handleSelectMunicipality = (m: Municipality) => {
    setFormData((prev) => ({ ...prev, municipalityId: m.id }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.identification.trim()) {
      toast.error('Nombre y DNI/NIT son obligatorios');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      ident: formData.identification.trim(),
      ident_type: formData.identificationType,
      dv: formData.identificationType === 'NIT' ? formData.dv.trim() || undefined : undefined,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      municipality_id: formData.municipalityId ?? null,
      requires_electronic_invoice: formData.requiresElectronicInvoice,
      status: (formData.isActive ? 'active' : 'disable') as 'active' | 'disable',
    };

    try {
      setIsSaving(true);
      if (editingCustomer) {
        await posService.updateCustomer(editingCustomer.id, payload);
        toast.success('Cliente actualizado correctamente');
      } else {
        await posService.createCustomer(payload);
        toast.success('Cliente creado correctamente');
      }
      setModalVisible(false);
      loadCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.message || 'No se pudo guardar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (customer: Customer) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de eliminar a ${customer.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await posService.deleteCustomer(customer.id);
              toast.success('Cliente eliminado correctamente');
              loadCustomers();
            } catch (error) {
              console.error('Error deleting customer:', error);
              toast.error('No se pudo eliminar. Puede tener ventas asociadas.');
            }
          },
        },
      ]
    );
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/customers/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={24} color={Colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardDetail}>
            {item.ident_type || 'CC'}: {item.ident}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardMetaRow}>
        {item.requires_electronic_invoice ? (
          <View style={[styles.badge, styles.badgeElectronic]}>
            <Text style={[styles.badgeText, styles.badgeTextElectronic]}>Electrónica</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgePos]}>
            <Text style={[styles.badgeText, styles.badgeTextPos]}>POS</Text>
          </View>
        )}
        <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, item.status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {item.status === 'active' ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
      </View>

      {(item.phone || item.email || item.address) && (
        <View style={styles.cardDetails}>
          {item.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.email}</Text>
            </View>
          )}
          {item.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.textLight} />
              <Text style={styles.detailText}>{item.address}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>Ver detalles</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Clientes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNew}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={32} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, identificación o email..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando clientes...</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={loadCustomers} />
      ) : filteredCustomers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddNew} activeOpacity={0.7}>
              <Text style={styles.emptyButtonText}>Crear primer cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerCard}
          keyExtractor={(item) => item.id.toString()}
          style={styles.listBody}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de Crear/Editar */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionTitle}>Información Principal</Text>

            <Text style={styles.label}>
              Nombre Completo / Razón Social <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez o Empresa SAS"
              placeholderTextColor={Colors.textLight}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={styles.label}>Tipo de Identificación</Text>
            <View style={styles.idTypeRow}>
              {ID_TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.idTypeButton,
                    formData.identificationType === value && styles.idTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, identificationType: value })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.idTypeText,
                      formData.identificationType === value && styles.idTypeTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              Número de Identificación <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 123456789"
              placeholderTextColor={Colors.textLight}
              value={formData.identification}
              onChangeText={(text) => setFormData({ ...formData, identification: text })}
              keyboardType="numeric"
            />

            {formData.identificationType === 'NIT' && (
              <>
                <Text style={styles.label}>Dígito de Verificación (DV)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 7"
                  placeholderTextColor={Colors.textLight}
                  value={formData.dv}
                  onChangeText={(text) => setFormData({ ...formData, dv: text.slice(0, 1) })}
                  keyboardType="numeric"
                  maxLength={1}
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Contacto y Ubicación</Text>

            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="cliente@ejemplo.com"
              placeholderTextColor={Colors.textLight}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Teléfono / Celular</Text>
            <TextInput
              style={styles.input}
              placeholder="+57 300 123 4567"
              placeholderTextColor={Colors.textLight}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Dirección Física</Text>
            <TextInput
              style={styles.input}
              placeholder="Calle 123 # 45-67"
              placeholderTextColor={Colors.textLight}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />

            <Text style={styles.label}>Municipio / Ciudad</Text>
            <MunicipalityAutocomplete
              initialLabel={formData.municipalityLabel}
              hasSelection={!!formData.municipalityId}
              onSelect={handleSelectMunicipality}
              onClear={() => setFormData((prev) => ({ ...prev, municipalityId: undefined }))}
            />

            <Text style={styles.sectionTitle}>Facturación Electrónica DIAN</Text>
            <View style={styles.switchCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Este cliente requiere factura electrónica DIAN</Text>
                <Text style={styles.switchHint}>
                  ⚠️ Solo aplica si la empresa está configurada para reportar a la DIAN.
                </Text>
              </View>
              <Switch
                value={formData.requiresElectronicInvoice}
                onValueChange={(value) => setFormData({ ...formData, requiresElectronicInvoice: value })}
                trackColor={{ true: Colors.primary }}
              />
            </View>

            <Text style={styles.sectionTitle}>Estado</Text>
            <View style={styles.switchCard}>
              <Text style={styles.switchLabel}>Cliente Activo</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                trackColor={{ true: Colors.primary }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Guardar Cliente</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.textLight,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cardDetail: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeElectronic: {
    backgroundColor: '#DBEAFE',
  },
  badgePos: {
    backgroundColor: '#F3F4F6',
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  badgeTextElectronic: {
    color: '#1D4ED8',
  },
  badgeTextPos: {
    color: '#4B5563',
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextInactive: {
    color: '#991B1B',
  },
  cardDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  viewDetailsText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
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
  idTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  idTypeButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  idTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  idTypeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  idTypeTextActive: {
    color: Colors.white,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  switchLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  switchHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
