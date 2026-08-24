import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { importExportService } from '@/services/importExport';
import type { ImportExportEntity, ImportResult } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mismas 3 entidades, mismo orden y colores que `ENTITIES` en
// `import-export/index.jsx` del web (confirmado contra
// `ALLOWED_ENTITIES` del backend, que solo acepta estas 3).
const ENTITIES: { key: ImportExportEntity; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; description: string }[] = [
  { key: 'products', label: 'Productos', icon: 'cube-outline', color: '#3B82F6', description: 'Carga masiva de productos con SKU, precio, categoría, impuesto y más.' },
  { key: 'categories', label: 'Categorías', icon: 'pricetag-outline', color: '#8B5CF6', description: 'Importa o actualiza las categorías de tus productos.' },
  { key: 'taxes', label: 'Impuestos', icon: 'cash-outline', color: '#10B981', description: 'Carga impuestos (IVA, IPO, ICO, Retención) con su nombre y tasa.' },
];

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImportExportScreenContent() {
  const toast = useToast();
  const [entity, setEntity] = useState<ImportExportEntity>('products');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selectedEntity = ENTITIES.find((e) => e.key === entity)!;

  const resetImport = () => {
    setFile(null);
    setResult(null);
    setShowErrors(false);
  };

  const handleSelectEntity = (key: ImportExportEntity) => {
    setEntity(key);
    resetImport();
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      await importExportService.downloadTemplate(entity);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo descargar la plantilla');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePickFile = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    setResult(null);
    setShowErrors(false);
    setFile(picked.assets[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      setImporting(true);
      const res = await importExportService.importFile(entity, file.uri, file.name, file.mimeType);
      setResult(res);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await importExportService.exportData(entity);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudieron exportar los datos');
    } finally {
      setExporting(false);
    }
  };

  const handleShareErrorReport = async () => {
    if (!result) return;
    const lines = result.errors.map((err) => `Fila ${err.row} · ${err.field}: ${err.message}`);
    const message = `Reporte de importación — ${selectedEntity.label}\n\nCreados: ${result.created}\nActualizados: ${result.updated}\nErrores: ${result.errors.length}\n\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
    } catch {
      // el usuario canceló el share sheet, no es un error real
    }
  };

  const total = result ? result.created + result.updated + result.errors.length : 0;
  const hasErrors = !!result && result.errors.length > 0;
  const allFailed = !!result && result.created === 0 && result.updated === 0 && hasErrors;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importar / Exportar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabRow}>
        {ENTITIES.map((e) => {
          const active = e.key === entity;
          return (
            <TouchableOpacity
              key={e.key}
              style={[styles.tab, active && { backgroundColor: e.color + '20', borderColor: e.color }]}
              onPress={() => handleSelectEntity(e.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={e.icon} size={20} color={active ? e.color : Colors.textLight} />
              <Text style={[styles.tabText, active && { color: e.color, fontWeight: '700' }]}>{e.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <Text style={styles.entityDescription}>{selectedEntity.description}</Text>

        <View style={styles.card}>
          <Text style={styles.stepTitle}>1. Descarga la plantilla</Text>
          <Text style={styles.stepSubtitle}>Usa esta plantilla como base para tu archivo Excel.</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={handleDownloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={Colors.primary} />
                <Text style={styles.outlineButtonText}>Descargar plantilla</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.stepTitle}>2. Importa tu archivo</Text>
          <Text style={styles.stepSubtitle}>Selecciona el Excel ya completado con tus datos.</Text>

          <TouchableOpacity style={styles.outlineButton} onPress={handlePickFile}>
            <Ionicons name="document-attach-outline" size={18} color={Colors.primary} />
            <Text style={styles.outlineButtonText}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}</Text>
          </TouchableOpacity>

          {file && (
            <View style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={20} color={Colors.textLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                {!!file.size && <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>}
              </View>
            </View>
          )}

          {file && !result && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleImport} disabled={importing}>
              {importing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={Colors.white} />
                  <Text style={styles.primaryButtonText}>Importar</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {result && (
            <View style={styles.resultBox}>
              <View style={[styles.resultBanner, { backgroundColor: allFailed ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={styles.resultBannerIcon}>{allFailed ? '❌' : hasErrors ? '⚠️' : '✅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultBannerTitle, { color: allFailed ? '#991B1B' : '#166534' }]}>
                    {allFailed ? 'Importación fallida' : 'Importación completada'}
                  </Text>
                  <Text style={styles.resultBannerSubtitle}>{total} fila(s) procesada(s) en total</Text>
                </View>
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#16A34A' }]}>{result.created}</Text>
                  <Text style={styles.statLabel}>Creados</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#2563EB' }]}>{result.updated}</Text>
                  <Text style={styles.statLabel}>Actualizados</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: result.errors.length > 0 ? '#DC2626' : Colors.textLight }]}>
                    {result.errors.length}
                  </Text>
                  <Text style={styles.statLabel}>Errores</Text>
                </View>
              </View>

              {hasErrors && (
                <>
                  <TouchableOpacity style={styles.errorsToggle} onPress={() => setShowErrors((v) => !v)}>
                    <Text style={styles.errorsToggleText}>
                      {showErrors ? '▲' : '▼'} {showErrors ? 'Ocultar' : 'Ver'} errores ({result.errors.length})
                    </Text>
                  </TouchableOpacity>
                  {showErrors && (
                    <View style={styles.errorsList}>
                      {result.errors.map((err, idx) => (
                        <View key={idx} style={styles.errorRow}>
                          <Text style={styles.errorRowMeta}>Fila {err.row} · {err.field}</Text>
                          <Text style={styles.errorRowMessage}>{err.message}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity style={styles.outlineButton} onPress={handleShareErrorReport}>
                    <Ionicons name="share-outline" size={18} color={Colors.primary} />
                    <Text style={styles.outlineButtonText}>Descargar reporte de errores</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.linkButton} onPress={resetImport}>
                <Text style={styles.linkButtonText}>Nueva importación</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.stepTitle}>3. Exporta los datos actuales</Text>
          <Text style={styles.stepSubtitle}>Descarga todos los registros existentes en un Excel.</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={handleExport} disabled={exporting}>
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={18} color={Colors.primary} />
                <Text style={styles.outlineButtonText}>Exportar datos</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Los registros existentes se actualizan por clave única (SKU para productos, nombre para
          categorías e impuestos). Las imágenes se gestionan individualmente en el formulario de
          cada producto o categoría.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ImportExportScreen() {
  return (
    <RequirePermission perm="view_products">
      <ImportExportScreenContent />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  tabRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  entityDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  stepSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minHeight: 42,
  },
  outlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minHeight: 42,
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
  },
  fileName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  fileSize: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  resultBox: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  resultBannerIcon: {
    fontSize: 22,
  },
  resultBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  resultBannerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  errorsToggle: {
    paddingVertical: Spacing.sm,
  },
  errorsToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  errorsList: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  errorRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  errorRowMeta: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text,
  },
  errorRowMessage: {
    fontSize: FontSize.xs,
    color: '#DC2626',
    marginTop: 2,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  linkButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textLight,
    textDecorationLine: 'underline',
  },
  footerNote: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
