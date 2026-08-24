import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmModal } from '@/components/ConfirmModal';
import { MunicipalityAutocomplete } from '@/components/MunicipalityAutocomplete';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { posService } from '@/services';
import type { Customer, CustomerIdentType, Municipality } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ID_TYPES: { value: CustomerIdentType; label: string }[] = [
  { value: 'CC', label: 'CC' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'CE' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
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

  const loadCustomer = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await posService.getCustomer(Number(id));
      setCustomer(data);
      setFormData({
        name: data.name || '',
        identification: data.ident || '',
        identificationType: data.ident_type || 'CC',
        dv: data.dv || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        municipalityId: data.municipality_id,
        municipalityLabel: data.municipality_id && data.municipality_name
          ? `${data.municipality_name}${data.municipality_department ? ` — ${data.municipality_department}` : ''}`
          : '',
        requiresElectronicInvoice: !!data.requires_electronic_invoice,
        isActive: data.status !== 'disable',
      });
    } catch (error: any) {
      console.error('Error loading customer:', error);
      setError(error.message || 'Error al cargar cliente');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadCustomer();
    }, [loadCustomer])
  );

  const handleSelectMunicipality = (m: Municipality) => {
    setFormData((prev) => ({ ...prev, municipalityId: m.id }));
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.identification.trim()) {
      toast.error('Nombre y DNI/NIT son obligatorios');
      return;
    }

    try {
      setIsSaving(true);
      await posService.updateCustomer(Number(id), {
        name: formData.name.trim(),
        ident: formData.identification.trim(),
        ident_type: formData.identificationType,
        dv: formData.identificationType === 'NIT' ? formData.dv.trim() || undefined : undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        municipality_id: formData.municipalityId ?? null,
        requires_electronic_invoice: formData.requiresElectronicInvoice,
        status: formData.isActive ? 'active' : 'disable',
      });
      toast.success('Cliente actualizado correctamente');
      setShowEditModal(false);
      loadCustomer();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.message || 'No se pudo actualizar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await posService.deleteCustomer(Number(id));
      toast.success('Cliente eliminado correctamente');
      router.back();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      setShowDeleteModal(false);
      toast.error('Error eliminando cliente. Puede tener ventas asociadas.');
    }
  };

  const handleCall = () => {
    if (customer?.phone) Linking.openURL(`tel:${customer.phone}`);
  };

  const handleEmail = () => {
    if (customer?.email) Linking.openURL(`mailto:${customer.email}`);
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const cleanPhone = customer.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=+57${cleanPhone}`);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !customer) {
    return <ErrorState message={error || 'Cliente no encontrado'} onRetry={loadCustomer} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Cliente</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        {/* Avatar y nombre */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerType}>
            {customer.ident_type || 'CC'}: {customer.ident}
          </Text>
          <Text style={styles.customerId}>ID Cliente: {customer.id}</Text>
          <View style={[styles.badge, customer.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, customer.status === 'active' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {customer.status === 'active' ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        {/* Acciones rápidas */}
        {(customer.phone || customer.email) && (
          <View style={styles.quickActions}>
            {customer.phone && (
              <>
                <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                  <Ionicons name="call" size={20} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Llamar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={20} color={Colors.success} />
                  <Text style={styles.actionButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}
            {customer.email && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color={Colors.warning} />
                <Text style={styles.actionButtonText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Identificación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificación</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tipo de Documento</Text>
                <Text style={styles.infoValue}>{customer.ident_type || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="finger-print-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Número de Documento</Text>
                <Text style={styles.infoValue}>
                  {customer.ident}
                  {customer.dv ? `-${customer.dv}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Correo Electrónico</Text>
                <Text style={styles.infoValue}>{customer.email || 'No registrado'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{customer.phone || 'No registrado'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{customer.address || 'No registrada'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Facturación electrónica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facturación Electrónica</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Requiere Factura Electrónica DIAN</Text>
                {customer.requires_electronic_invoice ? (
                  <View style={[styles.inlineBadge, styles.badgeElectronic]}>
                    <Text style={[styles.inlineBadgeText, styles.badgeTextElectronic]}>✓ Sí - Factura Electrónica</Text>
                  </View>
                ) : (
                  <View style={[styles.inlineBadge, styles.badgePos]}>
                    <Text style={[styles.inlineBadgeText, styles.badgeTextPos]}>✗ No - Factura POS</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Botón de eliminar */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.white} />
          <Text style={styles.deleteButtonText}>Eliminar Cliente</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Cliente"
        message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Modal de edición */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar Cliente</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>
              Nombre Completo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Juan Pérez"
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
              placeholder="Número de identificación"
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

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 3001234567"
              placeholderTextColor={Colors.textLight}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={Colors.textLight}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Calle 123 #45-67"
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

            <View style={[styles.switchCard, { marginTop: Spacing.lg }]}>
              <Text style={styles.switchLabel}>Requiere Factura Electrónica DIAN</Text>
              <Switch
                value={formData.requiresElectronicInvoice}
                onValueChange={(value) => setFormData({ ...formData, requiresElectronicInvoice: value })}
                trackColor={{ true: Colors.primary }}
              />
            </View>

            <View style={[styles.switchCard, { marginTop: Spacing.md }]}>
              <Text style={styles.switchLabel}>Cliente Activo</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                trackColor={{ true: Colors.primary }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Actualizar Cliente</Text>
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
  },
  profileSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  customerName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  customerType: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  customerId: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextInactive: {
    color: '#991B1B',
  },
  badgeElectronic: {
    backgroundColor: '#DBEAFE',
  },
  badgePos: {
    backgroundColor: '#F3F4F6',
  },
  badgeTextElectronic: {
    color: '#1D4ED8',
  },
  badgeTextPos: {
    color: '#4B5563',
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  inlineBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
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
    ...Shadow.sm,
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
    flex: 1,
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
