import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { posService } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CashRegisterFormScreen() {
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const toast = useToast();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const register = await posService.getCashRegister(Number(id));
        setName(register.name || '');
        setCode(register.code || '');
        setIsActive(register.is_active !== false);
      } catch (e) {
        console.error('Error cargando caja:', e);
        setError('Error al cargar la caja');
      } finally {
        setIsFetching(false);
      }
    })();
  }, [id, isEdit]);

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      if (isEdit) {
        await posService.updateCashRegister(Number(id), {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          is_active: isActive,
        });
        toast.success('Caja actualizada');
      } else {
        await posService.createCashRegister({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          is_active: isActive,
        });
        toast.success('Caja creada');
      }
      router.back();
    } catch (e: any) {
      const message = e.response?.data?.message || e.response?.data?.error || 'Error al guardar la caja';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) {
    return <LoadingState message="Cargando caja..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Editar Caja Registradora' : 'Nueva Caja Registradora'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>
          Nombre <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Caja Principal"
          placeholderTextColor={Colors.textLight}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>
          Código <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, isEdit && styles.inputDisabled]}
          placeholder="CAJA-01"
          placeholderTextColor={Colors.textLight}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          editable={!isEdit}
        />
        {isEdit && <Text style={styles.hint}>El código no se puede modificar</Text>}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Caja activa</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: Colors.primary }} />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>{isEdit ? 'Actualizar' : 'Crear Caja'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSaving}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  inputDisabled: {
    backgroundColor: Colors.background,
    color: Colors.textLight,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  actionsRow: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
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
