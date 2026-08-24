import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { couponService } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function CouponFormScreen() {
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const toast = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isFetching, setIsFetching] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const coupons = await couponService.getCoupons();
        const coupon = coupons.find((c) => String(c.id) === String(id));
        if (!coupon) {
          setError('Cupón no encontrado');
          return;
        }
        setCode(coupon.code || '');
        setName(coupon.name || '');
        setDiscount(String(coupon.discount ?? ''));
        setUsageLimit(String(coupon.usage_limit ?? ''));
        setValidUntil(coupon.valid_until ? coupon.valid_until.split(' ')[0].split('T')[0] : '');
      } catch (e) {
        console.error('Error cargando cupón:', e);
        setError('Error al cargar el cupón');
      } finally {
        setIsFetching(false);
      }
    })();
  }, [id, isEdit]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('El código es requerido');
      return;
    }
    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    const discountNum = parseFloat(discount);
    if (!discount || Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast.error('El descuento debe ser un porcentaje entre 0 y 100');
      return;
    }
    const usageLimitNum = parseInt(usageLimit, 10);
    if (!usageLimit || Number.isNaN(usageLimitNum) || usageLimitNum < 1) {
      toast.error('El límite de usos debe ser mayor a 0');
      return;
    }
    if (!DATE_RE.test(validUntil)) {
      toast.error('Ingrese la fecha de vigencia en formato AAAA-MM-DD');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      // Igual que el web (`coupons/form.jsx`): se convierte a formato MySQL.
      const mysqlDate = `${validUntil} 23:59:59`;
      const payload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount: discountNum,
        usage_limit: usageLimitNum,
        valid_until: mysqlDate,
      };

      if (isEdit) {
        await couponService.updateCoupon(Number(id), { id: Number(id), ...payload });
        toast.success('Cupón actualizado');
      } else {
        await couponService.createCoupon(payload);
        toast.success('Cupón creado');
      }
      router.back();
    } catch (e: any) {
      const message = e.response?.data?.message || 'Error al guardar el cupón';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) {
    return <LoadingState message="Cargando cupón..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Editar Cupón' : 'Nuevo Cupón'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.content}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>
            Código del Cupón <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="DESCUENTO10"
            placeholderTextColor={Colors.textLight}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>
            Nombre del Cupón <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Descuento de Temporada"
            placeholderTextColor={Colors.textLight}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>
            Descuento (%) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            placeholderTextColor={Colors.textLight}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>Porcentaje de descuento (0-100)</Text>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                Límite de Usos <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={Colors.textLight}
                value={usageLimit}
                onChangeText={setUsageLimit}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>
                Válido Hasta <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={Colors.textLight}
                value={validUntil}
                onChangeText={setValidUntil}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{isEdit ? 'Actualizar Cupón' : 'Crear Cupón'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: Spacing.lg,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: FontSize.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
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
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionsRow: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
