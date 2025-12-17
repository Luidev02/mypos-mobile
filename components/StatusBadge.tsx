import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface StatusBadgeProps {
  status: string;
  type?: 'success' | 'warning' | 'error' | 'info' | 'default';
  style?: ViewStyle;
}

const STATUS_COLORS = {
  success: { bg: '#D4EDDA', text: '#155724' },
  warning: { bg: '#FFF3CD', text: '#856404' },
  error: { bg: '#F8D7DA', text: '#721C24' },
  info: { bg: '#D1ECF1', text: '#0C5460' },
  default: { bg: Colors.background, text: Colors.textLight },
};

const getStatusType = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  const statusLower = status.toLowerCase();
  
  if (['active', 'activo', 'completed', 'completado', 'open', 'abierto', 'success'].includes(statusLower)) {
    return 'success';
  }
  if (['pending', 'pendiente', 'low', 'bajo'].includes(statusLower)) {
    return 'warning';
  }
  if (['inactive', 'inactivo', 'cancelled', 'cancelado', 'closed', 'cerrado', 'error', 'agotado', 'expirado'].includes(statusLower)) {
    return 'error';
  }
  if (['info', 'información'].includes(statusLower)) {
    return 'info';
  }
  
  return 'default';
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, style }) => {
  const statusType = type || getStatusType(status);
  const colors = STATUS_COLORS[statusType];
  
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
});
