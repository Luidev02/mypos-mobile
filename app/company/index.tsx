import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Réplica de las 8 pestañas de `company/index.jsx` del web, partidas en
// pantallas separadas (recomendación explícita de esta fase) en vez de un
// sistema de tabs. "Integraciones" (pestaña "api" del web) se omite: no
// existe ningún endpoint `/api/integrations/*` en el backend — toda esa
// pestaña (tarjetas Siigo/Alegra/Factus/etc.) es funcionalidad muerta
// incluso en el propio web. "Roles"/"Usuarios" ya existen en
// `app/management/` y se enlazan directo desde acá en vez de duplicarlos.
const MODULES = [
  { id: 'general', title: 'Información General', subtitle: 'Datos de la empresa', icon: 'business-outline', route: '/company/general', color: Colors.primary },
  { id: 'roles', title: 'Roles y Permisos', subtitle: 'Gestionar roles del sistema', icon: 'shield-checkmark-outline', route: '/management/roles', color: '#F59E0B' },
  { id: 'users', title: 'Usuarios', subtitle: 'Gestionar usuarios y accesos', icon: 'people-outline', route: '/management/users', color: '#8B5CF6' },
  { id: 'resolutions', title: 'Resoluciones de Facturación', subtitle: 'Numeración autorizada DIAN', icon: 'document-text-outline', route: '/company/resolutions', color: '#0EA5E9' },
  { id: 'dian', title: 'Facturación Electrónica DIAN', subtitle: 'Configuración MATIAS', icon: 'receipt-outline', route: '/company/dian', color: '#059669' },
  { id: 'plan', title: 'Plan y Recursos', subtitle: 'Consumo y límites del plan', icon: 'stats-chart-outline', route: '/company/plan', color: '#DC2626' },
  { id: 'version', title: 'Versión', subtitle: 'Información del sistema', icon: 'information-circle-outline', route: '/company/version', color: Colors.textSecondary },
] as const;

function CompanyScreenContent() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Empresa</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        {MODULES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.moduleCard}
            onPress={() => router.push(m.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.moduleIcon, { backgroundColor: m.color + '20' }]}>
              <Ionicons name={m.icon as any} size={28} color={m.color} />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>{m.title}</Text>
              <Text style={styles.moduleSubtitle}>{m.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function CompanyScreen() {
  return (
    <RequirePermission perm="view_settings">
      <CompanyScreenContent />
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
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  moduleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
});
