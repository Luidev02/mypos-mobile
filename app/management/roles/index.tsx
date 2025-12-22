import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedUserService } from '@/services/extended';
import type { Role, Permission } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RolesScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Form state
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRoles();
  }, [searchQuery, roles]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [rolesData, permissionsData] = await Promise.all([
        extendedUserService.getRoles(),
        extendedUserService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error: any) {
      setError(error.message || 'Error al cargar roles');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const filterRoles = () => {
    if (!searchQuery.trim()) {
      setFilteredRoles(roles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = roles.filter((role) =>
      role.name.toLowerCase().includes(query)
    );
    setFilteredRoles(filtered);
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setSelectedRole(role);
      setRoleName(role.name);
      setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
    } else {
      setSelectedRole(null);
      setRoleName('');
      setSelectedPermissions([]);
    }
    setShowModal(true);
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      Alert.alert('Error', 'El nombre del rol es requerido');
      return;
    }

    if (selectedPermissions.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un permiso');
      return;
    }

    try {
      const data = {
        name: roleName,
        permissions: selectedPermissions,
      };

      if (selectedRole) {
        await extendedUserService.updateRole(selectedRole.id, { ...data, id: selectedRole.id });
        Alert.alert('Éxito', 'Rol actualizado correctamente');
      } else {
        await extendedUserService.createRole(data);
        Alert.alert('Éxito', 'Rol creado correctamente');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el rol');
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      await extendedUserService.deleteRole(roleToDelete.id);
      Alert.alert('Éxito', 'Rol eliminado correctamente');
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar el rol');
    }
  };

  const confirmDelete = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const renderRoleItem = ({ item }: { item: Role }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleIcon}>
        <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleName}>{item.name}</Text>
        <Text style={styles.rolePermissions}>
          {item.permissions?.length || 0} permisos
        </Text>
      </View>
      <View style={styles.roleActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenModal(item)}
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => confirmDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Roles</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Ionicons name="add-circle" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar roles..."
        />
      </View>

      <FlatList
        data={filteredRoles}
        renderItem={renderRoleItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="No hay roles"
            message="Crea tu primer rol para comenzar"
          />
        }
      />

      {/* Modal de creación/edición */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedRole ? 'Editar Rol' : 'Nuevo Rol'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>
              Nombre del Rol <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Administrador, Cajero, etc."
              value={roleName}
              onChangeText={setRoleName}
            />

            <Text style={styles.label}>
              Permisos <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helpText}>
              Selecciona los permisos que tendrá este rol
            </Text>

            <View style={styles.permissionsContainer}>
              {permissions.map((permission) => (
                <TouchableOpacity
                  key={permission.id}
                  style={styles.permissionItem}
                  onPress={() => togglePermission(permission.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedPermissions.includes(permission.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedPermissions.includes(permission.id) && (
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                    )}
                  </View>
                  <Text style={styles.permissionName}>{permission.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Guardar Rol</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar Rol"
        message={`¿Estás seguro de eliminar el rol "${roleToDelete?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setRoleToDelete(null);
        }}
        confirmText="Eliminar"
      />
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  listContent: {
    padding: Spacing.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  rolePermissions: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  roleActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.errorLight,
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
  helpText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
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
  permissionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  permissionName: {
    fontSize: FontSize.md,
    color: Colors.text,
    flex: 1,
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
