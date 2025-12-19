import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface OrderTypeModalProps {
  visible: boolean;
  onClose: () => void;
  currentType: string;
  onSelectType: (type: string) => void;
}

export default function OrderTypeModal({
  visible,
  onClose,
  currentType,
  onSelectType,
}: OrderTypeModalProps) {
  const [selectedType, setSelectedType] = useState(currentType);

  const orderTypes = [
    {
      id: 'carry',
      label: 'Llevar',
      icon: 'bag-handle-outline',
      description: 'Cliente recoge en el local',
      color: Colors.primary,
    },
    {
      id: 'Delivery',
      label: 'Entrega',
      icon: 'bicycle-outline',
      description: 'Se envía a domicilio',
      color: Colors.info,
    },
  ];

  const handleSelect = (type: string) => {
    setSelectedType(type);
  };

  const handleConfirm = () => {
    onSelectType(selectedType);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Tipo de Orden</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.banner}>
            <Ionicons name="document-text" size={48} color={Colors.primary} />
            <Text style={styles.bannerTitle}>¿Cómo será esta orden?</Text>
            <Text style={styles.bannerText}>
              Selecciona el tipo de orden para organizar mejor tus ventas
            </Text>
          </View>

          <View style={styles.options}>
            {orderTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.optionCard,
                  selectedType === type.id && styles.optionCardActive,
                  { borderLeftColor: type.color },
                ]}
                onPress={() => handleSelect(type.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    selectedType === type.id && { backgroundColor: type.color },
                  ]}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={32}
                    color={selectedType === type.id ? Colors.white : type.color}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedType === type.id && styles.optionLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text style={styles.optionDescription}>{type.description}</Text>
                </View>
                {selectedType === type.id && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.info}>
            <Ionicons name="information-circle" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              El tipo de orden te ayuda a organizar y filtrar tus ventas en los reportes
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.confirmButton]}
            onPress={handleConfirm}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
            <Text style={styles.confirmButtonText}>Confirmar</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  options: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    ...Shadow.md,
  },
  optionCardActive: {
    backgroundColor: Colors.successLight,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  optionContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  optionLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  optionLabelActive: {
    color: Colors.success,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
  },
  info: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textLight,
    lineHeight: 20,
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
  cancelButton: {
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
