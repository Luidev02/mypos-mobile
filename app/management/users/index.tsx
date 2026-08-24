import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { extendedUserService, warehouseService } from '@/services/extended';
import type { Role, UserManagement, Warehouse } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
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

export default function UsersScreen() {
  const toast = useToast();
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserManagement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '',
    warehouse_id: '',
    pin_code: '',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [usersData, rolesData, warehousesData] = await Promise.all([
        extendedUserService.getUsers(),
        extendedUserService.getRoles(),
        warehouseService.getWarehouses(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setWarehouses(warehousesData);
    } catch (e: any) {
      setError(e.message || 'Error al cargar usuarios');
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

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role_name?.toLowerCase().includes(query)
    );
  });

  const handleOpenModal = (user?: UserManagement) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role_id: user.role_id.toString(),
        warehouse_id: user.warehouse_id ? String(user.warehouse_id) : '',
        pin_code: user.pin_code || '',
        isActive: user.status !== 'inactive',
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role_id: '',
        warehouse_id: warehouses.length > 0 ? String(warehouses[0].id) : '',
        pin_code: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.email || !formData.role_id || !formData.warehouse_id) {
      toast.error('Complete los campos requeridos');
      return;
    }

    if (!selectedUser && !formData.password) {
      toast.error('La contraseña es requerida para crear un usuario');
      return;
    }
    if (formData.password && formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        role_id: parseInt(formData.role_id, 10),
        warehouse_id: parseInt(formData.warehouse_id, 10),
        pin_code: formData.pin_code || undefined,
        status: (formData.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
        ...(formData.password ? { password: formData.password } : {}),
      };

      if (selectedUser) {
        await extendedUserService.updateUser(selectedUser.id, payload);
        toast.success('Usuario actualizado correctamente');
      } else {
        await extendedUserService.createUser({ ...payload, password: formData.password });
        toast.success('Usuario creado correctamente');
      }

      setShowModal(false);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo guardar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await extendedUserService.deleteUser(userToDelete.id);
      toast.success('Usuario eliminado correctamente');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar el usuario');
    }
  };

  const confirmDelete = (user: UserManagement) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const renderUserItem = ({ item }: { item: UserManagement }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Ionicons name="person" size={24} color={Colors.white} />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
            <Text style={styles.roleText}>{item.role_name || 'Sin rol'}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status !== 'inactive' ? Colors.successLight : Colors.errorLight }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status !== 'inactive' ? Colors.success : Colors.error }
            ]}>
              {item.status !== 'inactive' ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
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
        <Text style={styles.headerTitle}>Usuarios</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Ionicons name="add-circle" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar usuarios..."
        />
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No hay usuarios"
            message="Crea tu primer usuario para comenzar"
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
              {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>
              Usuario <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              autoCapitalize="none"
            />

            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>
              Contraseña {!selectedUser && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={selectedUser ? 'Dejar vacío para mantener' : 'Contraseña'}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />

            <Text style={styles.label}>
              Rol <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleOption,
                      formData.role_id === role.id.toString() && styles.roleOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, role_id: role.id.toString() })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        formData.role_id === role.id.toString() && styles.roleOptionTextSelected,
                      ]}
                    >
                      {role.role_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.label}>
              Bodega <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleScroll}>
                {warehouses.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.roleOption,
                      formData.warehouse_id === w.id.toString() && styles.roleOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, warehouse_id: w.id.toString() })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        formData.warehouse_id === w.id.toString() && styles.roleOptionTextSelected,
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.label}>PIN (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="4 dígitos"
              value={formData.pin_code}
              onChangeText={(text) => setFormData({ ...formData, pin_code: text })}
              keyboardType="numeric"
              maxLength={4}
            />

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Usuario activo</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                trackColor={{ true: Colors.primary }}
              />
            </View>

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
                  <Text style={styles.saveButtonText}>Guardar Usuario</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar Usuario"
        message={`¿Estás seguro de eliminar a ${userToDelete?.username}?`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
        confirmText="Eliminar"
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  userActions: {
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  pickerContainer: {
    marginBottom: Spacing.md,
  },
  roleScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 56,
  },
  roleOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    backgroundColor: Colors.white,
  },
  roleOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  roleOptionTextSelected: {
    color: Colors.white,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textLight,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: Colors.success,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
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
