import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Shift } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface CloseShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeShift: Shift | null;
}

export default function CloseShiftModal({
  visible,
  onClose,
  onSuccess,
  activeShift,
}: CloseShiftModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    final_cash_real: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.final_cash_real) {
      Alert.alert('Error', 'Debe ingresar el efectivo real en caja');
      return;
    }

    if (!activeShift || !activeShift.id) {
      Alert.alert('Error', 'No hay un turno activo para cerrar');
      return;
    }

    const finalCashReal = parseFloat(formData.final_cash_real);
    const expectedCash = activeShift.final_cash_expected || activeShift.base_amount;
    const difference = finalCashReal - expectedCash;

    Alert.alert(
      'Confirmar Cierre de Turno',
      `Efectivo Esperado: ${formatCurrency(expectedCash)}\n` +
        `Efectivo Real: ${formatCurrency(finalCashReal)}\n` +
        `Diferencia: ${formatCurrency(Math.abs(difference))} ${difference >= 0 ? '(Sobrante)' : '(Faltante)'}\n\n` +
        '¿Está seguro de cerrar el turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Turno',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await posService.closeShift(activeShift.id, {
                final_cash_real: finalCashReal,
                notes: formData.notes,
              });

              Alert.alert('Éxito', 'Turno cerrado exitosamente', [
                {
                  text: 'OK',
                  onPress: () => {
                    setFormData({ final_cash_real: '', notes: '' });
                    onSuccess();
                    onClose();
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cerrar el turno');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!activeShift) {
    return null;
  }

  const expectedCash = activeShift.final_cash_expected || activeShift.base_amount;
  const finalCashReal = parseFloat(formData.final_cash_real || '0');
  const difference = finalCashReal - expectedCash;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Cerrar Turno</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Información del turno */}
            <View style={styles.shiftInfo}>
              <View style={styles.shiftInfoHeader}>
                <Ionicons name="time" size={32} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.shiftInfoTitle}>Turno #{activeShift.id}</Text>
                  <Text style={styles.shiftInfoSubtitle}>
                    {activeShift.cash_register_name || `Caja #${activeShift.cash_register_id}`}
                  </Text>
                </View>
              </View>

              <View style={styles.shiftInfoDetails}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Hora de apertura:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(activeShift.start_time).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Monto base:</Text>
                  <Text style={styles.infoValue}>{formatCurrency(activeShift.base_amount)}</Text>
                </View>
                {activeShift.warehouse_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Bodega:</Text>
                    <Text style={styles.infoValue}>{activeShift.warehouse_name}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Resumen de efectivo */}
            <View style={styles.cashSummary}>
              <Text style={styles.sectionTitle}>Resumen de Efectivo</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Efectivo Esperado:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(expectedCash)}</Text>
              </View>

              {formData.final_cash_real && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Efectivo Real:</Text>
                    <Text style={styles.summaryValue}>{formatCurrency(finalCashReal)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.summaryTotalLabel}>Diferencia:</Text>
                    <Text
                      style={[
                        styles.summaryTotalValue,
                        { color: difference >= 0 ? Colors.success : Colors.error },
                      ]}
                    >
                      {difference >= 0 ? '+' : ''}
                      {formatCurrency(difference)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Formulario */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Efectivo Real en Caja <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 450000"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                value={formData.final_cash_real}
                onChangeText={(text) => setFormData({ ...formData, final_cash_real: text })}
              />
              <Text style={styles.hint}>Cuente todo el efectivo físico en la caja</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notas (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ej: Cierre normal del día, diferencia por cambio..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
              />
              <Text style={styles.hint}>Ingrese cualquier observación o nota relevante</Text>
            </View>

            {/* Advertencia */}
            <View style={styles.warning}>
              <Ionicons name="warning" size={24} color={Colors.warning} />
              <Text style={styles.warningText}>
                Una vez cerrado el turno, no podrá realizar más ventas hasta abrir uno nuevo.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isLoading || !formData.final_cash_real}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.submitButtonText}>Cerrar Turno</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  shiftInfo: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  shiftInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  shiftInfoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  shiftInfoSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  shiftInfoDetails: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  cashSummary: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  summaryTotal: {
    borderTopWidth: 2,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  summaryTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  warning: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.error,
  },
  submitButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
