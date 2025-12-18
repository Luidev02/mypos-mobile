import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Customer } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface CustomerModalProps {
  visible: boolean;
  onClose: () => void;
  currentCustomer: string;
  onSelectCustomer: (name: string, customerId: number) => void;
}

export default function CustomerModal({
  visible,
  onClose,
  currentCustomer,
  onSelectCustomer,
}: CustomerModalProps) {
  console.log('CustomerModal renderizado, visible:', visible);
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);

  // Estado del formulario de nuevo cliente
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    identification: '',
    identificationType: 'CC',
    phone: '',
    email: '',
    address: '',
    city: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      Alert.alert('Error', 'Ingresa un DNI/NIT para buscar');
      return;
    }

    setIsSearching(true);
    setFoundCustomer(null);
    
    try {
      console.log('Buscando cliente por DNI/NIT:', searchCode);
      
      // Buscar SOLO por identificación exacta (DNI/NIT/CC)
      const allCustomers = await posService.getCustomers();
      console.log('Total clientes obtenidos:', allCustomers.length);
      
      const exactMatch = allCustomers.find(
        (c: Customer) => 
          c.identification === searchCode.trim() || 
          c.nit === searchCode.trim()
      );

      if (exactMatch) {
        console.log('Cliente encontrado:', exactMatch);
        setFoundCustomer(exactMatch);
      } else {
        console.log('No se encontró cliente con ese DNI/NIT');
        Alert.alert('No Encontrado', 'Cliente no encontrado');
        setFoundCustomer(null);
      }
    } catch (error: any) {
      console.error('Error buscando clientes:', error);
      Alert.alert('Error', 'Error al buscar cliente');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFound = () => {
    console.log('handleSelectFound llamado, foundCustomer:', foundCustomer);
    if (foundCustomer && foundCustomer.name && foundCustomer.id) {
      console.log('Seleccionando cliente:', foundCustomer.name, foundCustomer.id);
      onSelectCustomer(foundCustomer.name, foundCustomer.id);
      setFoundCustomer(null);
      setSearchCode('');
      onClose();
      console.log('Modal cerrado');
    } else {
      Alert.alert('Error', 'Seleccione un cliente válido');
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.identification.trim()) {
      Alert.alert('Error', 'Nombre y DNI/NIT son obligatorios');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Creando cliente:', newCustomer);
      const created = await posService.createCustomer({
        name: newCustomer.name,
        identification: newCustomer.identification,
        identification_type: newCustomer.identificationType as 'CC' | 'NIT' | 'CE' | 'TI',
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        city: newCustomer.city,
      });
      
      console.log('Cliente creado:', created);
      
      Alert.alert('Éxito', 'Cliente creado exitosamente', [
        {
          text: 'OK',
          onPress: () => {
            onSelectCustomer(newCustomer.name, created.id);
            setNewCustomer({
              name: '',
              identification: '',
              identificationType: 'CC',
              phone: '',
              email: '',
              address: '',
              city: '',
            });
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creando cliente:', error);
      Alert.alert('Error', 'Error al crear cliente');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Cliente</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.tabActive]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
              Cliente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.tabActive]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
              Nuevo Cliente
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'search' ? (
            <View style={styles.searchTab}>
              <Text style={styles.label}>Buscar Cliente</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="DNI o NIT del cliente"
                  placeholderTextColor={Colors.textLight}
                  value={searchCode}
                  onChangeText={setSearchCode}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearch}
                  disabled={isSearching}
                  activeOpacity={0.7}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="search" size={20} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>

              {foundCustomer && (
                <View style={styles.foundCustomer}>
                  <View style={styles.foundHeader}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                    <Text style={styles.foundTitle}>Cliente Encontrado</Text>
                  </View>
                  
                  <View style={styles.foundDetails}>
                    <Text style={styles.foundName}>{foundCustomer.name}</Text>
                    
                    <View style={styles.infoRow}>
                      <Ionicons name="card-outline" size={16} color={Colors.textLight} />
                      <Text style={styles.foundInfo}>
                        {foundCustomer.identification || foundCustomer.nit}
                      </Text>
                    </View>
                    
                    {foundCustomer.phone && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={16} color={Colors.textLight} />
                        <Text style={styles.foundInfo}>{foundCustomer.phone}</Text>
                      </View>
                    )}
                    
                    {foundCustomer.email && (
                      <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={16} color={Colors.textLight} />
                        <Text style={styles.foundInfo}>{foundCustomer.email}</Text>
                      </View>
                    )}
                    
                    {foundCustomer.address && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color={Colors.textLight} />
                        <Text style={styles.foundInfo}>{foundCustomer.address}</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={handleSelectFound}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.selectButtonText}>Seleccionar Cliente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.createTab}>
              <Text style={styles.label}>
                Nombre Completo <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor={Colors.textLight}
                value={newCustomer.name}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
              />

              <Text style={styles.label}>
                Tipo de Identificación <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.idTypeRow}>
                {['CC', 'NIT', 'CE', 'TI'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.idTypeButton,
                      newCustomer.identificationType === type && styles.idTypeButtonActive,
                    ]}
                    onPress={() => setNewCustomer({ ...newCustomer, identificationType: type })}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.idTypeText,
                        newCustomer.identificationType === type && styles.idTypeTextActive,
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
                value={newCustomer.identification}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, identification: text })}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 3001234567"
                placeholderTextColor={Colors.textLight}
                value={newCustomer.phone}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={Colors.textLight}
                value={newCustomer.email}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={styles.input}
                placeholder="Calle 123 #45-67"
                placeholderTextColor={Colors.textLight}
                value={newCustomer.address}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, address: text })}
              />

              <Text style={styles.label}>Ciudad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Bogotá"
                placeholderTextColor={Colors.textLight}
                value={newCustomer.city}
                onChangeText={(text) => setNewCustomer({ ...newCustomer, city: text })}
              />

              <TouchableOpacity 
                style={[styles.createButton, isCreating && styles.createButtonDisabled]}
                onPress={handleCreateCustomer}
                disabled={isCreating}
                activeOpacity={0.7}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color={Colors.white} />
                    <Text style={styles.createButtonText}>Crear Cliente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
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
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  currentCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  currentCustomerText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  defaultButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
  },
  defaultButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.transparent,
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  tabTextActive: {
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  searchTab: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  foundCustomer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  foundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  foundTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  foundDetails: {
    gap: Spacing.sm,
  },
  foundName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  foundInfo: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    flex: 1,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm
  },
  foundInfo: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  hint: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  hintText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textLight,
    lineHeight: 20,
  },
  resultsContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  resultsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
  },
  resultInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  resultDetail: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  createTab: {
    padding: Spacing.lg,
    gap: Spacing.md,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
