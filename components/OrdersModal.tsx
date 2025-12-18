import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import type { Sale } from '@/types';
import { formatCurrency } from '@/utils/helpers';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface OrdersModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectOrder: (order: Sale) => Promise<boolean>;
}

export default function OrdersModal({ visible, onClose, onSelectOrder }: OrdersModalProps) {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOrders();
    }
  }, [visible]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await posService.getRecentOrders(50);
      setOrders(data);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const handleSelectOrder = async (order: Sale) => {
    console.log('handleSelectOrder clicked', order);
    
    try {
      console.log('Llamando a onSelectOrder...');
      const success = await onSelectOrder(order);
      console.log('Resultado de onSelectOrder:', success);
      
      if (success) {
        console.log('Cerrando modal...');
        onClose();
      }
    } catch (error: any) {
      console.error('Error en handleSelectOrder del modal:', error);
      Alert.alert('Error', 'No se pudo cargar la orden');
    }
  };

  const handleDeleteOrder = async (orderId: number, orderName: string) => {
    console.log('handleDeleteOrder clicked', orderId, orderName);
    Alert.alert(
      'Eliminar Orden',
      `¿Está seguro de eliminar la orden ${orderName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Eliminando orden...', orderId);
              await posService.deleteOrder(orderId);
              // Actualizar la lista local inmediatamente
              setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
              console.log('Orden eliminada correctamente');
              Alert.alert('Éxito', 'Orden eliminada correctamente');
            } catch (error: any) {
              console.error('Error eliminando orden:', error);
              Alert.alert('Error', 'No se pudo eliminar la orden');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      case 'transfer':
        return 'card-outline';
      default:
        return 'wallet-outline';
    }
  };

  const renderOrder = ({ item }: { item: Sale }) => {
    console.log('Renderizando orden:', item.id);
    return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderTitleRow}>
          <Text style={styles.orderNumber}>
            {item.invoice_number || item.folio || `Orden #${item.id}`}
          </Text>
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          )}
        </View>
        <Text style={styles.orderDate}>
          {new Date(item.created_at).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        {item.customer_name && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="person-outline" size={16} color={Colors.textLight} />
            <Text style={styles.orderDetailText}>{item.customer_name}</Text>
          </View>
        )}
        <View style={styles.orderDetailRow}>
          <Ionicons
            name={getPaymentMethodIcon(item.payment_method)}
            size={16}
            color={Colors.textLight}
          />
          <Text style={styles.orderDetailText}>
            {item.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}
          </Text>
        </View>
        {item.items_count && (
          <View style={styles.orderDetailRow}>
            <Ionicons name="list-outline" size={16} color={Colors.textLight} />
            <Text style={styles.orderDetailText}>{item.items_count} productos</Text>
          </View>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>
          {formatCurrency(item.total || item.total_amount || 0)}
        </Text>
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.orderActionButton}
            onPress={() => {
              console.log('Botón Abrir presionado');
              handleSelectOrder(item);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={20} color={Colors.primary} />
            <Text style={styles.orderActionText}>Abrir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderActionButton, styles.deleteButton]}
            onPress={() => {
              console.log('Botón Eliminar presionado');
              handleDeleteOrder(
                item.id,
                item.invoice_number || item.folio || `#${item.id}`
              );
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Órdenes Recientes</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando órdenes...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={Colors.textLight} />
            <Text style={styles.emptyText}>No hay órdenes disponibles</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[Colors.primary]}
              />
            }
          />
        )}
      </View>
    </Modal>
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
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSize.lg,
    color: Colors.textLight,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
  },
  orderHeader: {
    gap: Spacing.xs,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
    textTransform: 'capitalize',
  },
  orderDate: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  orderDetails: {
    gap: Spacing.xs,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  orderDetailText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderTotal: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  orderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  orderActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
  },
  deleteButton: {
    paddingHorizontal: Spacing.sm,
  },
  orderActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
