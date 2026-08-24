import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { storageService } from '@/services/storage';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DISMISSED_KEY = 'sub_warning_dismissed';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Puerto de `JiroPOS-Frontend/src/component/modals/SubscriptionModal.jsx`:
 * mismos 3 estados (bloqueo total, período de gracia, aviso de vencimiento
 * próximo con opción de cerrar por hoy).
 */
export default function SubscriptionModal() {
  const { isAuthenticated } = useAuth();
  const { subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!subscription) return;
    (async () => {
      const saved = await storageService.getItem(DISMISSED_KEY);
      const today = new Date().toISOString().split('T')[0];
      setDismissed(saved === today);
    })();
  }, [subscription?.status]);

  if (!isAuthenticated || !subscription) return null;

  const { status, daysUntilExpiry, daysInGrace, showWarning, subscriptionEndsAt } = subscription;

  const handleDismiss = async () => {
    const today = new Date().toISOString().split('T')[0];
    await storageService.setItem(DISMISSED_KEY, today);
    setDismissed(true);
  };

  // --- BLOQUEO TOTAL ---
  if (status === 'blocked') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.blockedHeader}>
              <Text style={styles.blockedTitle}>🔒 Acceso Suspendido</Text>
              <Text style={styles.blockedSubtitle}>Tu suscripción de MyPOS ha sido suspendida</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                El período de suscripción y el tiempo de gracia han vencido. Para reactivar tu
                acceso, comunícate con soporte.
              </Text>
              {subscriptionEndsAt && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>PLAN VENCIÓ EL</Text>
                  <Text style={styles.infoValue}>{formatDate(subscriptionEndsAt)}</Text>
                </View>
              )}
              <View style={styles.contactBoxDark}>
                <Text style={styles.contactLabelDark}>Contacta a soporte</Text>
                <Text style={styles.contactValueDark}>soporte@clicfstudios.com</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // --- PERÍODO DE GRACIA ---
  if (status === 'grace') {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.graceHeader}>
              <Text style={styles.graceTitle}>⚠️ Suscripción Vencida</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Tu suscripción venció.{' '}
                {daysInGrace && daysInGrace > 0
                  ? `Tienes ${daysInGrace} día${daysInGrace !== 1 ? 's' : ''} antes de que se bloquee el acceso.`
                  : 'El acceso se bloqueará muy pronto.'}
              </Text>
              {subscriptionEndsAt && (
                <Text style={styles.smallText}>
                  Plan venció el: <Text style={styles.bold}>{formatDate(subscriptionEndsAt)}</Text>
                </Text>
              )}
              <View style={styles.contactBoxWarning}>
                <Text style={styles.contactLabel}>Para renovar, contacta a soporte</Text>
                <Text style={styles.contactValueWarning}>soporte@clicfstudios.com</Text>
              </View>
              <Text style={styles.footnote}>
                Puedes seguir usando el sistema por ahora, pero renueva pronto para evitar el
                bloqueo.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // --- AVISO DE VENCIMIENTO PRÓXIMO (≤7 días) ---
  if (status === 'active' && showWarning && !dismissed) {
    const isUrgent = (daysUntilExpiry ?? 0) <= 3;
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View
            style={[
              styles.card,
              styles.warningCard,
              { borderTopColor: isUrgent ? Colors.error : Colors.warning },
            ]}
          >
            <View style={[styles.warningHeader, { backgroundColor: isUrgent ? '#FEF2F2' : '#FFFBEB' }]}>
              <View style={styles.warningHeaderLeft}>
                <Text style={styles.warningIcon}>{isUrgent ? '🔴' : '📅'}</Text>
                <Text style={[styles.warningTitle, { color: isUrgent ? '#B91C1C' : '#A16207' }]}>
                  {isUrgent ? 'Plan próximo a vencer' : 'Plan vence pronto'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.body}>
              <Text style={styles.paragraph}>
                Tu suscripción vence en{' '}
                <Text style={[styles.bold, { color: isUrgent ? Colors.error : '#A16207' }]}>
                  {daysUntilExpiry} día{daysUntilExpiry !== 1 ? 's' : ''}
                </Text>
                .{' '}
                {isUrgent
                  ? 'Renueva antes de que se bloquee el acceso a tu cuenta.'
                  : 'Contacta a soporte para renovar y evitar interrupciones.'}
              </Text>
              {subscriptionEndsAt && (
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: isUrgent ? '#FEF2F2' : '#FFFBEB' },
                  ]}
                >
                  <Text style={styles.infoLabel}>Fecha de vencimiento</Text>
                  <Text style={styles.infoValue}>{formatDate(subscriptionEndsAt)}</Text>
                </View>
              )}
              <View style={styles.contactBox}>
                <Text style={styles.contactLabel}>Para renovar, contacta a soporte</Text>
                <Text style={styles.contactValue}>soporte@clicfstudios.com</Text>
              </View>
              <Text style={styles.footnote}>
                Este aviso se ocultará hoy hasta mañana al cerrarlo.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  warningCard: {
    borderTopWidth: 4,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  paragraph: {
    fontSize: FontSize.md,
    color: '#374151',
    lineHeight: 22,
  },
  bold: {
    fontWeight: FontWeight.bold,
  },
  smallText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  footnote: {
    fontSize: FontSize.xs,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#1F2937',
    marginTop: 2,
  },

  // Bloqueo total
  blockedHeader: {
    backgroundColor: '#111827',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  blockedTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  blockedSubtitle: {
    fontSize: FontSize.sm,
    color: '#9CA3AF',
    marginTop: 4,
  },
  contactBoxDark: {
    backgroundColor: '#111827',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  contactLabelDark: {
    fontSize: FontSize.sm,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  contactValueDark: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },

  // Grace
  graceHeader: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  graceTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  contactBoxWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  contactValueWarning: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#B45309',
  },

  // Warning (active, próximo a vencer)
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  warningHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  closeButton: {
    fontSize: 26,
    color: '#9CA3AF',
    lineHeight: 26,
  },
  contactBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#1F2937',
  },
});
