import { ConfirmModal } from '@/components/ConfirmModal';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { purchaseService } from '@/services/extended';
import type { PurchaseDetailed, PurchaseStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_META: Record<PurchaseStatus, { label: string; bg: string; color: string }> = {
  ordered: { label: 'Ordenada', bg: '#FEF3C7', color: '#92400E' },
  received: { label: 'Recibida', bg: '#DCFCE7', color: '#166534' },
  cancelled: { label: 'Cancelada', bg: '#FEE2E2', color: '#991B1B' },
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [purchase, setPurchase] = useState<PurchaseDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const loadPurchase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await purchaseService.getPurchase(Number(id));
      setPurchase(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar la compra');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPurchase();
    }, [loadPurchase])
  );

  const changeStatus = async (status: PurchaseStatus) => {
    try {
      setIsChangingStatus(true);
      await purchaseService.updatePurchaseStatus(Number(id), status);
      toast.success(status === 'received' ? 'Compra marcada como recibida' : 'Compra cancelada');
      setConfirmCancel(false);
      loadPurchase();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo actualizar el estado');
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !purchase) {
    return <ErrorState message={error || 'Compra no encontrada'} onRetry={loadPurchase} />;
  }

  const meta = STATUS_META[purchase.status] || STATUS_META.ordered;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Compra</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.supplierName}>{purchase.supplier_name || 'Proveedor'}</Text>
            {purchase.supplier_nit && <Text style={styles.supplierNit}>NIT: {purchase.supplier_nit}</Text>}
            {purchase.invoice_number_supplier && (
              <Text style={styles.invoiceNumber}>Factura: {purchase.invoice_number_supplier}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Fecha de Compra</Text>
              <Text style={styles.infoValue}>
                {new Date(purchase.purchase_date).toLocaleDateString('es-CO')}
              </Text>
            </View>
          </View>
          {purchase.warehouse_name && (
            <View style={[styles.infoRow, { marginTop: Spacing.sm }]}>
              <Ionicons name="business-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Bodega</Text>
                <Text style={styles.infoValue}>{purchase.warehouse_name}</Text>
              </View>
            </View>
          )}
          {purchase.user_name && (
            <View style={[styles.infoRow, { marginTop: Spacing.sm }]}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Registrada por</Text>
                <Text style={styles.infoValue}>{purchase.user_name}</Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Productos</Text>
        <View style={styles.itemsCard}>
          {purchase.items && purchase.items.length > 0 ? (
            purchase.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.product_title || `Producto #${item.product_id}`}</Text>
                  {item.sku && <Text style={styles.itemSku}>SKU: {item.sku}</Text>}
                  <Text style={styles.itemQty}>
                    {item.quantity} x ${Number(item.unit_cost).toFixed(0)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>${Number(item.subtotal).toFixed(0)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItems}>No hay productos registrados</Text>
          )}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${Number(purchase.total || 0).toFixed(0)}</Text>
        </View>

        {purchase.status !== 'cancelled' && (
          <View style={styles.actionsRow}>
            {purchase.status === 'ordered' && (
              <TouchableOpacity
                style={styles.receiveButton}
                onPress={() => changeStatus('received')}
                disabled={isChangingStatus}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.receiveButtonText}>Marcar como Recibida</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelPurchaseButton}
              onPress={() => setConfirmCancel(true)}
              disabled={isChangingStatus}
            >
              <Text style={styles.cancelPurchaseButtonText}>Cancelar Compra</Text>
            </TouchableOpacity>
          </View>
        )}

        {purchase.status === 'received' && (
          <Text style={styles.receivedNote}>
            El stock de estos productos ya se sumó a la bodega al registrar esta compra.
          </Text>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmCancel}
        title="Cancelar Compra"
        message="¿Estás seguro de cancelar esta compra? Esta acción no revierte el stock si la compra ya fue recibida."
        confirmText="Cancelar Compra"
        type="danger"
        loading={isChangingStatus}
        onConfirm={() => changeStatus('cancelled')}
        onCancel={() => setConfirmCancel(false)}
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  supplierName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  supplierNit: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  invoiceNumber: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  itemsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  itemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  itemSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  itemQty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  noItems: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.lg,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  receiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#16A34A',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  receiveButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  cancelPurchaseButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  cancelPurchaseButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#DC2626',
  },
  receivedNote: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
