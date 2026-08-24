import { LoadingState } from '@/components/LoadingState';
import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { companyService } from '@/services/extended';
import type { Company } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function GeneralScreenContent() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [regimenType, setRegimenType] = useState<Company['regimen_type']>('responsable_iva');
  const [currency, setCurrency] = useState<Company['currency']>('COP');
  const [reportsDian, setReportsDian] = useState(false);

  const loadCompany = async () => {
    try {
      setIsLoading(true);
      const company = await companyService.getCompany();
      setName(company.name || '');
      setTradeName(company.trade_name || '');
      setAddress(company.address || '');
      setCity(company.city || '');
      setDepartment(company.department || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setWebsite(company.website || '');
      setLogoUrl(company.logo_url || '');
      setRegimenType(company.regimen_type || 'responsable_iva');
      setCurrency(company.currency || 'COP');
      setReportsDian(company.report_dian === 'YES');
    } catch (e) {
      toast.error('No se pudo cargar la información de la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('La razón social es requerida');
      return;
    }
    try {
      setIsSaving(true);
      await companyService.updateCompany({
        name: name.trim(),
        trade_name: tradeName.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        department: department.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        regimen_type: regimenType,
        currency,
        report_dian: reportsDian ? 'YES' : 'NO',
      });
      toast.success('Empresa actualizada');
      await loadCompany();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo guardar la empresa');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Cargando empresa..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información General</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <Text style={styles.label}>
          Razón Social <Text style={styles.required}>*</Text>
        </Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nombre legal de la empresa" />

        <Text style={styles.label}>Nombre Comercial</Text>
        <TextInput style={styles.input} value={tradeName} onChangeText={setTradeName} placeholder="Nombre comercial" />

        <Text style={styles.label}>Dirección</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Dirección" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ciudad</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ciudad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Departamento</Text>
            <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholder="Departamento" />
          </View>
        </View>

        <Text style={styles.label}>Teléfono</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Teléfono" keyboardType="phone-pad" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="correo@empresa.com" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Sitio Web</Text>
        <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://..." autoCapitalize="none" />

        <Text style={styles.label}>URL del Logo</Text>
        <TextInput style={styles.input} value={logoUrl} onChangeText={setLogoUrl} placeholder="https://..." autoCapitalize="none" />
        <Text style={styles.hint}>Igual que el web: es un enlace a una imagen ya alojada, no una subida de archivo.</Text>

        <Text style={styles.label}>Régimen Tributario</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={regimenType} onValueChange={(v) => setRegimenType(v)}>
            <Picker.Item label="Responsable de IVA" value="responsable_iva" />
            <Picker.Item label="No Responsable de IVA" value="no_responsable_iva" />
            <Picker.Item label="Régimen Simple de Tributación" value="simple_tributacion" />
          </Picker>
        </View>

        <Text style={styles.label}>Moneda</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={currency} onValueChange={(v) => setCurrency(v)}>
            <Picker.Item label="Peso Colombiano (COP)" value="COP" />
            <Picker.Item label="Dólar (USD)" value="USD" />
            <Picker.Item label="Euro (EUR)" value="EUR" />
          </Picker>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Reporta a la DIAN</Text>
            <Text style={styles.hint}>Decide si las ventas se facturan electrónicamente o como factura POS.</Text>
          </View>
          <Switch value={reportsDian} onValueChange={setReportsDian} trackColor={{ true: Colors.primary }} />
        </View>

        <TouchableOpacity style={[styles.saveButton, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function GeneralScreen() {
  return (
    <RequirePermission perm="manage_settings">
      <GeneralScreenContent />
    </RequirePermission>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 8 : Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  backButton: {
    width: 24,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  required: {
    color: Colors.error,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
    minHeight: 48,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
});
