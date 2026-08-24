import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import packageInfo from '../../package.json';

// Igual que la pestaña "Versión" del web: contenido 100% estático, sin
// llamadas a la API (confirmado leyendo `company/index.jsx` completo).
const FEATURES = [
  'Punto de venta con productos pesables',
  'Inventario multi-bodega y ajustes',
  'Turnos de caja y cajas registradoras',
  'Facturación electrónica DIAN',
  'Reportes y exportación a Excel/PDF',
  'Gestión de compras y proveedores',
];

export default function VersionScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Versión</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.logoCard}>
          <Ionicons name="storefront" size={48} color={Colors.primary} />
          <Text style={styles.appName}>myPOS Mobile</Text>
          <Text style={styles.appVersion}>Versión {packageInfo.version}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Características</Text>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <Text style={styles.supportText}>
            Para soporte técnico o preguntas sobre tu cuenta, contacta al administrador de tu empresa
            o al equipo de myPOS.
          </Text>
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
    padding: Spacing.md,
  },
  logoCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  appName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  appVersion: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  supportText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
