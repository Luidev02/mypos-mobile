import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Customer } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await posService.getCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(query) ||
        customer.ident?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      identification: '',
      identificationType: 'CC',
      phone: '',
      email: '',
      address: '',
      city: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      identification: customer.ident || '',
      identificationType: customer.ident_type || 'CC',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.identification.trim()) {
      Alert.alert('Error', 'Nombre y DNI/NIT son obligatorios');
      return;
    }

    try {
      if (editingCustomer) {
        // Actualizar cliente existente
        await posService.updateCustomer(editingCustomer.id, {
          name: formData.name,
          ident: formData.identification,
          ident_type: formData.identificationType,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
        });
        Alert.alert('Éxito', 'Cliente actualizado correctamente');
      } else {
        // Crear nuevo cliente
        await posService.createCustomer({
          name: formData.name,
          ident: formData.identification,
          ident_type: formData.identificationType,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          city: formData.city,
        });
        Alert.alert('Éxito', 'Cliente creado correctamente');
      }
      setModalVisible(false);
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'No se pudo guardar el cliente');
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
              Alert.alert('Éxito', 'Cliente eliminado correctamente');
              loadCustomers();
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Error', 'No se pudo eliminar el cliente');
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
            {item.ident_type || 'DNI'}: {item.ident}
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
      
      {/* Indicador visual de que es clickeable */}
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
          placeholder="Buscar por nombre, DNI, teléfono..."
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
                  activeOpacity={0.7}
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

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
              </Text>
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
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
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
