import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useToast } from '@/contexts/ToastContext';
import { reportService, type ReportType } from '@/services';
import { warehouseService } from '@/services/extended';
import type { InventoryReportRow, SalesReportRow, SalesReportSummary, TopProductRow, Warehouse } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ReportTypeMeta {
  id: ReportType | 'customers' | 'financial' | 'taxes';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

// Mismos 6 tipos y mismo estado que `reportTypes` en `reports/index.jsx` del
// web — los 3 deshabilitados se mantienen visibles pero no interactivos
// ("Próximamente") porque el backend no los implementa (`reports.service.js`
// solo tiene una rama para `sales|inventory|purchases|top-products`;
// cualquier otro tipo responde 400).
const REPORT_TYPES: ReportTypeMeta[] = [
  { id: 'sales', label: 'Ventas', icon: 'receipt-outline' },
  { id: 'top-products', label: 'Top Productos', icon: 'trophy-outline' },
  { id: 'inventory', label: 'Inventario', icon: 'cube-outline' },
  { id: 'customers', label: 'Clientes', icon: 'people-outline', disabled: true },
  { id: 'financial', label: 'Financiero', icon: 'cash-outline', disabled: true },
  { id: 'taxes', label: 'Impuestos', icon: 'calculator-outline', disabled: true },
];

const SALES_STATUS_LABELS: Record<string, string> = {
  completed: 'Completada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateSalesSummary(rows: SalesReportRow[]): SalesReportSummary {
  return {
    totalVentas: rows.length,
    subtotal: rows.reduce((s, r) => s + Number(r.subtotal || 0), 0),
    descuentos: rows.reduce((s, r) => s + Number(r.discount || 0), 0),
    impuestos: rows.reduce((s, r) => s + Number(r.tax_total || 0), 0),
    total: rows.reduce((s, r) => s + Number(r.total || 0), 0),
  };
}

function ReportsScreenContent() {
  const toast = useToast();
  const { can } = usePermissions();
  const canExport = can('export_reports');

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [salesRows, setSalesRows] = useState<SalesReportRow[]>([]);
  const [topProductRows, setTopProductRows] = useState<TopProductRow[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InventoryReportRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    warehouseService.getWarehouses().then(setWarehouses).catch(() => {});
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate, warehouseId, lowStockOnly]);

  const loadReport = async () => {
    try {
      setIsLoading(true);
      if (reportType === 'sales') {
        setSalesRows(await reportService.getReport<SalesReportRow>('sales', { start_date: startDate, end_date: endDate }));
      } else if (reportType === 'top-products') {
        setTopProductRows(
          await reportService.getReport<TopProductRow>('top-products', { start_date: startDate, end_date: endDate })
        );
      } else if (reportType === 'inventory') {
        setInventoryRows(
          await reportService.getReport<InventoryReportRow>('inventory', {
            warehouse_id: warehouseId ? Number(warehouseId) : undefined,
            low_stock: lowStockOnly || undefined,
          })
        );
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo cargar el reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      setIsExporting(format);
      const buffer = await reportService.exportReport(reportType, format, {
        start_date: startDate,
        end_date: endDate,
        warehouse_id: warehouseId ? Number(warehouseId) : undefined,
        low_stock: lowStockOnly || undefined,
      });
      const filename = `reporte_${reportType}_${Date.now()}.${format}`;
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(new Uint8Array(buffer));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
          dialogTitle: 'Compartir reporte',
        });
      } else {
        toast.error('No hay una forma de compartir archivos disponible en este dispositivo');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo exportar el reporte');
    } finally {
      setIsExporting(null);
    }
  };

  const summary = reportType === 'sales' ? calculateSalesSummary(salesRows) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reportes</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRowScroll} contentContainerStyle={styles.typeRow}>
        {REPORT_TYPES.map((rt) => {
          const active = !rt.disabled && rt.id === reportType;
          return (
            <TouchableOpacity
              key={rt.id}
              style={[styles.typeChip, active && styles.typeChipActive, rt.disabled && styles.typeChipDisabled]}
              onPress={() => !rt.disabled && setReportType(rt.id as ReportType)}
              disabled={rt.disabled}
              activeOpacity={rt.disabled ? 1 : 0.7}
            >
              <Ionicons name={rt.icon} size={18} color={active ? Colors.white : rt.disabled ? Colors.textLight : Colors.primary} />
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive, rt.disabled && styles.typeChipTextDisabled]}>
                {rt.label}
              </Text>
              {rt.disabled && <Text style={styles.comingSoon}>Próximamente</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(reportType === 'sales' || reportType === 'top-products') && (
          <View style={styles.filtersCard}>
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Desde</Text>
                <TextInput style={styles.filterInput} value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-DD" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>Hasta</Text>
                <TextInput style={styles.filterInput} value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-DD" />
              </View>
            </View>
          </View>
        )}

        {reportType === 'inventory' && (
          <View style={styles.filtersCard}>
            <Text style={styles.filterLabel}>Bodega</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
              <TouchableOpacity
                style={[styles.warehouseChip, !warehouseId && styles.warehouseChipActive]}
                onPress={() => setWarehouseId('')}
              >
                <Text style={[styles.warehouseChipText, !warehouseId && styles.warehouseChipTextActive]}>Todas</Text>
              </TouchableOpacity>
              {warehouses.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.warehouseChip, warehouseId === String(w.id) && styles.warehouseChipActive]}
                  onPress={() => setWarehouseId(String(w.id))}
                >
                  <Text style={[styles.warehouseChipText, warehouseId === String(w.id) && styles.warehouseChipTextActive]}>
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.switchRow}>
              <Text style={styles.filterLabel}>Solo stock bajo</Text>
              <Switch value={lowStockOnly} onValueChange={setLowStockOnly} trackColor={{ true: Colors.primary }} />
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {summary && (
              <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="receipt-outline" size={28} color={Colors.white} />
                  <Text style={styles.statValue}>{summary.totalVentas}</Text>
                  <Text style={styles.statLabel}>Ventas</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.success }]}>
                  <Ionicons name="cash-outline" size={28} color={Colors.white} />
                  <Text style={styles.statValue}>{formatCurrency(summary.total)}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            )}
            {summary && (
              <View style={styles.summaryDetailCard}>
                <View style={styles.summaryDetailRow}>
                  <Text style={styles.summaryDetailLabel}>Subtotal</Text>
                  <Text style={styles.summaryDetailValue}>{formatCurrency(summary.subtotal)}</Text>
                </View>
                <View style={styles.summaryDetailRow}>
                  <Text style={styles.summaryDetailLabel}>Descuentos</Text>
                  <Text style={[styles.summaryDetailValue, { color: '#EF4444' }]}>-{formatCurrency(summary.descuentos)}</Text>
                </View>
                <View style={styles.summaryDetailRow}>
                  <Text style={styles.summaryDetailLabel}>Impuestos</Text>
                  <Text style={styles.summaryDetailValue}>{formatCurrency(summary.impuestos)}</Text>
                </View>
              </View>
            )}

            {canExport && (
              <View style={styles.exportRow}>
                <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('xlsx')} disabled={isExporting !== null}>
                  {isExporting === 'xlsx' ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="document-outline" size={16} color={Colors.primary} />
                      <Text style={styles.exportButtonText}>Excel</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton} onPress={() => handleExport('pdf')} disabled={isExporting !== null}>
                  {isExporting === 'pdf' ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                      <Text style={styles.exportButtonText}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {reportType === 'sales' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ventas ({salesRows.length})</Text>
                {salesRows.length === 0 ? (
                  <Text style={styles.emptyText}>No hay ventas en este rango de fechas</Text>
                ) : (
                  salesRows.map((row) => (
                    <View key={row.id} style={styles.rowCard}>
                      <View style={styles.rowCardHeader}>
                        <Text style={styles.rowCardTitle}>#{row.invoice_number || row.id}</Text>
                        <Text style={styles.rowCardTotal}>{formatCurrency(row.total)}</Text>
                      </View>
                      <Text style={styles.rowCardSubtitle}>{row.customer_name || 'Consumidor Final'}</Text>
                      <View style={styles.rowCardMeta}>
                        <Text style={styles.rowCardMetaText}>{new Date(row.date).toLocaleString('es-CO')}</Text>
                        <Text style={styles.rowCardMetaText}>{row.payment_method}</Text>
                        <Text style={styles.rowCardMetaText}>{SALES_STATUS_LABELS[row.status] || row.status}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {reportType === 'top-products' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Productos ({topProductRows.length})</Text>
                {topProductRows.length === 0 ? (
                  <Text style={styles.emptyText}>No hay ventas de productos en este rango</Text>
                ) : (
                  topProductRows.map((product, index) => (
                    <View key={product.id} style={styles.topProductCard}>
                      <View style={styles.topProductRank}>
                        <Text style={styles.topProductRankText}>{index + 1}</Text>
                      </View>
                      <View style={styles.topProductInfo}>
                        <Text style={styles.topProductName}>{product.title}</Text>
                        <Text style={styles.topProductSales}>{product.total_sold} unidades · {product.order_count} ventas</Text>
                      </View>
                      <Text style={styles.topProductRevenue}>{formatCurrency(product.total_revenue)}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {reportType === 'inventory' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Inventario ({inventoryRows.length})</Text>
                {inventoryRows.length === 0 ? (
                  <Text style={styles.emptyText}>No hay productos para mostrar</Text>
                ) : (
                  inventoryRows.map((row) => (
                    <View key={row.id} style={styles.rowCard}>
                      <View style={styles.rowCardHeader}>
                        <Text style={styles.rowCardTitle}>{row.title}</Text>
                        <Text style={styles.rowCardTotal}>{formatCurrency(row.inventory_value)}</Text>
                      </View>
                      <Text style={styles.rowCardSubtitle}>SKU: {row.sku} · {row.warehouse}</Text>
                      <View style={styles.rowCardMeta}>
                        <Text style={styles.rowCardMetaText}>Disponible: {row.available}</Text>
                        <Text style={styles.rowCardMetaText}>Mín: {row.stock_alert}</Text>
                        {row.quantity <= row.stock_alert && (
                          <Text style={[styles.rowCardMetaText, { color: '#DC2626', fontWeight: '700' }]}>Stock bajo</Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ReportsScreen() {
  return (
    <RequirePermission perm="view_reports">
      <ReportsScreenContent />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.sm,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  typeRowScroll: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  typeRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipDisabled: {
    opacity: 0.5,
  },
  typeChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  typeChipTextActive: {
    color: Colors.white,
  },
  typeChipTextDisabled: {
    color: Colors.textLight,
  },
  comingSoon: {
    fontSize: 9,
    color: Colors.textLight,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  filtersCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  warehouseChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    marginRight: Spacing.xs,
  },
  warehouseChipActive: {
    backgroundColor: Colors.primary,
  },
  warehouseChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  warehouseChipTextActive: {
    color: Colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadingBox: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.white,
    textAlign: 'center',
  },
  summaryDetailCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  summaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryDetailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  summaryDetailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  exportRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
  },
  exportButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    paddingVertical: Spacing.lg,
  },
  rowCard: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  rowCardTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  rowCardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 4,
  },
  rowCardMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topProductRankText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  topProductInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  topProductName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  topProductSales: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  topProductRevenue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
});
