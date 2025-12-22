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
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

    const message = `
Venta #${sale.invoice_number || sale.id}
Cliente: ${sale.customer_name || 'Consumidor Final'}
Fecha: ${new Date(sale.created_at).toLocaleString('es-ES')}

Subtotal: $${Number(sale.subtotal || 0).toFixed(2)}
${sale.discount > 0 ? `Descuento: -$${Number(sale.discount).toFixed(2)}\n` : ''}IVA: $${Number(sale.tax || sale.tax_amount || 0).toFixed(2)}
TOTAL: $${Number(sale.total || 0).toFixed(2)}

Método de pago: ${sale.payment_method}
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

  const renderProductItem = ({ item, index }: { item: SaleItemDetailed; index: number }) => (
    <View key={index} style={styles.productItem}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product_name || `Producto #${item.product_id}`}</Text>
        {item.sku && <Text style={styles.productSku}>SKU: {item.sku}</Text>}
      </View>
      <View style={styles.productDetails}>
        <Text style={styles.productQuantity}>x{item.quantity}</Text>
        <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
      </View>
      <View style={styles.productTotal}>
        <Text style={styles.productTotalText}>
          ${(Number(item.quantity) * Number(item.price)).toFixed(2)}
        </Text>
      </View>
    </View>
  );

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

      <ScrollView contentContainerStyle={styles.content}>
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

          {sale.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Descuento</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                -${Number(sale.discount).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>IVA (19%)</Text>
            <Text style={styles.summaryValue}>
              ${Number(sale.tax || sale.tax_amount || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>TOTAL</Text>
            <Text style={styles.summaryTotalValue}>
              ${Number(sale.total || sale.total_amount || 0).toFixed(2)}
            </Text>
          </View>
        </View>

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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
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
