import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { CashRegister } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'open' | 'close';
  activeShift?: any | null;
}

export default function ShiftModal({ visible, onClose, onSuccess, mode, activeShift }: ShiftModalProps) {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shiftDetails, setShiftDetails] = useState<any>(null);
  const [formData, setFormData] = useState({
    cash_register_id: '',
    base_amount: '',
    final_cash_real: '',
    notes: '',
  });

  useEffect(() => {
    if (visible && mode === 'open') {
      loadCashRegisters();
    }
    if (visible && mode === 'close' && activeShift?.id) {
      loadShiftDetails(activeShift.id);
    }
  }, [visible, mode, activeShift?.id]);

  const loadCashRegisters = async () => {
    try {
      setIsLoading(true);
      const registers = await posService.getCashRegisters();
      setCashRegisters(registers.filter(r => r.is_active));
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las cajas registradoras');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShiftDetails = async (shiftId: number) => {
    try {
      setIsLoading(true);
      const response = await posService.getActiveShift();
      setShiftDetails(response);
    } catch (error) {
      console.error('Error cargando detalles del turno:', error);
      Alert.alert('Error', 'No se pudo cargar la información del turno');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'open') {
      if (!formData.cash_register_id || !formData.base_amount) {
        Alert.alert('Error', 'Complete todos los campos');
        return;
      }

      try {
        setIsLoading(true);
        await posService.openShift({
          cash_register_id: parseInt(formData.cash_register_id),
          base_amount: parseFloat(formData.base_amount),
        });

        Alert.alert('Éxito', 'Turno abierto exitosamente');
        setFormData({ cash_register_id: '', base_amount: '', final_cash_real: '', notes: '' });
        onSuccess();
        onClose();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'No se pudo abrir el turno');
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'close') {
      if (!formData.final_cash_real) {
        Alert.alert('Error', 'Ingrese el efectivo final');
        return;
      }

      try {
        setIsLoading(true);
        await posService.closeShift(activeShift.id, {
          final_cash_real: parseFloat(formData.final_cash_real),
          notes: formData.notes || '',
        });

        Alert.alert('Éxito', 'Turno cerrado exitosamente');
        setFormData({ cash_register_id: '', base_amount: '', final_cash_real: '', notes: '' });
        onSuccess();
        onClose();
      } catch (error: any) {
        console.error('Error gestionando turno:', error);
        Alert.alert('Error', error.response?.data?.message || 'Error al procesar la operación');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{mode === 'open' ? 'Abrir Turno' : 'Cerrar Turno'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {mode === 'open' ? (
            <>
              <View style={styles.info}>
                <Ionicons name="information-circle" size={24} color={Colors.info} />
                <Text style={styles.infoText}>
                  Debe abrir un turno antes de realizar ventas
                </Text>
              </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Caja Registradora *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.registerScroll}
                >
                  {cashRegisters.map((register) => (
                    <TouchableOpacity
                      key={register.id}
                      style={[
                        styles.registerCard,
                        formData.cash_register_id === register.id.toString() && styles.registerCardSelected
                      ]}
                      onPress={() => setFormData({ ...formData, cash_register_id: register.id.toString() })}
                    >
                      <Ionicons 
                        name="cash-outline" 
                        size={24} 
                        color={formData.cash_register_id === register.id.toString() ? Colors.white : Colors.primary} 
                      />
                      <Text style={[
                        styles.registerName,
                        formData.cash_register_id === register.id.toString() && styles.registerNameSelected
                      ]}>
                        {register.name}
                      </Text>
                      <Text style={[
                        styles.registerCode,
                        formData.cash_register_id === register.id.toString() && styles.registerCodeSelected
                      ]}>
                        {register.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Monto Base (Fondo de caja) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 50000"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  value={formData.base_amount}
                  onChangeText={(text) => setFormData({ ...formData, base_amount: text })}
                />
                <Text style={styles.hint}>
                  Este es el dinero inicial con el que abre la caja
                </Text>
              </View>
            </>
          ) : (
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Cargando información del turno...</Text>
              </View>
            ) : (
              <>
                  {/* Información del turno actual */}
                  <View style={styles.shiftInfoCard}>
                    <View style={styles.shiftInfoRow}>
                      <Text style={styles.shiftInfoLabel}>Caja:</Text>
                      <View style={styles.shiftInfoValueContainer}>
                        <Text style={styles.shiftInfoValue}>
                          {activeShift?.cash_register_name || 'N/A'}
                        </Text>
                        {activeShift?.cash_register_code && (
                          <Text style={styles.shiftInfoCode}>({activeShift.cash_register_code})</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.shiftInfoRow}>
                      <Text style={styles.shiftInfoLabel}>Base Inicial:</Text>
                      <Text style={styles.shiftInfoValue}>
                        {formatCurrency(parseFloat(activeShift?.base_amount || '0'))}
                      </Text>
                    </View>

                    <View style={[styles.shiftInfoRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Esperado:</Text>
                      <Text style={styles.totalValue}>
                        {formatCurrency(
                          parseFloat(activeShift?.base_amount || '0') + 
                          parseFloat(activeShift?.final_cash_expected || '0')
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Input de efectivo real */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Efectivo Real en Caja *</Text>
                    <TextInput
                      style={[styles.input, styles.cashInput]}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      value={formData.final_cash_real}
                      onChangeText={(text) => setFormData({ ...formData, final_cash_real: text })}
                    />
                    <Text style={styles.hint}>Ingrese el efectivo contado en caja</Text>
                  </View>

                  {/* Indicador de diferencia */}
                  {formData.final_cash_real && (
                    <View style={[
                      styles.differenceCard,
                      (() => {
                        const baseAmount = parseFloat(activeShift?.base_amount || '0');
                        const cashExpected = parseFloat(activeShift?.final_cash_expected || '0');
                        const expectedTotal = baseAmount + cashExpected;
                        const realCash = parseFloat(formData.final_cash_real || '0');
                        const diff = realCash - expectedTotal;
                        
                        if (diff === 0) return styles.differenceCardPerfect;
                        if (diff > 0) return styles.differenceCardOver;
                        return styles.differenceCardUnder;
                      })()
                    ]}>
                      <Text style={styles.differenceLabel}>
                        {(() => {
                          const baseAmount = parseFloat(activeShift?.base_amount || '0');
                          const cashExpected = parseFloat(activeShift?.final_cash_expected || '0');
                          const expectedTotal = baseAmount + cashExpected;
                          const realCash = parseFloat(formData.final_cash_real || '0');
                          const diff = realCash - expectedTotal;
                          
                          if (diff === 0) return '✓ Cuadre Perfecto';
                          if (diff > 0) return '↑ Sobrante';
                          return '↓ Faltante';
                        })()}
                      </Text>
                      <Text style={styles.differenceValue}>
                        {(() => {
                          const baseAmount = parseFloat(activeShift?.base_amount || '0');
                          const cashExpected = parseFloat(activeShift?.final_cash_expected || '0');
                          const expectedTotal = baseAmount + cashExpected;
                          const realCash = parseFloat(formData.final_cash_real || '0');
                          const diff = realCash - expectedTotal;
                          
                          if (diff === 0) return '$0';
                          return `${diff > 0 ? '+' : ''}${formatCurrency(Math.abs(diff))}`;
                        })()}
                      </Text>
                    </View>
                  )}

                  {/* Notas opcionales */}
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Notas (opcional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Observaciones del cierre..."
                      placeholderTextColor={Colors.textLight}
                      multiline
                      numberOfLines={3}
                      value={formData.notes}
                      onChangeText={(text) => setFormData({ ...formData, notes: text })}
                    />
                  </View>
                </>
            )
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton, 
              mode === 'close' && styles.submitButtonClose,
              isLoading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons 
                  name={mode === 'open' ? 'checkmark-circle' : 'lock-closed'} 
                  size={20} 
                  color={Colors.white} 
                />
                <Text style={styles.submitButtonText}>
                  {mode === 'open' ? 'Abrir Turno' : 'Cerrar Turno'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.info + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.info,
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
  pickerContainer: {
    marginBottom: Spacing.sm,
  },
  registerScroll: {
    marginHorizontal: -Spacing.xs,
  },
  registerCard: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  registerCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  registerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  registerNameSelected: {
    color: Colors.white,
  },
  registerCode: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  registerCodeSelected: {
    color: Colors.white,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonClose: {
    backgroundColor: Colors.error,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  shiftInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  shiftInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftInfoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  shiftInfoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shiftInfoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  shiftInfoCode: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  totalRow: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  cashInput: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  differenceCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
  },
  differenceCardPerfect: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  differenceCardOver: {
    backgroundColor: Colors.info + '15',
    borderColor: Colors.info,
  },
  differenceCardUnder: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  differenceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  differenceValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
});
