import { LoadingState } from '@/components/LoadingState';
import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { companyService, extendedUserService } from '@/services/extended';
import type { Company, PlanUsage } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PLAN_NAMES: Record<string, string> = {
  tienda_pequena: 'Tienda Pequeña',
  tienda_mediana: 'Tienda Mediana',
  tienda_grande: 'Tienda Grande',
  super_tienda: 'Super Tienda',
};

function ProgressBar({ pct, danger }: { pct: number; danger?: boolean }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: danger ? '#EF4444' : Colors.primary }]} />
    </View>
  );
}

function BooleanRow({ label, value }: { label: string; value?: boolean }) {
  return (
    <View style={styles.boolRow}>
      <Ionicons name={value ? 'checkmark-circle' : 'close-circle'} size={20} color={value ? '#16A34A' : Colors.textLight} />
      <Text style={styles.boolLabel}>{label}</Text>
    </View>
  );
}

function PlanScreenContent() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [companyData, planData, usersData] = await Promise.all([
          companyService.getCompany(),
          companyService.getPlanUsage(),
          extendedUserService.getUsers(),
        ]);
        setCompany(companyData);
        setPlanUsage(planData);
        setUserCount(usersData.length);
      } catch (e) {
        toast.error('No se pudo cargar la información del plan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <LoadingState message="Cargando plan..." />;
  }

  const maxUsers = planUsage?.planConfig?.maxUsers;
  const usersPct = maxUsers ? (userCount / maxUsers) * 100 : 0;
  const dian = planUsage?.dian;
  const dianPct = dian && dian.quota > 0 ? (dian.used / dian.quota) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan y Recursos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {company && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Información de la Empresa</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>NIT</Text>
              <Text style={styles.infoValue}>
                {company.nit || 'N/A'}
                {company.dv ? `-${company.dv}` : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado</Text>
              <View style={[styles.pill, company.is_active ? styles.pillOk : styles.pillWarning]}>
                <Text style={[styles.pillText, { color: company.is_active ? '#166534' : '#92400E' }]}>
                  {company.is_active ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
            {company.creation_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cliente desde</Text>
                <Text style={styles.infoValue}>{new Date(company.creation_date).toLocaleDateString('es-CO')}</Text>
              </View>
            )}
            {company.api_environment && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ambiente</Text>
                <View style={[styles.pill, company.api_environment === 'PRODUCTION' ? styles.pillOk : styles.pillNeutral]}>
                  <Text style={styles.pillText}>{company.api_environment}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {planUsage && (
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{PLAN_NAMES[planUsage.plan] || planUsage.plan}</Text>

            <Text style={styles.metricLabel}>
              Usuarios: {userCount}
              {maxUsers ? ` / ${maxUsers}` : ''}
            </Text>
            {!!maxUsers && <ProgressBar pct={usersPct} danger={usersPct >= 90} />}

            {dian && (
              <>
                <Text style={[styles.metricLabel, { marginTop: Spacing.md }]}>
                  Facturas DIAN: {dian.used} / {dian.quota}
                </Text>
                <ProgressBar pct={dianPct} danger={dian.blocked || dianPct >= 90} />
                {dian.blocked && <Text style={styles.blockedText}>Cuota de facturación DIAN agotada</Text>}
              </>
            )}

            <View style={styles.boolGrid}>
              <BooleanRow label="Multi-Caja" value={planUsage.planConfig?.multiCash} />
              <BooleanRow label="Multi-Bodega" value={planUsage.planConfig?.multiBranch} />
              <BooleanRow label="Analítica Avanzada" value={planUsage.planConfig?.analytics} />
            </View>

            {planUsage.planConfig?.supportLevel && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nivel de Soporte</Text>
                <Text style={styles.infoValue}>{planUsage.planConfig.supportLevel}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PlanScreen() {
  return (
    <RequirePermission perm="view_settings">
      <PlanScreenContent />
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
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pillOk: {
    backgroundColor: '#DCFCE7',
  },
  pillWarning: {
    backgroundColor: '#FEF3C7',
  },
  pillNeutral: {
    backgroundColor: '#F3F4F6',
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  blockedText: {
    fontSize: FontSize.xs,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  boolGrid: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  boolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  boolLabel: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
});
