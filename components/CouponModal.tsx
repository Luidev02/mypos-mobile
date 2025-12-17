import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Coupon } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface CouponModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyCoupon: (discount: number, couponId: number, code: string) => void;
}

export default function CouponModal({ visible, onClose, onApplyCoupon }: CouponModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundCoupon, setFoundCoupon] = useState<Coupon | null>(null);

  const handleSearch = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Ingresa un código de cupón');
      return;
    }

    setIsSearching(true);
    try {
      const coupon = await posService.validateCoupon(couponCode.toUpperCase());

      // Validaciones según documentación web
      if (!coupon.is_active) {
        Alert.alert('Cupón Inactivo', 'Este cupón no está activo');
        setFoundCoupon(null);
        return;
      }

      if (coupon.valid_until) {
        const expirationDate = new Date(coupon.valid_until);
        const now = new Date();
        if (expirationDate < now) {
          Alert.alert('Cupón Expirado', 'Este cupón ha expirado');
          setFoundCoupon(null);
          return;
        }
      }

      if (
        coupon.usage_limit &&
        coupon.current_usage &&
        coupon.current_usage >= coupon.usage_limit
      ) {
        Alert.alert('Límite Alcanzado', 'Este cupón ha alcanzado su límite de uso');
        setFoundCoupon(null);
        return;
      }

      setFoundCoupon(coupon);
    } catch (error: any) {
      Alert.alert('Cupón No Encontrado', 'No existe un cupón con ese código');
      setFoundCoupon(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = () => {
    if (foundCoupon) {
      onApplyCoupon(foundCoupon.discount, foundCoupon.id, foundCoupon.code);
      setCouponCode('');
      setFoundCoupon(null);
      onClose();
    }
  };

  const handleClear = () => {
    setCouponCode('');
    setFoundCoupon(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Cupones de Descuento</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.banner}>
            <Ionicons name="pricetag" size={48} color={Colors.primary} />
            <Text style={styles.bannerTitle}>¿Tienes un cupón?</Text>
            <Text style={styles.bannerText}>
              Ingresa el código para aplicar descuentos especiales a tu compra
            </Text>
          </View>

          <View style={styles.searchSection}>
            <Text style={styles.label}>Código del Cupón</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ej: VERANO2024"
                placeholderTextColor={Colors.textLight}
                value={couponCode}
                onChangeText={(text) => setCouponCode(text.toUpperCase())}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <Text style={styles.searchButtonText}>...</Text>
                ) : (
                  <Ionicons name="search" size={20} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {foundCoupon && (
            <View style={styles.couponCard}>
              <View style={styles.couponHeader}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponTitle}>Cupón Válido</Text>
                  <Text style={styles.couponCode}>{foundCoupon.code}</Text>
                </View>
              </View>

              <View style={styles.couponBody}>
                <Text style={styles.couponName}>{foundCoupon.name}</Text>
                {foundCoupon.description && (
                  <Text style={styles.couponDescription}>{foundCoupon.description}</Text>
                )}

                <View style={styles.couponDetails}>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountValue}>{foundCoupon.discount}%</Text>
                    <Text style={styles.discountLabel}>de descuento</Text>
                  </View>

                  <View style={styles.couponInfo}>
                    {foundCoupon.valid_until && (
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.textLight} />
                        <Text style={styles.infoText}>
                          Válido hasta:{' '}
                          {new Date(foundCoupon.valid_until).toLocaleDateString('es-CO')}
                        </Text>
                      </View>
                    )}
                    {foundCoupon.usage_limit && (
                      <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={16} color={Colors.textLight} />
                        <Text style={styles.infoText}>
                          Usos: {foundCoupon.current_usage} / {foundCoupon.usage_limit}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.couponActions}>
                <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                  <Text style={styles.clearButtonText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.applyButtonText}>Aplicar Cupón</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.hint}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.hintText}>
              Los cupones pueden ofrecer descuentos porcentuales o montos fijos. Verifica la
              fecha de expiración y disponibilidad antes de aplicar.
            </Text>
          </View>

          {/* Ejemplo de cupones disponibles */}
          <View style={styles.availableSection}>
            <Text style={styles.availableTitle}>💡 Cupones de Ejemplo</Text>
            <View style={styles.exampleCoupon}>
              <Text style={styles.exampleCode}>VERANO2024</Text>
              <Text style={styles.exampleDesc}>15% de descuento</Text>
            </View>
            <View style={styles.exampleCoupon}>
              <Text style={styles.exampleCode}>PRIMERACOMPRA</Text>
              <Text style={styles.exampleDesc}>$10.000 de descuento</Text>
            </View>
          </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  banner: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  bannerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bannerText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
  searchSection: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  couponCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.successLight,
  },
  couponTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  couponCode: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  couponBody: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  couponName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  couponDescription: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  couponDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  discountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  discountValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  discountLabel: {
    fontSize: FontSize.xs,
    color: Colors.white,
  },
  couponInfo: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  couponActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
  },
  applyButtonText: {
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
  availableSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  availableTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  exampleCoupon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  exampleCode: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  exampleDesc: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
});
