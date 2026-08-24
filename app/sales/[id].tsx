import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { salesService } from '@/services/extended';
import type { SaleDetailed, SaleItemDetailed } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Bloque DIAN — réplica de los 5 estados de `sales/detail.jsx:294-434`. En vez
// de generar una imagen QR en el dispositivo (el web usa el paquete `qrcode`
// vía Canvas del navegador, sin equivalente directo en RN sin agregar una
// dependencia nueva), se ofrece el mismo link de verificación como texto
// tocable — el CUFE se puede verificar igual, solo que abriendo el navegador
// en vez de escanear un código en la misma pantalla que lo muestra.
function DianSection({ sale }: { sale: SaleDetailed }) {
  const verifyUrl = sale.cufe
    ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${sale.cufe}`
    : null;

  const CufeBlock = () =>
    sale.cufe ? (
      <>
        <Text style={styles.dianCufeLabel}>CUFE</Text>
        <Text style={styles.dianCufe} selectable>
          {sale.cufe}
        </Text>
        {verifyUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(verifyUrl)}>
            <Text style={styles.dianLink}>Verificar en el portal DIAN</Text>
          </TouchableOpacity>
        )}
      </>
    ) : null;

  if (sale.dian_status === 'approved') {
    return (
      <View style={[styles.dianCard, styles.dianCardApproved]}>
        <Text style={[styles.dianTitle, { color: '#166534' }]}>✓ Factura Electrónica Aprobada</Text>
        <CufeBlock />
        {sale.dian_pdf_url && (
          <TouchableOpacity onPress={() => Linking.openURL(sale.dian_pdf_url!)}>
            <Text style={styles.dianLink}>Ver PDF de factura</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (sale.dian_status === 'processing') {
    return (
      <View style={[styles.dianCard, styles.dianCardProcessing]}>
        <Text style={[styles.dianTitle, { color: '#92400E' }]}>⏳ Procesando envío a la DIAN</Text>
        <CufeBlock />
      </View>
    );
  }

  if (sale.dian_status === 'rejected' && sale.cufe) {
    return (
      <View style={[styles.dianCard, styles.dianCardWarning]}>
        <Text style={[styles.dianTitle, { color: '#9A3412' }]}>⚠️ Factura con observaciones DIAN</Text>
        <CufeBlock />
        {sale.dian_pdf_url && (
          <TouchableOpacity onPress={() => Linking.openURL(sale.dian_pdf_url!)}>
            <Text style={styles.dianLink}>Ver PDF de factura</Text>
          </TouchableOpacity>
        )}
        {sale.dian_response_message && (
          <Text style={styles.dianMessage}>Observación DIAN: {sale.dian_response_message}</Text>
        )}
      </View>
    );
  }

  if (sale.dian_status === 'rejected') {
    return (
      <View style={[styles.dianCard, styles.dianCardError]}>
        <Text style={[styles.dianTitle, { color: '#991B1B' }]}>✗ No se pudo enviar a la DIAN</Text>
        {sale.dian_response_message && (
          <Text style={styles.dianMessage}>Detalle del error: {sale.dian_response_message}</Text>
        )}
      </View>
    );
  }

  // not_sent
  return (
    <View style={[styles.dianCard, styles.dianCardNeutral]}>
      <Text style={styles.dianTitle}>Pendiente de envío a la DIAN</Text>
    </View>
  );
}

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [sale, setSale] = useState<SaleDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSale();
  }, [id]);

  const loadSale = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await salesService.getSale(Number(id));
      console.log('Sale data loaded:', data);
      setSale(data);
    } catch (error: any) {
      console.error('Error loading sale:', error);
      setError(error.message || 'Error al cargar venta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!sale) return;

    const discountAmount = Number(sale.discount_amount ?? sale.discount ?? 0);
    const message = `
Venta #${sale.invoice_number || sale.id}
Cliente: ${sale.customer_name || 'Consumidor Final'}
Fecha: ${new Date(sale.created_at).toLocaleString('es-CO')}

Subtotal: $${Number(sale.subtotal || 0).toFixed(2)}
${discountAmount > 0 ? `Descuento: -$${discountAmount.toFixed(2)}\n` : ''}IVA: $${Number(sale.tax_amount || sale.tax || 0).toFixed(2)}
TOTAL: $${Number(sale.total || 0).toFixed(2)}

Método de pago: ${sale.payment_method}
${sale.cufe ? `\nCUFE: ${sale.cufe}` : ''}
    `.trim();

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handlePrint = () => {
    Alert.alert('Imprimir', 'Función de impresión no implementada');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Completada';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status || 'Desconocido';
    }
  };

  const renderProductItem = ({ item, index }: { item: SaleItemDetailed; index: number }) => {
    // `subtotal` ya viene calculado por el backend con el descuento de línea
    // aplicado — no recalcular `quantity * price` acá (ignoraría `discount`).
    const lineSubtotal = item.subtotal ?? Number(item.quantity) * Number(item.price);
    return (
      <View key={index} style={styles.productItem}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name || `Producto #${item.product_id}`}</Text>
          {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
          {!!item.discount && (
            <Text style={styles.productDiscount}>Descuento: -${Number(item.discount).toFixed(2)}</Text>
          )}
        </View>
        <View style={styles.productDetails}>
          <Text style={styles.productQuantity}>x{item.quantity}</Text>
          <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
        </View>
        <View style={styles.productTotal}>
          <Text style={styles.productTotalText}>${lineSubtotal.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !sale) {
    return <ErrorState message={error || 'Venta no encontrada'} onRetry={loadSale} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Venta</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.invoiceSection}>
            <Ionicons name="receipt" size={48} color={Colors.primary} />
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Factura</Text>
              <Text style={styles.invoiceNumber}>#{sale.invoice_number || sale.folio || sale.id}</Text>
              <Text style={styles.invoiceDate}>
                {new Date(sale.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          
          {sale.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
                {getStatusLabel(sale.status)}
              </Text>
            </View>
          )}
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{sale.customer_name || 'Consumidor Final'}</Text>
              </View>
            </View>
            {sale.customer_identification && (
              <View style={[styles.infoRow, { marginTop: Spacing.sm }]}>
                <Ionicons name="card-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Identificación</Text>
                  <Text style={styles.infoValue}>{sale.customer_identification}</Text>
                </View>
              </View>
            )}
            {sale.customer_phone && (
              <View style={[styles.infoRow, { marginTop: Spacing.sm }]}>
                <Ionicons name="call-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Teléfono</Text>
                  <Text style={styles.infoValue}>{sale.customer_phone}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Sale Details */}
        {(sale.warehouse_name || sale.created_by_name) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles de la Venta</Text>
            <View style={styles.infoCard}>
              {sale.warehouse_name && (
                <View style={styles.infoRow}>
                  <Ionicons name="business-outline" size={20} color={Colors.textLight} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Bodega</Text>
                    <Text style={styles.infoValue}>{sale.warehouse_name}</Text>
                  </View>
                </View>
              )}
              {sale.created_by_name && (
                <View style={[styles.infoRow, sale.warehouse_name && { marginTop: Spacing.sm }]}>
                  <Ionicons name="person-circle-outline" size={20} color={Colors.textLight} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Atendido por</Text>
                    <Text style={styles.infoValue}>{sale.created_by_name}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Pago</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Método de Pago</Text>
                <Text style={styles.infoValue}>
                  {sale.payment_method === 'cash' ? 'Efectivo' : 
                   sale.payment_method === 'transfer' ? 'Transferencia' : 
                   sale.payment_method}
                </Text>
              </View>
            </View>
            {sale.change !== undefined && sale.change > 0 && (
              <View style={[styles.infoRow, { marginTop: Spacing.sm }]}>
                <Ionicons name="cash-outline" size={20} color={Colors.textLight} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Cambio</Text>
                  <Text style={styles.infoValue}>${Number(sale.change).toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <View style={styles.productsCard}>
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item, index) => renderProductItem({ item, index }))
            ) : (
              <Text style={styles.noProducts}>No hay productos en esta venta</Text>
            )}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${Number(sale.subtotal || 0).toFixed(2)}</Text>
          </View>

          {Number(sale.discount_amount ?? sale.discount ?? 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Descuento</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                -${Number(sale.discount_amount ?? sale.discount ?? 0).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Impuestos</Text>
            <Text style={styles.summaryValue}>
              ${Number(sale.tax_amount ?? sale.tax ?? 0).toFixed(2)}
            </Text>
          </View>

          {sale.profit_total !== undefined && sale.profit_total !== null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ganancia</Text>
              <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                ${Number(sale.profit_total).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>TOTAL</Text>
            <Text style={styles.summaryTotalValue}>
              ${Number(sale.total || sale.total_amount || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Bloque DIAN — igual a `sales/detail.jsx:294-434` */}
        {sale.dian_status && sale.dian_status !== 'not_applicable' && (
          <DianSection sale={sale} />
        )}

        {sale.dian_status === 'not_applicable' && sale.resolution_auth_number && (
          <View style={styles.resolutionFooter}>
            <Text style={styles.resolutionText}>
              AUTORIZACIÓN NUM. DE FACTURACIÓN DIAN #{sale.resolution_auth_number} — AUTORIZA{' '}
              {sale.resolution_prefix}-{sale.resolution_from} HASTA {sale.resolution_prefix}-{sale.resolution_to}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
            <Ionicons name="print-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Imprimir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Compartir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  headerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  invoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  invoiceInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  invoiceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  invoiceNumber: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  invoiceDate: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  productsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  productInfo: {
    flex: 2,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  productSku: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  productDiscount: {
    fontSize: FontSize.xs,
    color: '#EF4444',
    marginTop: 2,
  },
  productDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  productQuantity: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  productTotal: {
    width: 80,
    alignItems: 'flex-end',
  },
  productTotalText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  noProducts: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: FontSize.md,
    paddingVertical: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  summaryTotal: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  dianCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  dianCardApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  dianCardProcessing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  dianCardWarning: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  dianCardError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dianCardNeutral: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  dianTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  dianCufeLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  dianCufe: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: Spacing.xs,
  },
  dianLink: {
    fontSize: FontSize.sm,
    color: '#2563EB',
    textDecorationLine: 'underline',
    marginTop: Spacing.xs,
  },
  dianMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  resolutionFooter: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resolutionText: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
