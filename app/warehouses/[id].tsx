import { ConfirmModal } from '@/components/ConfirmModal';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { warehouseService } from '@/services/extended';
import type { Warehouse } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WarehouseDetailScreen() {
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await warehouseService.getWarehouse(Number(id));
      setWarehouse(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando los detalles de la bodega');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleConfirmDelete = async () => {
    try {
      await warehouseService.deleteWarehouse(Number(id));
      toast.success('Bodega eliminada');
      setShowDeleteModal(false);
      router.back();
    } catch (e: any) {
      setShowDeleteModal(false);
      toast.error(e.response?.data?.message || 'Error al eliminar. Verifique que la bodega no tenga productos con stock.');
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando detalles..." />;
  }

  if (error || !warehouse) {
    return <ErrorState message={error || 'Bodega no encontrada'} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles de Bodega</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {/* Banner */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.warehouseName}>{warehouse.name}</Text>
            <Text style={styles.warehouseId}>ID: {warehouse.id}</Text>
          </View>
          <View style={[styles.statusBadge, warehouse.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
            <Text style={[styles.statusBadgeText, warehouse.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {warehouse.is_active ? 'Activa' : 'Inactiva'}
            </Text>
          </View>
        </View>

        {/* Contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Dirección</Text>
            <Text style={styles.fieldValue}>{warehouse.address || 'No registrada'}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <Text style={styles.fieldValue}>{warehouse.phone || 'No registrado'}</Text>
          </View>
        </View>

        {/* Responsable */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responsable</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Encargado</Text>
            <Text style={styles.fieldValue}>{warehouse.employee_name || 'Sin asignar'}</Text>
          </View>
        </View>

        {/* Gestionar inventario */}
        <View style={styles.inventoryCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inventoryCardTitle}>Gestionar Inventario</Text>
            <Text style={styles.inventoryCardText}>Revisar existencias y movimientos de esta bodega.</Text>
          </View>
          <TouchableOpacity style={styles.inventoryCardButton} onPress={() => router.push('/(tabs)/inventory' as any)}>
            <Text style={styles.inventoryCardButtonText}>Ir al Inventario →</Text>
          </TouchableOpacity>
        </View>

        {/* Acciones */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({ pathname: '/warehouses', params: { editId: warehouse.id } } as any)
            }
          >
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.deleteButtonText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Bodega"
        message={`¿Estás seguro de eliminar "${warehouse.name}"? Se perderá el historial de inventario asociado.`}
        confirmText="Eliminar"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
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
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  warehouseName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  warehouseId: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusBadgeInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  statusTextActive: {
    color: '#15803D',
  },
  statusTextInactive: {
    color: Colors.textLight,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldRow: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  inventoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  inventoryCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  inventoryCardText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inventoryCardButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inventoryCardButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  editButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  editButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#DC2626',
  },
});
