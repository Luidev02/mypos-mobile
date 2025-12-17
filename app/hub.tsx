import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { getGreeting } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - Spacing.lg * 3) / 2;

interface ModuleCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  description?: string;
}

const modules: ModuleCard[] = [
  {
    id: 'nueva-venta',
    title: 'Nueva Venta',
    icon: 'cart',
    color: Colors.primary,
    route: '/(tabs)',
    description: 'Realizar ventas',
  },
  {
    id: 'productos',
    title: 'Productos',
    icon: 'pricetags',
    color: Colors.primaryLight,
    route: '/products',
    description: 'Gestionar productos',
  },
  {
    id: 'categorias',
    title: 'Categorías',
    icon: 'list',
    color: '#8B5A3C',
    route: '/categories',
    description: 'Organizar productos',
  },
  {
    id: 'clientes',
    title: 'Clientes',
    icon: 'people',
    color: '#6C4B4B',
    route: '/customers',
    description: 'Base de clientes',
  },
  {
    id: 'inventario',
    title: 'Inventario',
    icon: 'cube',
    color: Colors.info,
    route: '/(tabs)/inventory',
    description: 'Control de stock',
  },
  {
    id: 'reportes',
    title: 'Reportes',
    icon: 'bar-chart',
    color: Colors.success,
    route: '/(tabs)/reports',
    description: 'Análisis de ventas',
  },
  {
    id: 'turnos',
    title: 'Turnos',
    icon: 'time',
    color: Colors.warning,
    route: '/shifts',
    description: 'Gestión de cajas',
  },
  {
    id: 'ventas',
    title: 'Ventas',
    icon: 'receipt',
    color: '#9333EA',
    route: '/sales',
    description: 'Historial',
  },
  {
    id: 'cupones',
    title: 'Cupones',
    icon: 'ticket',
    color: '#EC4899',
    route: '/coupons',
    description: 'Descuentos',
  },
  {
    id: 'impuestos',
    title: 'Impuestos',
    icon: 'calculator',
    color: '#F59E0B',
    route: '/taxes',
    description: 'Configuración',
  },
  {
    id: 'empresa',
    title: 'Empresa',
    icon: 'business',
    color: '#10B981',
    route: '/company',
    description: 'Datos empresa',
  },
  {
    id: 'perfil',
    title: 'Mi Perfil',
    icon: 'person',
    color: '#3B82F6',
    route: '/(tabs)/more',
    description: 'Configuración',
  },
];

export default function HubScreen() {
  const { user, logout } = useAuth();

  const handleModulePress = (route: string) => {
    router.push(route as any);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {user?.username}</Text>
          <Text style={styles.company}>{user?.company_name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modulesGrid}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={[styles.moduleCard, { backgroundColor: module.color }]}
              onPress={() => handleModulePress(module.route)}
              activeOpacity={0.8}
            >
              <View style={styles.moduleIcon}>
                <Ionicons name={module.icon} size={40} color={Colors.white} />
              </View>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              {module.description && (
                <Text style={styles.moduleDescription}>{module.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  company: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moduleCard: {
    width: cardWidth,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  moduleIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  moduleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  moduleDescription: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});
