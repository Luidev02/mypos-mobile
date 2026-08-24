import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SearchBar } from '@/components/SearchBar';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { couponService } from '@/services';
import type { CouponDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getStatus(coupon: CouponDetailed) {
  const now = new Date();
  const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
  const isExpired = !!validUntil && validUntil < now;
  const isMaxedOut = !!coupon.usage_limit && (coupon.current_usage || 0) >= coupon.usage_limit;

  if (isExpired) return { label: 'Expirado', bg: '#FEE2E2', color: '#991B1B' };
  if (isMaxedOut) return { label: 'Agotado', bg: '#FFEDD5', color: '#9A3412' };
  if (!coupon.is_active) return { label: 'Inactivo', bg: '#F3F4F6', color: '#374151' };
  return { label: 'Activo', bg: '#DCFCE7', color: '#166534' };
}

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<CouponDetailed[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await couponService.getCoupons();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar cupones');
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCoupons();
    }, [loadCoupons])
  );

  const filtered = coupons.filter(
    (c) =>
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: CouponDetailed }) => {
    const status = getStatus(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/coupons/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{item.code}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          {item.name && <Text style={styles.name}>{item.name}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Usos: {item.current_usage ?? 0}/{item.usage_limit ?? '∞'}
            </Text>
            {item.valid_until && (
              <Text style={styles.metaText}>
                Hasta: {new Date(item.valid_until).toLocaleDateString('es-CO')}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.discountBox}>
          <Text style={styles.discountValue}>{item.discount}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <LoadingState message="Cargando cupones..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadCoupons} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cupones de Descuento</Text>
        <TouchableOpacity onPress={() => router.push('/coupons/new' as any)} style={styles.addButton}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar cupón por código o nombre..."
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.listBody}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="pricetag-outline"
            title="No hay cupones"
            message="Crea un nuevo cupón para comenzar"
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
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  code: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  name: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  discountBox: {
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  discountValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
});
