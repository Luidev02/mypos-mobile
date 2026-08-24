import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { companyService } from '@/services/extended';
import { posService } from '@/services';
import type { CashRegister, PlanUsage } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLAN_NAMES: Record<string, string> = {
  tienda_pequena: 'Tienda Pequeña',
  tienda_mediana: 'Tienda Mediana',
  tienda_grande: 'Tienda Grande',
  super_tienda: 'Super Tienda',
};

export default function CashRegistersScreen() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await posService.getCashRegisters();
      setRegisters(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar cajas registradoras');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      companyService
        .getPlanUsage()
        .then(setPlanUsage)
        .catch(() => setPlanUsage(null));
    }, [loadData])
  );

  const canMultiCash = planUsage?.planConfig?.multiCash ?? true;
  const atLimit = !canMultiCash && registers.length >= 1;

  if (isLoading) {
    return <LoadingState message="Cargando cajas..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const renderItem = ({ item }: { item: CashRegister }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.registerName}>{item.name}</Text>
          <Text style={styles.registerCode}>{item.code}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
            {item.is_active ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({ pathname: '/cash-registers/new', params: { id: item.id } } as any)}
      >
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cajas Registradoras</Text>
        <TouchableOpacity
          onPress={() => !atLimit && router.push('/cash-registers/new' as any)}
          style={styles.addButton}
          disabled={atLimit}
        >
          <Ionicons name={atLimit ? 'lock-closed' : 'add'} size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {planUsage && (
        <View style={styles.planBadgeRow}>
          <View style={[styles.planBadge, atLimit ? styles.planBadgeLimit : styles.planBadgeOk]}>
            <Text style={[styles.planBadgeText, atLimit ? styles.planBadgeTextLimit : styles.planBadgeTextOk]}>
              💰 {registers.length} caja{registers.length !== 1 ? 's' : ''} ·{' '}
              {PLAN_NAMES[planUsage.plan] || planUsage.plan}
            </Text>
          </View>
        </View>
      )}

      {atLimit && (
        <View style={styles.limitBanner}>
          <Text style={styles.limitBannerIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.limitBannerTitle}>Límite de cajas registradoras alcanzado</Text>
            <Text style={styles.limitBannerText}>
              Tu plan actual solo permite 1 caja registradora. Actualiza tu plan para agregar más.
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={registers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title="No hay cajas registradoras"
            message="Crea una caja registradora para comenzar"
          />
        }
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 8 : Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  planBadgeOk: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  planBadgeLimit: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  planBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  planBadgeTextOk: {
    color: '#166534',
  },
  planBadgeTextLimit: {
    color: '#991B1B',
  },
  limitBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    margin: Spacing.md,
    marginBottom: 0,
    padding: Spacing.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
  },
  limitBannerIcon: {
    fontSize: FontSize.lg,
  },
  limitBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#92400E',
  },
  limitBannerText: {
    fontSize: FontSize.xs,
    color: '#92400E',
    marginTop: 2,
  },
  listBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  registerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  registerCode: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  statusTextActive: {
    color: '#166534',
  },
  statusTextInactive: {
    color: '#374151',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#2563EB',
  },
});
