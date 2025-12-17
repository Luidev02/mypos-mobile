import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { CashRegister } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

interface ShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ShiftModal({ visible, onClose, onSuccess }: ShiftModalProps) {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cash_register_id: '',
    base_amount: '',
  });

  useEffect(() => {
    if (visible) {
      loadCashRegisters();
    }
  }, [visible]);

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

  const handleSubmit = async () => {
    if (!formData.cash_register_id || !formData.base_amount) {
      Alert.alert('Error', 'Por favor complete todos los campos');
      return;
    }

    try {
      setIsLoading(true);
      await posService.openShift({
        cash_register_id: parseInt(formData.cash_register_id),
        base_amount: parseFloat(formData.base_amount),
      });

      Alert.alert('Éxito', 'Turno abierto exitosamente');
      setFormData({ cash_register_id: '', base_amount: '' });
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo abrir el turno');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Abrir Turno</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
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
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                  <Text style={styles.submitButtonText}>Abrir Turno</Text>
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
    maxHeight: '85%',
    ...Shadow.lg,
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
    padding: Spacing.lg,
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
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
