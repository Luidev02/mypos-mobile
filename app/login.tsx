import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirigir al hub si ya está autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/(tabs)/');
    }
  }, [isAuthenticated, authLoading]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingrese usuario y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)/');
    } catch (error: any) {
      Alert.alert(
        'Error de Autenticación',
        error.response?.data?.message || 'Usuario o contraseña incorrectos'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras verifica la sesión
  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="cart" size={80} color={Colors.primary} />
          </View>
          <Text style={styles.title}>MyPOS</Text>
          <Text style={styles.subtitle}>Sistema de Punto de Venta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Usuario"
              placeholderTextColor={Colors.textLight}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Credenciales de prueba:</Text>
            <Text style={styles.footerSubtext}>Usuario: admin@tecnostore.com</Text>
            <Text style={styles.footerSubtext}>Contraseña: admin123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.lg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  footerSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontWeight: FontWeight.medium,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
  },
});
