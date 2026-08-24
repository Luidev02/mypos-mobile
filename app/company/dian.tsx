import { LoadingState } from '@/components/LoadingState';
import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { matiasConfigService } from '@/services/extended';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function DianScreenContent() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [savedEmail, setSavedEmail] = useState('');
  const [isActive, setIsActive] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [environment, setEnvironment] = useState<'TEST' | 'PRODUCTION'>('TEST');
  const [testResult, setTestResult] = useState<{ connected: boolean; error?: string } | null>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const config = await matiasConfigService.getConfig();
      setSavedEmail(config.email || '');
      setEmail(config.email || '');
      setIsActive(!!config.is_active);
      setEnvironment(config.environment || 'TEST');
    } catch (e) {
      // Sin configuración previa — no es un error, es el estado inicial.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!email.trim()) {
      toast.error('El email es requerido');
      return;
    }
    if (!savedEmail && !password.trim()) {
      toast.error('La contraseña es requerida la primera vez');
      return;
    }
    try {
      setIsSaving(true);
      await matiasConfigService.saveConfig({
        email: email.trim(),
        password: password.trim(),
        environment,
      });
      toast.success('Configuración guardada');
      setPassword('');
      setTestResult(null);
      await loadConfig();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await matiasConfigService.testConnection(
        email.trim() && password.trim() ? { email: email.trim(), password: password.trim() } : undefined
      );
      setTestResult(result);
      if (result.connected) {
        toast.success('Conexión exitosa con MATIAS');
      } else {
        toast.error(result.error || 'No se pudo conectar con MATIAS');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo probar la conexión');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando configuración DIAN..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Facturación Electrónica DIAN</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={[styles.statusBanner, isActive ? styles.statusBannerOk : styles.statusBannerWarning]}>
          <Ionicons
            name={isActive ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={isActive ? '#166534' : '#92400E'}
          />
          <Text style={[styles.statusBannerText, { color: isActive ? '#166534' : '#92400E' }]}>
            {isActive ? `Configurado con ${savedEmail}` : 'MATIAS aún no está configurado'}
          </Text>
        </View>

        <Text style={styles.label}>
          Email <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="cuenta@proveedor.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>
          Contraseña {!savedEmail && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            placeholder={savedEmail ? 'Dejar vacío para mantener la actual' : 'Contraseña'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Ambiente</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={environment} onValueChange={(v) => setEnvironment(v)}>
            <Picker.Item label="Pruebas (TEST)" value="TEST" />
            <Picker.Item label="Producción (PRODUCTION)" value="PRODUCTION" />
          </Picker>
        </View>

        {testResult && (
          <View style={[styles.testResult, testResult.connected ? styles.testResultOk : styles.testResultError]}>
            <Text style={[styles.testResultText, { color: testResult.connected ? '#166534' : '#991B1B' }]}>
              {testResult.connected ? '✓ Conexión exitosa' : `✗ ${testResult.error || 'No se pudo conectar'}`}
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.testButton} onPress={handleTest} disabled={isTesting}>
            {isTesting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.testButtonText}>Probar Conexión</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DianScreen() {
  return (
    <RequirePermission perm="manage_settings">
      <DianScreenContent />
    </RequirePermission>
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
    fontSize: FontSize.md,
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
    paddingBottom: Spacing.xl,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusBannerOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusBannerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  testResult: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  testResultOk: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  testResultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  testResultText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  testButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  testButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  saveButton: {
    flex: 1,
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
});
