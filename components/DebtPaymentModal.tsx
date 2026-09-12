import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { debtsService, parseDebtError } from '@/services/debts';
import type { Debt, DebtPayment } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

/**
 * Modal para registrar un abono a una deuda.
 *
 * Se usa desde la lista de deudores, el estado de cuenta y el detalle de la
 * deuda. Recibe la deuda ya cargada y avisa por `onSuccess`, en lugar de saber
 * navegar.
 *
 * Los atajos de monto (mitad, todo) están porque en el mostrador el cliente
 * casi siempre dice "le abono la mitad" o "se lo pago todo", y teclear cifras
 * completas en un teléfono es lento.
 */

const METHODS = [
  { id: 'cash' as const,     label: 'Efectivo',      icon: 'cash-outline' },
  { id: 'transfer' as const, label: 'Transferencia', icon: 'swap-horizontal-outline' },
  { id: 'card' as const,     label: 'Tarjeta',       icon: 'card-outline' },
  { id: 'other' as const,    label: 'Otro',          icon: 'ellipsis-horizontal-outline' },
];

function formatCOP(value: any): string {
  const n = Number(value) || 0;
  return `$ ${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

interface Props {
  visible: boolean;
  debt: Debt | null;
  onClose: () => void;
  onSuccess?: (result: { payment: DebtPayment; fully_paid: boolean }) => void;
}

export default function DebtPaymentModal({ visible, debt, onClose, onSuccess }: Props) {
  const [amount, setAmount]       = useState('');
  const [method, setMethod]       = useState<'cash' | 'card' | 'transfer' | 'other'>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [receipt, setReceipt]     = useState<DebtPayment | null>(null);

  const balance = Number(debt?.balance) || 0;

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setMethod('cash');
    setReference('');
    setNotes('');
    setError(null);
    setReceipt(null);
  }, [visible, debt?.id]);

  const parsedAmount = useMemo(() => Math.round(Number(amount) || 0), [amount]);
  const remaining = Math.max(balance - parsedAmount, 0);

  const amountError =
    amount === ''            ? null
    : parsedAmount <= 0      ? 'El abono debe ser mayor que cero'
    : parsedAmount > balance ? `No puede superar el saldo de ${formatCOP(balance)}`
    : null;

  const canSubmit = !saving && parsedAmount > 0 && !amountError;

  async function handleSubmit() {
    if (!canSubmit || !debt) return;

    setSaving(true);
    setError(null);

    try {
      const result = await debtsService.registerPayment(debt.id, {
        amount: parsedAmount,
        payment_method: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      setReceipt(result.payment);
      onSuccess?.(result);
    } catch (err) {
      setError(parseDebtError(err).message);
    } finally {
      setSaving(false);
    }
  }

  if (!debt) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>

          {/* Cabecera */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {receipt ? 'Abono registrado' : 'Registrar abono'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {debt.customer_name} · Deuda #{debt.id}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md }} keyboardShouldPersistTaps="handled">

            {receipt ? (
              /* ── Confirmación ───────────────────────────────── */
              <View>
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                  <Text style={styles.receiptLabel}>Comprobante</Text>
                  <Text style={styles.receiptNumber}>{receipt.receipt_number}</Text>
                  <Text style={styles.receiptAmount}>{formatCOP(receipt.amount)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Saldo anterior</Text>
                  <Text style={styles.summaryValue}>{formatCOP(receipt.balance_before)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { fontWeight: FontWeight.bold }]}>Saldo pendiente</Text>
                  <Text style={[
                    styles.summaryValue,
                    { fontWeight: FontWeight.bold, color: Number(receipt.balance_after) <= 0 ? Colors.success : '#C2410C' },
                  ]}>
                    {formatCOP(receipt.balance_after)}
                  </Text>
                </View>

                {Number(receipt.balance_after) <= 0 && (
                  <View style={styles.paidBanner}>
                    <Text style={styles.paidBannerText}>La deuda quedó saldada por completo</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Listo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Formulario ─────────────────────────────────── */
              <View>
                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>Saldo pendiente</Text>
                  <Text style={styles.balanceValue}>{formatCOP(balance)}</Text>
                  {!!debt.description && (
                    <Text style={styles.balanceHint} numberOfLines={2}>{debt.description}</Text>
                  )}
                </View>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={styles.label}>Monto del abono</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  style={[styles.amountInput, amountError ? styles.inputError : null]}
                />
                {!!amountError && <Text style={styles.fieldError}>{amountError}</Text>}

                <View style={styles.quickRow}>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => setAmount(String(Math.round(balance / 2)))}
                  >
                    <Text style={styles.quickBtnText}>Mitad</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickBtn, styles.quickBtnPrimary]}
                    onPress={() => setAmount(String(Math.round(balance)))}
                  >
                    <Text style={[styles.quickBtnText, { color: Colors.white }]}>Todo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickBtn} onPress={() => setAmount('')}>
                    <Text style={styles.quickBtnText}>Limpiar</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { marginTop: Spacing.md }]}>¿Cómo paga?</Text>
                <View style={styles.methodGrid}>
                  {METHODS.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setMethod(m.id)}
                      style={[styles.methodBtn, method === m.id && styles.methodBtnActive]}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={18}
                        color={method === m.id ? Colors.primary : Colors.textSecondary}
                      />
                      <Text style={[styles.methodText, method === m.id && styles.methodTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {method === 'cash' ? (
                  <Text style={styles.hint}>
                    El abono en efectivo entra a tu turno de caja y suma al arqueo.
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.label, { marginTop: Spacing.md }]}>Referencia (opcional)</Text>
                    <TextInput
                      value={reference}
                      onChangeText={setReference}
                      placeholder="N.º de transferencia o voucher"
                      placeholderTextColor={Colors.textSecondary}
                      style={styles.input}
                    />
                  </>
                )}

                <Text style={[styles.label, { marginTop: Spacing.md }]}>Nota (opcional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ej: abona el resto el viernes"
                  placeholderTextColor={Colors.textSecondary}
                  style={styles.input}
                />

                {parsedAmount > 0 && !amountError && (
                  <View style={styles.previewBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Abona</Text>
                      <Text style={styles.summaryValue}>{formatCOP(parsedAmount)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { fontWeight: FontWeight.bold }]}>Queda debiendo</Text>
                      <Text style={[
                        styles.summaryValue,
                        { fontWeight: FontWeight.bold, color: remaining === 0 ? Colors.success : '#C2410C' },
                      ]}>
                        {formatCOP(remaining)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                    <Text style={styles.secondaryBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.successBtn, !canSubmit && styles.btnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                  >
                    {saving
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.primaryBtnText}>Registrar abono</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  balanceBox: {
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74',
    borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  balanceValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: '#9A3412', marginTop: 2 },
  balanceHint:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },

  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.md, color: Colors.text, backgroundColor: Colors.white,
  },
  amountInput: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold,
    textAlign: 'right', color: Colors.text, backgroundColor: Colors.white,
  },
  inputError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  fieldError: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },

  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  quickBtnPrimary: { backgroundColor: Colors.primary },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '47%', paddingVertical: 12, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border,
  },
  methodBtnActive: { borderColor: Colors.primary, backgroundColor: '#FAF7F4' },
  methodText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  methodTextActive: { color: Colors.primary },

  hint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm },

  previewBox: {
    marginTop: Spacing.md, backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.semibold },

  errorBox: {
    backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error,
    borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm },

  successBox: {
    alignItems: 'center', backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  receiptLabel:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm },
  receiptNumber: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  receiptAmount: { fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, color: Colors.success, marginTop: Spacing.sm },

  paidBanner: {
    marginTop: Spacing.md, backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
  },
  paidBannerText: { color: '#15803D', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  primaryBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  successBtn: {
    flex: 1, backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1, backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.lg, paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  btnDisabled: { opacity: 0.4 },
});
