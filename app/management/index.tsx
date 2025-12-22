import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManagementScreen() {
  const modules = [
    {
      id: 'users',
      title: 'Usuarios',
      subtitle: 'Gestionar usuarios del sistema',
      icon: 'people',
      color: Colors.primary,
      route: '/management/users',
    },
    {
      id: 'roles',
      title: 'Roles',
      subtitle: 'Configurar roles y permisos',
      icon: 'shield-checkmark',
      color: '#F59E0B',
      route: '/management/roles',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeCard}>
          <Ionicons name="settings" size={48} color={Colors.primary} />
          <Text style={styles.welcomeTitle}>Panel de Gestión</Text>
          <Text style={styles.welcomeSubtitle}>
            Administra usuarios, roles y permisos del sistema
          </Text>
        </View>

        <View style={styles.modulesContainer}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => router.push(module.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIcon, { backgroundColor: module.color + '20' }]}>
                <Ionicons name={module.icon as any} size={32} color={module.color} />
              </View>
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textLight} />
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
  content: {
    padding: Spacing.lg,
  },
  welcomeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  welcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modulesContainer: {
    gap: Spacing.md,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  moduleIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  moduleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
