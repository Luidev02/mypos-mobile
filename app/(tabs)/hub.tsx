import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ModuleCard {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const modules: ModuleCard[] = [
  { id: 'pos', title: 'Punto de Venta', icon: 'cart', route: '/(tabs)', color: Colors.primary },
  { id: 'categories', title: 'Categorías', icon: 'grid', route: '/categories', color: Colors.primaryLight },
  { id: 'products', title: 'Productos', icon: 'pricetag', route: '/products', color: Colors.footer },
  { id: 'customers', title: 'Clientes', icon: 'people', route: '/customers', color: '#8B6F6F' },
  { id: 'sales', title: 'Ventas', icon: 'receipt', route: '/sales', color: Colors.primaryDark },
  { id: 'inventory', title: 'Inventario', icon: 'cube', route: '/(tabs)/inventory', color: '#9D7E7E' },
  { id: 'warehouses', title: 'Bodegas', icon: 'business', route: '/warehouses', color: '#A08080' },
  { id: 'taxes', title: 'Impuestos', icon: 'calculator', route: '/taxes', color: Colors.dark },
  { id: 'coupons', title: 'Cupones', icon: 'gift', route: '/coupons', color: '#6D5555' },
  { id: 'purchases', title: 'Compras', icon: 'bag-handle', route: '/purchases', color: '#5C4444' },
  { id: 'reports', title: 'Reportes', icon: 'bar-chart', route: '/(tabs)/reports', color: Colors.success },
  { id: 'profile', title: 'Perfil', icon: 'person', route: '/profile', color: '#7A6060' },
  { id: 'company', title: 'Empresa', icon: 'settings', route: '/company', color: Colors.foreground },
];

export default function HubScreen() {
  const { logout, user } = useAuth();

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.subtitle}>Selecciona un módulo para comenzar</Text>
        </View>

        <View style={styles.grid}>
          {modules.map((module) => (
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
