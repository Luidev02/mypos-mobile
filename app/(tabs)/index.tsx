import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ModuleCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  /** Permiso `view_*` requerido — omitido si el módulo es siempre visible. */
  perm?: string;
}

// Mismo mapeo permiso → módulo que `BtnHub.jsx` en el web.
const modules: ModuleCard[] = [
  { id: 'pos', title: 'Punto de Venta', icon: 'cart', route: '/(tabs)/pos', color: Colors.primary, perm: 'view_pos' },
  { id: 'categories', title: 'Categorías', icon: 'grid', route: '/categories', color: Colors.primaryLight, perm: 'view_categories' },
  { id: 'products', title: 'Productos', icon: 'pricetag', route: '/products', color: Colors.footer, perm: 'view_products' },
  { id: 'customers', title: 'Clientes', icon: 'people', route: '/customers', color: '#8B6F6F', perm: 'view_customers' },
  { id: 'sales', title: 'Ventas', icon: 'receipt', route: '/sales', color: Colors.primaryDark, perm: 'view_sales' },
  { id: 'inventory', title: 'Inventario', icon: 'cube', route: '/(tabs)/inventory', color: '#9D7E7E', perm: 'view_inventory' },
  { id: 'warehouses', title: 'Bodegas', icon: 'business', route: '/warehouses', color: '#A08080', perm: 'view_warehouses' },
  { id: 'taxes', title: 'Impuestos', icon: 'calculator', route: '/taxes', color: Colors.dark, perm: 'view_taxes' },
  { id: 'coupons', title: 'Cupones', icon: 'gift', route: '/coupons', color: '#6D5555', perm: 'view_coupons' },
  { id: 'shifts', title: 'Turnos', icon: 'sync', route: '/shifts', color: '#B08968', perm: 'view_shifts' },
  { id: 'cashRegisters', title: 'Cajas', icon: 'cash', route: '/cash-registers', color: '#8B7355', perm: 'view_pos' },
  { id: 'purchases', title: 'Compras', icon: 'bag-handle', route: '/purchases', color: '#5C4444', perm: 'view_purchases' },
  { id: 'reports', title: 'Reportes', icon: 'bar-chart', route: '/(tabs)/reports', color: Colors.success, perm: 'view_reports' },
  { id: 'company', title: 'Empresa', icon: 'settings', route: '/company', color: Colors.foreground, perm: 'view_settings' },
  { id: 'importExport', title: 'Importar/Exportar', icon: 'cloud-upload', route: '/import-export', color: '#0EA5E9', perm: 'view_products' },
  { id: 'aiChat', title: 'Asistente IA', icon: 'sparkles', route: '/ai-chat', color: '#7C3AED', perm: 'view_settings' },
  // Perfil no requiere permiso — cualquier usuario autenticado accede al suyo.
  { id: 'profile', title: 'Perfil', icon: 'person', route: '/profile', color: '#7A6060' },
];

export default function HubScreen() {
  const { logout, user } = useAuth();
  const { can, loading: loadingPermissions } = usePermissions();
  const visibleModules = modules.filter((m) => !m.perm || can(m.perm));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Ionicons name="apps" size={24} color={Colors.white} />
          <Text style={styles.topBarTitle}>MyPOS</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.subtitle}>Selecciona un módulo para comenzar</Text>
        </View>

        {loadingPermissions ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : (
          <View style={styles.grid}>
            {visibleModules.map((module) => (
              <TouchableOpacity
                key={module.id}
                style={styles.card}
                onPress={() => router.push(module.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: module.color }]}>
                  <Ionicons name={module.icon} size={32} color={Colors.white} />
                </View>
                <Text style={styles.cardTitle}>{module.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryDark,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topBarTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  logoutButton: {
    padding: Spacing.xs,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  welcomeSection: {
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
});
