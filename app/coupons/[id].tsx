import { ConfirmModal } from '@/components/ConfirmModal';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { couponService } from '@/services';
import type { CouponDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CouponDetailScreen() {
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [coupon, setCoupon] = useState<CouponDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const coupons = await couponService.getCoupons();
      const found = coupons.find((c) => String(c.id) === String(id));
      if (!found) {
        setError('Cupón no encontrado');
        return;
      }
      setCoupon(found);
    } catch (e: any) {
      setError(e.message || 'Error al cargar el cupón');
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
    if (!coupon) return;
    try {
      await couponService.deleteCoupon(coupon.id);
      toast.success('Cupón eliminado');
      setShowDeleteModal(false);
      router.back();
    } catch (e: any) {
      setShowDeleteModal(false);
      toast.error('Error al eliminar el cupón');
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando..." />;
  }

  if (error || !coupon) {
    return <ErrorState message={error || 'Cupón no encontrado'} onRetry={loadData} />;
  }

  const now = new Date();
  const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
  const isExpired = !!validUntil && validUntil < now;
  const isMaxedOut = !!coupon.usage_limit && (coupon.current_usage || 0) >= coupon.usage_limit;
  const usagePercent = coupon.usage_limit ? ((coupon.current_usage || 0) / coupon.usage_limit) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Cupón</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{coupon.code}</Text>
            <Text style={styles.name}>{coupon.name}</Text>
          </View>
        </View>

        {isExpired && (
          <View style={[styles.banner, styles.bannerDanger]}>
            <Text style={styles.bannerTextDanger}>⚠️ Este cupón ha expirado</Text>
          </View>
        )}
        {!isExpired && isMaxedOut && (
          <View style={[styles.banner, styles.bannerWarning]}>
            <Text style={styles.bannerTextWarning}>⚠️ Este cupón ha alcanzado el límite de usos</Text>
          </View>
        )}
        {!isExpired && !isMaxedOut && !coupon.is_active && (
          <View style={[styles.banner, styles.bannerNeutral]}>
            <Text style={styles.bannerTextNeutral}>ℹ️ Este cupón está inactivo</Text>
          </View>
        )}
        {!isExpired && !isMaxedOut && coupon.is_active && (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Text style={styles.bannerTextSuccess}>✓ Cupón activo y disponible</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Descuento</Text>
            <Text style={styles.discountValue}>{coupon.discount}%</Text>
          </View>

          {coupon.valid_until && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Válido Hasta</Text>
              <Text style={styles.fieldValue}>
                {new Date(coupon.valid_until).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Usos</Text>
            <Text style={styles.fieldValue}>
              {coupon.current_usage ?? 0} / {coupon.usage_limit ?? '∞'}
            </Text>
            {!!coupon.usage_limit && (
              <>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: usagePercent >= 90 ? '#EF4444' : usagePercent >= 70 ? '#F97316' : Colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>{Math.round(usagePercent)}% utilizado</Text>
              </>
            )}
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Estado</Text>
            <Text style={[styles.fieldValue, { color: coupon.is_active ? '#16A34A' : Colors.textSecondary }]}>
              {coupon.is_active ? '✓ Activo' : '× Inactivo'}
            </Text>
          </View>
        </View>

        {(coupon.created_at || coupon.updated_at) && (
          <View style={styles.auditCard}>
            <Text style={styles.auditTitle}>Información de Auditoría</Text>
            {coupon.created_at && (
              <Text style={styles.auditText}>Creado: {new Date(coupon.created_at).toLocaleString()}</Text>
            )}
            {coupon.updated_at && (
              <Text style={styles.auditText}>
                Última actualización: {new Date(coupon.updated_at).toLocaleString()}
              </Text>
            )}
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push({ pathname: '/coupons/new', params: { id: coupon.id } } as any)}
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
        title="Eliminar Cupón"
        message={`¿Estás seguro de eliminar "${coupon.code}"?`}
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
  titleRow: {
    marginBottom: Spacing.md,
  },
  code: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  name: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  banner: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerTextDanger: {
    color: '#991B1B',
    fontSize: FontSize.sm,
  },
  bannerWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  bannerTextWarning: {
    color: '#9A3412',
    fontSize: FontSize.sm,
  },
  bannerNeutral: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  bannerTextNeutral: {
    color: '#374151',
    fontSize: FontSize.sm,
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerTextSuccess: {
    color: '#166534',
    fontSize: FontSize.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  fieldRow: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  discountValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  progressTrack: {
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E5E7EB',
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  auditCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  auditTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  auditText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
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
    backgroundColor: '#DC2626',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  deleteButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
