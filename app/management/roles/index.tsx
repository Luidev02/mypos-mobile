import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { extendedUserService } from '@/services/extended';
import type { Permission, Role } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Réplica exacta del agrupador client-side de `roles/permissions.jsx`: el
// backend no agrupa nada (`GET /api/permissions` es un arreglo plano
// ordenado alfabéticamente) — el "módulo" se deriva del propio nombre.
function permissionModule(permissionName: string): string {
  const parts = permissionName.split('_');
  const prefixes = ['view', 'create', 'edit', 'delete', 'manage'];
  const module = prefixes.includes(parts[0]) ? parts[1] : parts[0];
  return (module || 'otros').replace(/^\w/, (c) => c.toUpperCase());
}

export default function RolesScreen() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Form state
  const [roleName, setRoleName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [rolesData, permissionsData] = await Promise.all([
        extendedUserService.getRoles(),
        extendedUserService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (e: any) {
      setError(e.message || 'Error al cargar roles');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const filteredRoles = roles.filter((role) =>
    role.role_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const p of permissions) {
      const mod = permissionModule(p.permission_name);
      (groups[mod] ||= []).push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const handleOpenModal = async (role?: Role) => {
    setSelectedRole(role || null);
    setRoleName(role?.role_name || '');
    setIsActive(role ? role.status === 1 : true);
    setSelectedPermissions([]);
    setShowModal(true);

    if (role) {
      // El listado nunca trae `permissions` (solo `permissions_count`) — hay
      // que pedir el detalle antes de mostrar el formulario, si no, guardar
      // pisaría los permisos reales del rol con un arreglo vacío.
      setIsLoadingModal(true);
      try {
        const ids = await extendedUserService.getRolePermissionIds(role.id);
        setSelectedPermissions(ids);
      } catch (e) {
        toast.error('No se pudieron cargar los permisos actuales del rol');
      } finally {
        setIsLoadingModal(false);
      }
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast.error('El nombre del rol es requerido');
      return;
    }

    try {
      setIsSaving(true);
      if (selectedRole) {
        await extendedUserService.updateRole(selectedRole.id, {
          role_name: roleName.trim(),
          status: isActive ? 1 : 0,
        });
        await extendedUserService.updateRolePermissions(selectedRole.id, selectedPermissions);
        toast.success('Rol actualizado correctamente');
      } else {
        await extendedUserService.createRole({
          role_name: roleName.trim(),
          status: isActive ? 1 : 0,
          permissions: selectedPermissions,
        });
        toast.success('Rol creado correctamente');
      }

      setShowModal(false);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el rol');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      await extendedUserService.deleteRole(roleToDelete.id);
      toast.success('Rol eliminado correctamente');
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar el rol');
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
        <View style={styles.roleNameRow}>
          <Text style={styles.roleName}>{item.role_name}</Text>
          {item.is_system_role && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>Sistema</Text>
            </View>
          )}
          {item.status !== 1 && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactivo</Text>
            </View>
          )}
        </View>
        <Text style={styles.rolePermissions}>
          {item.permissions_count ?? 0} permisos · {item.users_count ?? 0} usuarios
        </Text>
      </View>
      {!item.is_system_role && (
        <View style={styles.roleActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenModal(item)}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}
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
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Buscar roles..." />
      </View>

      <FlatList
        data={filteredRoles}
        renderItem={renderRoleItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <EmptyState icon="shield-checkmark-outline" title="No hay roles" message="Crea tu primer rol para comenzar" />
        }
      />

      {/* Modal de creación/edición */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedRole ? 'Editar Rol' : 'Nuevo Rol'}</Text>
            <View style={{ width: 28 }} />
          </View>

          {isLoadingModal ? (
            <LoadingState message="Cargando permisos del rol..." />
          ) : (
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

              <View style={styles.switchRow}>
                <Text style={styles.label}>Rol Activo</Text>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
              </View>

              <Text style={styles.label}>Permisos</Text>
              <Text style={styles.helpText}>Selecciona los permisos que tendrá este rol</Text>

              {groupedPermissions.map(([moduleName, perms]) => (
                <View key={moduleName} style={styles.permissionGroup}>
                  <Text style={styles.permissionGroupTitle}>{moduleName}</Text>
                  <View style={styles.permissionsContainer}>
                    {perms.map((permission) => (
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
                        <Text style={styles.permissionName}>{permission.permission_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.saveButtonText}>Guardar Rol</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar Rol"
        message={`¿Estás seguro de eliminar el rol "${roleToDelete?.role_name}"?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setRoleToDelete(null);
        }}
        confirmText="Eliminar"
        type="danger"
      />
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
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
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
  roleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  roleName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  systemBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permissionGroup: {
    marginTop: Spacing.md,
  },
  permissionGroupTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  permissionsContainer: {
    gap: Spacing.sm,
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
