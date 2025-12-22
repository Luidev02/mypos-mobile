import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { extendedUserService } from '@/services/extended';
import type { UserManagement } from '@/types';
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

export default function UsersScreen() {
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserManagement[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    pin_code: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [usersData, rolesData] = await Promise.all([
        extendedUserService.getUsers(),
        extendedUserService.getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error: any) {
      setError(error.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role_name?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleOpenModal = (user?: UserManagement) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role_id: user.role_id.toString(),
        pin_code: user.pin_code || '',
        is_active: user.is_active,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role_id: '',
        pin_code: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.username || !formData.email || !formData.role_id) {
      Alert.alert('Error', 'Complete los campos requeridos');
      return;
    }

    if (!selectedUser && !formData.password) {
      Alert.alert('Error', 'La contraseña es requerida para crear un usuario');
      return;
    }

    try {
      const data = {
        ...formData,
        role_id: parseInt(formData.role_id),
      };

      if (selectedUser) {
        await extendedUserService.updateUser(selectedUser.id, data as any);
        Alert.alert('Éxito', 'Usuario actualizado correctamente');
      } else {
        await extendedUserService.createUser(data as any);
        Alert.alert('Éxito', 'Usuario creado correctamente');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el usuario');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await extendedUserService.deleteUser(userToDelete.id);
      Alert.alert('Éxito', 'Usuario eliminado correctamente');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar el usuario');
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
            { backgroundColor: item.is_active ? Colors.successLight : Colors.errorLight }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.is_active ? Colors.success : Colors.error }
            ]}>
              {item.is_active ? 'Activo' : 'Inactivo'}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                      {role.name}
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

            <TouchableOpacity
              style={styles.switchContainer}
              onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
            >
              <Text style={styles.label}>Usuario activo</Text>
              <View style={[styles.switch, formData.is_active && styles.switchActive]}>
                <View style={[styles.switchThumb, formData.is_active && styles.switchThumbActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Guardar Usuario</Text>
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
