import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { posService } from '@/services';
import { debtsService, parseDebtError } from '@/services/debts';
import type { CreditSettings, Customer } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Registrar un préstamo en dinero o una deuda manual desde el teléfono.
 *
 * La deuda manual existe para pasar el cuaderno de fiado al sistema sin
 * inventar una venta: se anota a quién, cuánto y por qué.
 */

const CONSUMIDOR_FINAL = '222222222222';

function formatCOP(value: any): string {
  const n = Number(value) || 0;
  return `$ ${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewDebtScreen() {
  const [type, setType] = useState<'loan' | 'manual'>('loan');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestType, setInterestType] = useState<'none' | 'fixed' | 'percent'>('none');
  const [interestRate, setInterestRate] = useState('');
  const [disbursement, setDisbursement] = useState<'cash' | 'transfer'>('cash');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [credit, setCredit] = useState<any>(null);

  const [settings, setSettings] = useState<CreditSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await debtsService.getSettings();
        setSettings(s);
        setInterestType(s.default_interest_type || 'none');
        setInterestRate(s.default_interest_type === 'none' ? '' : String(s.default_interest_rate || ''));
        setDueDate(addDays(Number(s.default_term_days ?? 30)));
      } catch {
        setDueDate(addDays(30));
      }
    })();
  }, []);

  // Búsqueda de clientes con espera, para no consultar en cada tecla.
  useEffect(() => {
    if (query.trim().length < 2 || selected) {
      setResults([]);
      return;
    }
    let alive = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const list = await posService.searchCustomers(query.trim());
        if (alive) setResults((list || []).filter((c: any) => c.ident !== CONSUMIDOR_FINAL));
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setSearching(false);
      }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [query, selected]);

  async function pickCustomer(c: Customer) {
    setSelected(c);
    setQuery(`${c.name} — ${c.ident}`);
    setResults([]);
    try {
      const account = await debtsService.getCustomerAccount(c.id);
      setCredit(account.customer);
    } catch {
      setCredit(null);
    }
  }

  const principal = useMemo(() => Math.round(Number(amount) || 0), [amount]);
  const interest = useMemo(() => {
    const r = Number(interestRate) || 0;
    if (interestType === 'percent') return Math.round((principal * r) / 100);
    if (interestType === 'fixed')   return Math.round(r);
    return 0;
  }, [principal, interestType, interestRate]);
  const total = principal + interest;

  const available = credit?.available_credit;
  const exceeds = available !== null && available !== undefined && total > Number(available);

  async function handleSubmit() {
    setError(null);
    if (!selected)      return setError('Selecciona el cliente');
    if (principal <= 0) return setError('El monto debe ser mayor que cero');

    setSaving(true);
    try {
      const debt = await debtsService.createDebt({
        type,
        customer_id: selected.id,
        principal_amount: principal,
        description: description.trim() || null,
        due_date: dueDate || null,
        interest_type: interestType,
        interest_rate: interestType === 'none' ? 0 : Number(interestRate) || 0,
        disbursement_method: type === 'loan' ? disbursement : null,
      });
      router.replace(`/debts/${debt.customer_id}` as any);
    } catch (err) {
      setError(parseDebtError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {type === 'loan' ? 'Nuevo préstamo' : 'Nueva deuda'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo */}
        <View style={styles.typeRow}>
          {([
            { id: 'loan' as const,   label: 'Préstamo', icon: 'cash-outline' },
            { id: 'manual' as const, label: 'Deuda manual', icon: 'create-outline' },
          ]).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setType(t.id)}
              style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
            >
              <Ionicons
                name={t.icon as any}
                size={20}
                color={type === t.id ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.typeText, type === t.id && { color: Colors.primary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>
          {type === 'loan'
            ? 'Dinero que le prestas a un cliente. Si lo entregas en efectivo, sale de tu caja.'
            : 'Una deuda que ya existía. Útil para pasar el cuaderno de fiado al sistema.'}
        </Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Cliente */}
        <Text style={styles.label}>Cliente *</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setSelected(null); setCredit(null); }}
            placeholder="Busca por nombre o cédula…"
            placeholderTextColor={Colors.textSecondary}
            style={styles.searchInput}
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        {results.map((c) => (
          <TouchableOpacity key={c.id} style={styles.resultRow} onPress={() => pickCustomer(c)}>
            <Text style={styles.resultName}>{c.name}</Text>
            <Text style={styles.resultMeta}>
              {c.ident_type || 'CC'} {c.ident}
              {Number(c.debt_balance) > 0 ? ` · debe ${formatCOP(c.debt_balance)}` : ''}
            </Text>
          </TouchableOpacity>
        ))}

        {!!credit && (
          <View style={styles.creditBox}>
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Debe actualmente</Text>
              <Text style={styles.creditValue}>{formatCOP(credit.debt_balance)}</Text>
            </View>
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Cupo disponible</Text>
              <Text style={styles.creditValue}>
                {credit.available_credit === null ? 'Sin límite' : formatCOP(credit.available_credit)}
              </Text>
            </View>
            {!credit.credit_enabled && (
              <Text style={styles.creditWarn}>Este cliente tiene el crédito deshabilitado.</Text>
            )}
            {Number(credit.overdue_count) > 0 && (
              <Text style={styles.creditWarn}>
                Tiene {credit.overdue_count} deuda(s) vencida(s).
              </Text>
            )}
          </View>
        )}

        {/* Monto */}
        <Text style={[styles.label, { marginTop: Spacing.md }]}>
          {type === 'loan' ? 'Monto prestado *' : 'Monto de la deuda *'}
        </Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textSecondary}
          style={styles.amountInput}
        />

        {/* Entrega */}
        {type === 'loan' && (
          <>
            <Text style={[styles.label, { marginTop: Spacing.md }]}>¿Cómo le entregas el dinero? *</Text>
            <View style={styles.typeRow}>
              {([
                { id: 'cash' as const,     label: 'Efectivo' },
                { id: 'transfer' as const, label: 'Transferencia' },
              ]).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setDisbursement(m.id)}
                  style={[styles.typeBtn, disbursement === m.id && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, disbursement === m.id && { color: Colors.primary }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {disbursement === 'cash' && (
              <Text style={styles.warnHint}>
                Necesitas un turno de caja abierto. El monto se descuenta del efectivo esperado.
              </Text>
            )}
          </>
        )}

        {/* Interés */}
        <Text style={[styles.label, { marginTop: Spacing.md }]}>Interés</Text>
        <View style={styles.typeRow}>
          {([
            { id: 'none' as const,    label: 'Sin interés' },
            { id: 'percent' as const, label: 'Porcentaje' },
            { id: 'fixed' as const,   label: 'Monto fijo' },
          ]).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setInterestType(t.id)}
              style={[styles.typeBtnSmall, interestType === t.id && styles.typeBtnActive]}
            >
              <Text style={[styles.typeTextSmall, interestType === t.id && { color: Colors.primary }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {interestType !== 'none' && (
          <TextInput
            value={interestRate}
            onChangeText={setInterestRate}
            keyboardType="numeric"
            placeholder={interestType === 'percent' ? '% ej. 5' : '$ ej. 5000'}
            placeholderTextColor={Colors.textSecondary}
            style={[styles.input, { marginTop: Spacing.sm }]}
          />
        )}

        {/* Vencimiento */}
        <Text style={[styles.label, { marginTop: Spacing.md }]}>Vencimiento (AAAA-MM-DD)</Text>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-10-12"
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
        />
        {!!settings && (
          <Text style={styles.hint}>
            El plazo por defecto de tu negocio es de {settings.default_term_days} días.
          </Text>
        )}

        {/* Concepto */}
        <Text style={[styles.label, { marginTop: Spacing.md }]}>Concepto</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={type === 'loan' ? 'Ej: préstamo para el arriendo' : 'Ej: fiado del cuaderno'}
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
        />

        {/* Resumen */}
        {principal > 0 && (
          <View style={styles.summaryBox}>
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Capital</Text>
              <Text style={styles.creditValue}>{formatCOP(principal)}</Text>
            </View>
            {interest > 0 && (
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Interés</Text>
                <Text style={styles.creditValue}>{formatCOP(interest)}</Text>
              </View>
            )}
            <View style={[styles.creditRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Quedará debiendo</Text>
              <Text style={styles.summaryTotalValue}>{formatCOP(total)}</Text>
            </View>
            {exceeds && (
              <Text style={styles.creditWarn}>
                Supera el cupo disponible ({formatCOP(available)}). Necesitarás permiso de
                administración para autorizarlo.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (saving || !selected || principal <= 0) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={saving || !selected || principal <= 0}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitBtnText}>Registrar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  topBarTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BorderRadius.md,
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  typeBtnSmall: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: '#FAF7F4' },
  typeText:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  typeTextSmall: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },

  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 6 },
  hint:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: Spacing.md },
  warnHint: { fontSize: FontSize.xs, color: '#92400E', backgroundColor: Colors.warningLight, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginTop: Spacing.sm },

  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: FontSize.md, color: Colors.text, backgroundColor: Colors.white,
  },
  amountInput: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'right',
    color: Colors.text, backgroundColor: Colors.white,
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, padding: 0 },
  resultRow: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.sm, marginTop: Spacing.xs,
  },
  resultName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  resultMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  creditBox: {
    marginTop: Spacing.sm, backgroundColor: '#FAF7F4',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  creditRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  creditLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  creditValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  creditWarn:  { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.semibold, marginTop: Spacing.sm },

  summaryBox: {
    marginTop: Spacing.lg, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
  },
  summaryTotal: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  summaryTotalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  summaryTotalValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },

  errorBox: {
    backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error,
    borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm },

  submitBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg, paddingVertical: 15, alignItems: 'center',
  },
  submitBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  btnDisabled: { opacity: 0.4 },
});
