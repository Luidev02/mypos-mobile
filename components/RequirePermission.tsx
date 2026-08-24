import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface RequirePermissionProps {
  perm: string;
  children: ReactNode;
}

/**
 * Envuelve una pantalla completa: mientras carga permisos muestra un
 * spinner, y si el usuario no tiene `perm` muestra un aviso de acceso
 * denegado **sin** cerrar sesión ni redirigir — igual que hace el 403 en
 * `services/api.ts`.
 */
export function RequirePermission({ perm, children }: RequirePermissionProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!can(perm)) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={56} color={Colors.textLight} />
        <Text style={styles.title}>Sin permiso</Text>
        <Text style={styles.message}>No tienes acceso a este módulo. Contacta a un administrador.</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
});
