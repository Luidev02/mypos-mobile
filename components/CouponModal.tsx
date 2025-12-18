import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Coupon } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
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
      Alert.alert('Error', 'Por favor ingrese código');
      return;
    }

    setIsSearching(true);
    try {
      const couponData = await posService.validateCoupon(couponCode.toUpperCase().trim());

      if (!couponData || !couponData.id) {
        Alert.alert('No encontrado', 'Cupón no encontrado');
        setFoundCoupon(null);
        setIsSearching(false);
        return;
      }

      // Verificar si el cupón está activo
      if (!couponData.is_active) {
        Alert.alert('Cupón inactivo', 'Este cupón no está activo');
        setFoundCoupon(null);
        setIsSearching(false);
        return;
      }

      // Verificar si el cupón ha expirado
      if (couponData.valid_until) {
        const expirationDate = new Date(couponData.valid_until);
        const now = new Date();
        if (expirationDate < now) {
          Alert.alert('Cupón expirado', 'Este cupón ha expirado');
          setFoundCoupon(null);
          setIsSearching(false);
          return;
        }
      }

      // Verificar límite de uso
      if (couponData.usage_limit && couponData.current_usage && couponData.current_usage >= couponData.usage_limit) {
        Alert.alert('Límite alcanzado', 'Este cupón ha alcanzado su límite de uso');
        setFoundCoupon(null);
        setIsSearching(false);
        return;
      }

      setFoundCoupon(couponData);
    } catch (error: any) {
      console.error('Error buscando cupón:', error);
      Alert.alert('Error', 'Cupón no encontrado o inválido');
      setFoundCoupon(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = () => {
    if (!foundCoupon || !foundCoupon.id) {
      Alert.alert('Error', 'Por favor busque un cupón válido primero');
      return;
    }
    // Pasar el descuento y el ID del cupón
    onApplyCoupon(foundCoupon.discount, foundCoupon.id, foundCoupon.code);
    // Limpiar estado
    setCouponCode('');
    setFoundCoupon(null);
    onClose();
  };

  const handleClose = () => {
    setCouponCode('');
    setFoundCoupon(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>🎟️ Cupón</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Buscador */}
          <View style={styles.searchSection}>
            <Text style={styles.label}>Buscar Código de Cupón</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Buscar código de cupón"
                placeholderTextColor={Colors.textLight}
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                editable={!isSearching}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color={Colors.white} />
                    <Text style={styles.searchButtonText}>Buscar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Información del cupón */}
          <View style={styles.couponInfoCard}>
            <View style={styles.couponInfoRow}>
              <View style={styles.couponInfoLeft}>
                <Text style={styles.couponInfoLabel}>Nombre del Cupón</Text>
                <Text style={styles.couponInfoValue}>
                  {foundCoupon?.name || foundCoupon?.description || 'Sin información'}
                </Text>
              </View>
              <View style={styles.couponInfoRight}>
                <Text style={styles.couponInfoLabel}>Descuento</Text>
                <Text style={styles.discountValue}>
                  {foundCoupon?.discount ? `${foundCoupon.discount}%` : '0%'}
                </Text>
              </View>
            </View>
            
            {foundCoupon?.code && (
              <View style={styles.couponCodeSection}>
                <Text style={styles.couponCodeLabel}>Código: </Text>
                <Text style={styles.couponCodeValue}>{foundCoupon.code}</Text>
              </View>
            )}
          </View>

          {/* Botón usar cupón */}
          <TouchableOpacity
            style={[styles.applyButton, !foundCoupon?.id && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={!foundCoupon?.id}
          >
            <Text style={styles.applyButtonText}>
              {foundCoupon?.id ? '✓ Usar Cupón' : 'Busque un cupón primero'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: FontSize.xxl,
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
  searchSection: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'stretch',
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.text,
    backgroundColor: Colors.white,
    height: 55,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
    minWidth: 100,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  couponInfoCard: {
    backgroundColor: '#FAF7F4',
    borderWidth: 2,
    borderColor: '#D4C4B0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  couponInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  couponInfoLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  couponInfoRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  couponInfoLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#6B4423',
  },
  couponInfoValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#3d2713',
  },
  discountValue: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#6B4423',
  },
  couponCodeSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: '#E5DDD5',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  couponCodeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#6B4423',
  },
  couponCodeValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#3d2713',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  applyButton: {
    backgroundColor: '#6B4423',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadow.md,
    height: 55,
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.4,
  },
  applyButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
