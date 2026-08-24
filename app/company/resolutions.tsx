import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { invoicingResolutionsService } from '@/services/extended';
import type { CreateInvoicingResolutionRequest, InvoicingResolution } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const emptyForm = () => ({
  type: 'POS' as 'POS' | 'ELECTRONIC',
  resolutionNumber: '',
  prefix: '',
  startNumber: '',
  endNumber: '',
  currentNumber: '',
  technicalKey: '',
  isActive: true,
});

function ResolutionsScreenContent() {
  const toast = useToast();
  const [resolutions, setResolutions] = useState<InvoicingResolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InvoicingResolution | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDelete, setToDelete] = useState<InvoicingResolution | null>(null);

  const [conflict, setConflict] = useState<InvoicingResolution | null>(null);
  const [pendingPayload, setPendingPayload] = useState<CreateInvoicingResolutionRequest | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await invoicingResolutionsService.getResolutions();
      setResolutions(data);
    } catch (e: any) {
      setError(e.message || 'Error al cargar resoluciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenModal = (resolution?: InvoicingResolution) => {
    setEditing(resolution || null);
    setForm(
      resolution
        ? {
            type: resolution.type,
            resolutionNumber: resolution.resolution_number,
            prefix: resolution.prefix || '',
            startNumber: String(resolution.start_number),
            endNumber: String(resolution.end_number),
            currentNumber: String(resolution.current_number),
            technicalKey: resolution.technical_key || '',
            isActive: resolution.is_active,
          }
        : emptyForm()
    );
    setShowModal(true);
  };

  const buildPayload = (): CreateInvoicingResolutionRequest | null => {
    if (!form.resolutionNumber.trim()) {
      toast.error('El número de resolución es requerido');
      return null;
    }
    const start = parseInt(form.startNumber, 10);
    const end = parseInt(form.endNumber, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      toast.error('El rango debe ser válido (desde menor que hasta)');
      return null;
    }
    if (form.type === 'ELECTRONIC' && !form.technicalKey.trim()) {
      toast.error('La clave técnica es requerida para resoluciones electrónicas');
      return null;
    }
    return {
      resolution_number: form.resolutionNumber.trim(),
      prefix: form.prefix.trim() || undefined,
      start_number: start,
      end_number: end,
      // `PUT /:id/permissions`... digo, `PUT /invoicing-resolutions/:id` es un
      // reemplazo completo, no un parche — si no se manda `current_number`
      // al editar, el backend lo resetea a `start_number` y se pierde el
      // consumo real de la resolución (bug de backend confirmado leyendo
      // `invoicing_resolutions.repository.js#updateResolution`).
      current_number: editing ? parseInt(form.currentNumber, 10) || start : undefined,
      type: form.type,
      technical_key: form.type === 'ELECTRONIC' ? form.technicalKey.trim() : undefined,
      is_active: form.isActive,
    };
  };

  const submit = async (payload: CreateInvoicingResolutionRequest) => {
    try {
      setIsSaving(true);
      if (editing) {
        await invoicingResolutionsService.updateResolution(editing.id, payload);
      } else {
        await invoicingResolutionsService.createResolution(payload);
      }
      toast.success(editing ? 'Resolución actualizada' : 'Resolución creada');
      setShowModal(false);
      setConflict(null);
      setPendingPayload(null);
      loadData();
    } catch (e: any) {
      const conflicting = e.response?.data?.conflicting_resolution;
      if (e.response?.status === 409 && conflicting) {
        setConflict(conflicting);
        setPendingPayload(payload);
      } else {
        toast.error(e.response?.data?.message || 'No se pudo guardar la resolución');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    const payload = buildPayload();
    if (payload) submit(payload);
  };

  const handleReplaceConflict = () => {
    if (pendingPayload) submit({ ...pendingPayload, auto_replace: true });
  };

  const handleToggle = async (resolution: InvoicingResolution) => {
    try {
      await invoicingResolutionsService.toggleResolution(resolution.id);
      loadData();
    } catch (e: any) {
      const conflicting = e.response?.data?.conflicting_resolution;
      if (e.response?.status === 409 && conflicting) {
        toast.error(`Ya hay una resolución activa (${conflicting.resolution_number}) del mismo tipo. Desactívala primero.`);
      } else {
        toast.error(e.response?.data?.message || 'No se pudo cambiar el estado');
      }
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await invoicingResolutionsService.deleteResolution(toDelete.id);
      toast.success('Resolución eliminada');
      setShowDeleteConfirm(false);
      setToDelete(null);
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo eliminar. Desactívala primero.');
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando resoluciones..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resoluciones de Facturación</Text>
        <TouchableOpacity onPress={() => handleOpenModal()}>
          <Ionicons name="add-circle" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {resolutions.length === 0 ? (
          <EmptyState icon="document-text-outline" title="No hay resoluciones" message="Crea la primera resolución de facturación" />
        ) : (
          resolutions.map((r) => {
            const consumed = r.current_number - r.start_number;
            const range = r.end_number - r.start_number + 1;
            const pct = range > 0 ? Math.min(100, Math.max(0, (consumed / range) * 100)) : 0;
            const nearLimit = pct >= 90;
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.typeBadge, r.type === 'ELECTRONIC' ? styles.typeBadgeElectronic : styles.typeBadgePos]}>
                        <Text style={[styles.typeBadgeText, r.type === 'ELECTRONIC' ? { color: '#1D4ED8' } : { color: '#166534' }]}>
                          {r.type === 'ELECTRONIC' ? 'Electrónica' : 'POS'}
                        </Text>
                      </View>
                      <View style={[styles.typeBadge, r.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                        <Text style={[styles.typeBadgeText, { color: r.is_active ? '#166534' : '#6B7280' }]}>
                          {r.is_active ? 'Activa' : 'Inactiva'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.resolutionNumber}>
                      {r.prefix ? `${r.prefix} — ` : ''}
                      {r.resolution_number}
                    </Text>
                  </View>
                  <Switch value={r.is_active} onValueChange={() => handleToggle(r)} trackColor={{ true: Colors.primary }} />
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: nearLimit ? '#EF4444' : Colors.primary }]} />
                </View>
                <Text style={styles.progressLabel}>
                  {r.current_number} de {r.start_number}–{r.end_number} ({pct.toFixed(0)}%)
                  {nearLimit && ' · Por agotarse'}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardActionButton} onPress={() => handleOpenModal(r)}>
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    <Text style={styles.cardActionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => {
                      setToDelete(r);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    <Text style={[styles.cardActionText, { color: Colors.error }]}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Crear/Editar */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? 'Editar Resolución' : 'Nueva Resolución'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <Picker.Item label="POS" value="POS" />
                <Picker.Item label="Electrónica (ELECTRONIC)" value="ELECTRONIC" />
              </Picker>
            </View>

            <Text style={styles.label}>
              Número de Resolución <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={form.resolutionNumber}
              onChangeText={(v) => setForm({ ...form, resolutionNumber: v })}
              placeholder="18760000001"
            />

            <Text style={styles.label}>Prefijo</Text>
            <TextInput style={styles.input} value={form.prefix} onChangeText={(v) => setForm({ ...form, prefix: v })} placeholder="FE" />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Desde <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.startNumber}
                  onChangeText={(v) => setForm({ ...form, startNumber: v })}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Hasta <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.endNumber}
                  onChangeText={(v) => setForm({ ...form, endNumber: v })}
                  keyboardType="number-pad"
                  placeholder="5000"
                />
              </View>
            </View>

            {editing && (
              <>
                <Text style={styles.label}>Consecutivo Actual</Text>
                <TextInput
                  style={styles.input}
                  value={form.currentNumber}
                  onChangeText={(v) => setForm({ ...form, currentNumber: v })}
                  keyboardType="number-pad"
                />
                <Text style={styles.hint}>Solo ajústalo si necesitas corregir el consecutivo — normalmente avanza solo con cada factura.</Text>
              </>
            )}

            {form.type === 'ELECTRONIC' && (
              <>
                <Text style={styles.label}>
                  Clave Técnica <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.technicalKey}
                  onChangeText={(v) => setForm({ ...form, technicalKey: v })}
                  placeholder="Clave técnica DIAN"
                  autoCapitalize="none"
                />
              </>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activar al guardar</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm({ ...form, isActive: v })} trackColor={{ true: Colors.primary }} />
            </View>
            <Text style={styles.hint}>
              Solo puede haber una resolución activa por tipo (POS/Electrónica) a la vez.
            </Text>

            <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Eliminar Resolución"
        message={`¿Eliminar la resolución "${toDelete?.resolution_number}"? Si está activa, primero debes desactivarla.`}
        confirmText="Eliminar"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setToDelete(null);
        }}
      />

      <ConfirmModal
        visible={!!conflict}
        title="Ya hay una resolución activa"
        message={`La resolución "${conflict?.resolution_number}" ya está activa para este tipo. ¿Deseas reemplazarla (se desactivará automáticamente)?`}
        confirmText="Reemplazar"
        type="warning"
        loading={isSaving}
        onConfirm={handleReplaceConflict}
        onCancel={() => {
          setConflict(null);
          setPendingPayload(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function ResolutionsScreen() {
  return (
    <RequirePermission perm="manage_settings">
      <ResolutionsScreenContent />
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
    fontSize: FontSize.md,
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  typeBadgePos: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeElectronic: {
    backgroundColor: '#DBEAFE',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  resolutionNumber: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  progressTrack: {
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E5E7EB',
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
