import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  currentSaleName: string;
  onUpdateSettings: (saleName: string) => void;
}

export default function SettingsModal({
  visible,
  onClose,
  currentSaleName,
  onUpdateSettings,
}: SettingsModalProps) {
  const [saleName, setSaleName] = useState(currentSaleName || '');

  const handleSave = () => {
    if (!saleName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la venta');
      return;
    }

    onUpdateSettings(saleName);
    onClose();
  };

  const handleClear = () => {
    setSaleName('');
  };

  // Sugerencias rápidas de nombres
  const quickNames = [
    'Venta Express',
    'Orden Telefónica',
    'Cliente VIP',
    'Venta al por Mayor',
    'Pedido Especial',
  ];

  const handleQuickSelect = (name: string) => {
    setSaleName(name);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Ajustes de Venta</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.banner}>
            <Ionicons name="settings" size={48} color={Colors.primary} />
            <Text style={styles.bannerTitle}>Personaliza tu Venta</Text>
            <Text style={styles.bannerText}>
              Asigna un nombre personalizado para identificar fácilmente esta transacción
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Nombre de la Venta</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Venta Mesa 5, Pedido Cliente VIP..."
              placeholderTextColor={Colors.textLight}
              value={saleName}
              onChangeText={setSaleName}
              multiline
              numberOfLines={2}
            />
            {saleName.length > 0 && (
              <Text style={styles.charCount}>{saleName.length} caracteres</Text>
            )}
          </View>

          {/* Sugerencias rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sugerencias Rápidas</Text>
            <View style={styles.quickOptions}>
              {quickNames.map((name, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickButton}
                  onPress={() => handleQuickSelect(name)}
                >
                  <Ionicons name="flash-outline" size={16} color={Colors.primary} />
                  <Text style={styles.quickButtonText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Información adicional */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color={Colors.info} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>¿Para qué sirve?</Text>
                <Text style={styles.infoText}>
                  El nombre personalizado te ayuda a identificar ventas específicas en tus
                  reportes y búsquedas.
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="bulb" size={24} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>Ejemplos de uso</Text>
                <Text style={styles.infoText}>
                  • "Mesa 12" para restaurantes{'\n'}
                  • "Pedido Juan Pérez" para órdenes{'\n'}
                  • "Cliente VIP" para clientes especiales{'\n'}
                  • "Venta al por mayor" para grandes pedidos
                </Text>
              </View>
            </View>
          </View>

          {/* Vista previa */}
          {saleName.length > 0 && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Vista Previa</Text>
              <View style={styles.previewCard}>
                <Ionicons name="receipt" size={20} color={Colors.primary} />
                <Text style={styles.previewText}>{saleName}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Botones de acción */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.clearButton]}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  banner: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  bannerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  bannerText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  quickOptions: {
    gap: Spacing.sm,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  quickButtonText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  infoSection: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    lineHeight: 20,
  },
  preview: {
    gap: Spacing.sm,
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
  },
  previewText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.lg,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  clearButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  clearButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.error,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
