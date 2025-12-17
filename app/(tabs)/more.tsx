import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MoreScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: 'apps-outline',
      title: 'Hub Principal',
      subtitle: 'Ver todos los módulos',
      onPress: () => router.push('/(tabs)/hub'),
    },
    {
      icon: 'person-outline',
      title: 'Mi Perfil',
      subtitle: 'Ver y editar información personal',
      onPress: () => router.push('/profile/index'),
    },
    {
      icon: 'grid-outline',
      title: 'Categorías',
      subtitle: 'Gestionar categorías de productos',
      onPress: () => router.push('/categories/index'),
    },
    {
      icon: 'pricetag-outline',
      title: 'Productos',
      subtitle: 'Catálogo de productos',
      onPress: () => router.push('/products/index'),
    },
    {
      icon: 'people-outline',
      title: 'Clientes',
      subtitle: 'Directorio de clientes',
      onPress: () => router.push('/customers/index'),
    },
    {
      icon: 'receipt-outline',
      title: 'Ventas',
      subtitle: 'Historial de ventas',
      onPress: () => router.push('/sales/index'),
    },
    {
      icon: 'business-outline',
      title: 'Bodegas',
      subtitle: 'Gestionar almacenes',
      onPress: () => router.push('/warehouses/index'),
    },
    {
      icon: 'calculator-outline',
      title: 'Impuestos',
      subtitle: 'Configuración de impuestos',
      onPress: () => router.push('/taxes/index'),
    },
    {
      icon: 'gift-outline',
      title: 'Cupones',
      subtitle: 'Códigos promocionales',
      onPress: () => router.push('/coupons/index'),
    },
    {
      icon: 'bag-handle-outline',
      title: 'Compras',
      subtitle: 'Registro de compras',
      onPress: () => router.push('/purchases/index'),
    },
    {
      icon: 'settings-outline',
      title: 'Configuración de Empresa',
      subtitle: 'Ajustes y configuración',
      onPress: () => router.push('/company/index'),
    },
    {
      icon: 'information-circle-outline',
      title: 'Acerca de',
      subtitle: 'Versión 1.0.0',
      onPress: () => Alert.alert('MyPOS Mobile', 'Versión 1.0.0\n\nSistema de Punto de Venta'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/hub')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Más</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.username}</Text>
            <Text style={styles.profileRole}>{user?.role_name}</Text>
            <Text style={styles.profileCompany}>{user?.company_name}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuItemIcon}>
                  <Ionicons name={item.icon as any} size={24} color={Colors.primary} />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.white} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
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
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  profileRole: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  profileCompany: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    gap: Spacing.xs,
  },
  menuItemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  menuItemSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  logoutButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
