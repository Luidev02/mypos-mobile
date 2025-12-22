import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmModal } from '@/components/ConfirmModal';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Customer } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { 
  Alert, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Linking,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    identification: '',
    identificationType: 'CC' as 'CC' | 'NIT' | 'CE' | 'TI',
    phone: '',
    email: '',
    address: '',
    city: '',
  });

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await posService.getCustomer(Number(id));
      console.log('Customer data:', data);
      setCustomer(data);
      
      // Inicializar formulario con datos del cliente
      setFormData({
        name: data.name || '',
        identification: data.ident || '',
        identificationType: data.ident_type || 'CC',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
      });
    } catch (error: any) {
      console.error('Error loading customer:', error);
      setError(error.message || 'Error al cargar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.identification.trim()) {
      Alert.alert('Error', 'Nombre y DNI/NIT son obligatorios');
      return;
    }

    try {
      await posService.updateCustomer(Number(id), {
        name: formData.name,
        ident: formData.identification,
        ident_type: formData.identificationType,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
      });
      Alert.alert('Éxito', 'Cliente actualizado correctamente');
      setShowEditModal(false);
      loadCustomer();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar el cliente');
    }
  };

  const handleDelete = async () => {
    try {
      await posService.deleteCustomer(Number(id));
      Alert.alert('Éxito', 'Cliente eliminado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      Alert.alert('Error', error.message || 'No se pudo eliminar el cliente');
    }
  };

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      Linking.openURL(`mailto:${customer.email}`);
    }
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
        <TouchableOpacity onPress={handleEdit}>
          <Ionicons name="create-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar y nombre */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerType}>
            {customer.ident_type || 'DNI'}: {customer.ident}
          </Text>
          <View style={[styles.badge, customer.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>
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

        {/* Información detallada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre Completo</Text>
                <Text style={styles.infoValue}>{customer.name}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Identificación</Text>
                <Text style={styles.infoValue}>
                  {customer.ident_type || 'DNI'}: {customer.ident}
                </Text>
              </View>
            </View>
          </View>

          {customer.phone && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Teléfono</Text>
                  <Text style={styles.infoValue}>{customer.phone}</Text>
                </View>
              </View>
            </View>
          )}

          {customer.email && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Correo Electrónico</Text>
                  <Text style={styles.infoValue}>{customer.email}</Text>
                </View>
              </View>
            </View>
          )}

          {customer.address && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{customer.address}</Text>
                </View>
              </View>
            </View>
          )}

          {customer.city && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ciudad</Text>
                  <Text style={styles.infoValue}>{customer.city}</Text>
                </View>
              </View>
            </View>
          )}
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

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Cliente"
        message={`¿Está seguro de eliminar a ${customer.name}?`}
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

          <ScrollView style={styles.modalContent}>
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

            <Text style={styles.label}>
              Tipo de Identificación <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.idTypeRow}>
              {(['CC', 'NIT', 'CE', 'TI'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.idTypeButton,
                    formData.identificationType === type && styles.idTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, identificationType: type })}
                >
                  <Text
                    style={[
                      styles.idTypeText,
                      formData.identificationType === type && styles.idTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>
              DNI/NIT <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Número de identificación"
              placeholderTextColor={Colors.textLight}
              value={formData.identification}
              onChangeText={(text) => setFormData({ ...formData, identification: text })}
              keyboardType="numeric"
            />

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

            <Text style={styles.label}>Ciudad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bogotá"
              placeholderTextColor={Colors.textLight}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Actualizar Cliente</Text>
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
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  idTypeTextActive: {
    color: Colors.white,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
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
