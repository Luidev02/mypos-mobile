import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { PALETTES, PaletteKey, useAppTheme } from '@/contexts/ThemeContext';
import { profileService } from '@/services';
import type { UserProfile } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
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

type TabKey = 'info' | 'password' | 'details' | 'apariencia';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Información' },
  { key: 'password', label: 'Contraseña' },
  { key: 'details', label: 'Cuenta' },
  { key: 'apariencia', label: '🎨 Apariencia' },
];

export default function ProfileScreen() {
  const { updateUserInfo } = useAuth();
  const { dark, setDark, palette, setPalette, tones } = useAppTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formProfile, setFormProfile] = useState({ username: '', email: '', pin_code: '' });
  const [formPassword, setFormPassword] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      setFormProfile({
        username: data.username || '',
        email: data.email || '',
        pin_code: data.pin_code || '',
      });
      // Preferencias guardadas en el servidor tienen prioridad — igual que el web.
      if (data.theme_palette && PALETTES[data.theme_palette]) {
        setPalette(data.theme_palette as PaletteKey);
      }
      if (data.theme_mode === 'dark' || data.theme_mode === 'light') {
        setDark(data.theme_mode === 'dark');
      }
    } catch (e) {
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const showTemporaryMessage = (setter: (v: string) => void, message: string) => {
    setter(message);
    setTimeout(() => setter(''), 3500);
  };

  const handleSubmitProfile = async () => {
    if (!formProfile.username.trim() || !formProfile.email.trim()) {
      showTemporaryMessage(setError, 'Nombre y email son obligatorios');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileService.updateProfile(formProfile);
      await updateUserInfo({ username: formProfile.username, email: formProfile.email });
      showTemporaryMessage(setSuccess, 'Perfil actualizado exitosamente');
      fetchProfile();
    } catch (e) {
      showTemporaryMessage(setError, 'Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPassword = async () => {
    if (!formPassword.current_password || !formPassword.new_password || !formPassword.confirm_password) {
      showTemporaryMessage(setError, 'Todos los campos son obligatorios');
      return;
    }
    if (formPassword.new_password !== formPassword.confirm_password) {
      showTemporaryMessage(setError, 'Las contraseñas no coinciden');
      return;
    }
    if (formPassword.new_password.length < 6) {
      showTemporaryMessage(setError, 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileService.changePassword({
        current_password: formPassword.current_password,
        new_password: formPassword.new_password,
      });
      showTemporaryMessage(setSuccess, 'Contraseña actualizada exitosamente');
      setFormPassword({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e: any) {
      showTemporaryMessage(
        setError,
        e.response?.data?.message ||
          'Error al cambiar la contraseña. Verifique que la contraseña actual sea correcta.'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveAppearance = async (nextPalette: PaletteKey, nextDark: boolean) => {
    try {
      await profileService.updateProfile({
        theme_palette: nextPalette,
        theme_mode: nextDark ? 'dark' : 'light',
      });
    } catch {
      // La preferencia ya quedó aplicada localmente (AsyncStorage); si el
      // guardado en servidor falla, no interrumpimos al usuario.
    }
  };

  const handleToggleDark = () => {
    const next = !dark;
    setDark(next);
    saveAppearance(palette, next);
  };

  const handleSetPalette = (key: PaletteKey) => {
    setPalette(key);
    saveAppearance(key, dark);
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header />

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content}>
        {!!error && (
          <View style={styles.bannerError}>
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        )}
        {!!success && (
          <View style={styles.bannerSuccess}>
            <Text style={styles.bannerSuccessText}>{success}</Text>
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.card}>
            <Field label="Nombre Completo *">
              <TextInput
                style={styles.input}
                value={formProfile.username}
                onChangeText={(t) => setFormProfile((p) => ({ ...p, username: t }))}
                placeholder="Nombre de usuario"
                placeholderTextColor={Colors.textLight}
              />
            </Field>
            <Field label="Email *">
              <TextInput
                style={styles.input}
                value={formProfile.email}
                onChangeText={(t) => setFormProfile((p) => ({ ...p, email: t }))}
                placeholder="correo@empresa.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>
            <Field label="PIN de Acceso POS" hint="PIN numérico para acceso rápido en el punto de venta">
              <TextInput
                style={styles.input}
                value={formProfile.pin_code}
                onChangeText={(t) => setFormProfile((p) => ({ ...p, pin_code: t.replace(/\D/g, '') }))}
                placeholder="6 dígitos"
                placeholderTextColor={Colors.textLight}
                keyboardType="number-pad"
                maxLength={6}
              />
            </Field>
            <SubmitButton
              label="Guardar Cambios"
              loadingLabel="Guardando..."
              saving={saving}
              onPress={handleSubmitProfile}
            />
          </View>
        )}

        {activeTab === 'password' && (
          <View style={styles.card}>
            <Field label="Contraseña Actual *">
              <TextInput
                style={styles.input}
                value={formPassword.current_password}
                onChangeText={(t) => setFormPassword((p) => ({ ...p, current_password: t }))}
                secureTextEntry
                placeholderTextColor={Colors.textLight}
              />
            </Field>
            <Field label="Nueva Contraseña *" hint="Mínimo 6 caracteres">
              <TextInput
                style={styles.input}
                value={formPassword.new_password}
                onChangeText={(t) => setFormPassword((p) => ({ ...p, new_password: t }))}
                secureTextEntry
                placeholderTextColor={Colors.textLight}
              />
            </Field>
            <Field label="Confirmar Nueva Contraseña *">
              <TextInput
                style={styles.input}
                value={formPassword.confirm_password}
                onChangeText={(t) => setFormPassword((p) => ({ ...p, confirm_password: t }))}
                secureTextEntry
                placeholderTextColor={Colors.textLight}
              />
            </Field>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Importante</Text>
              <Text style={styles.warningText}>
                Al cambiar tu contraseña, tu sesión se mantendrá activa pero deberás usar la
                nueva contraseña en futuros inicios de sesión.
              </Text>
            </View>

            <SubmitButton
              label="Cambiar Contraseña"
              loadingLabel="Actualizando..."
              saving={saving}
              onPress={handleSubmitPassword}
            />
          </View>
        )}

        {activeTab === 'details' && profile && (
          <View style={styles.card}>
            <View style={styles.detailsGrid}>
              <DetailBox label="ID de Usuario" value={`#${profile.id}`} mono />
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Estado</Text>
                <View
                  style={[
                    styles.statusBadge,
                    profile.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: profile.status === 'active' ? '#15803D' : Colors.error },
                    ]}
                  >
                    {profile.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
              <DetailBox label="Empresa" value={profile.company_name || '—'} />
              <DetailBox label="Rol" value={profile.role_name || '—'} bold />
              <DetailBox
                label="Miembro Desde"
                value={
                  profile.creation_date
                    ? new Date(profile.creation_date).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'
                }
                full
              />
            </View>

            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerTitle}>ℹ️ Información de Cuenta</Text>
              <Text style={styles.infoBannerText}>
                Tu rol y permisos son administrados por tu empresa. Para cambios en el rol o
                estado, contacta con tu administrador.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'apariencia' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Modo de Visualización</Text>
            <View style={[styles.darkModeRow, { backgroundColor: tones.surface, borderColor: tones.border }]}>
              <View style={styles.darkModeLeft}>
                <Text style={styles.darkModeEmoji}>{dark ? '🌙' : '☀️'}</Text>
                <View>
                  <Text style={styles.darkModeTitle}>{dark ? 'Modo Oscuro' : 'Modo Claro'}</Text>
                  <Text style={styles.darkModeSubtitle}>
                    {dark ? 'Fondo oscuro, ideal para poca luz' : 'Fondo claro, ideal para entornos iluminados'}
                  </Text>
                </View>
              </View>
              <Switch
                value={dark}
                onValueChange={handleToggleDark}
                trackColor={{ false: '#D1D5DB', true: tones.brand }}
                thumbColor={Colors.white}
              />
            </View>

            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Paleta de Color</Text>
            <View style={styles.paletteGrid}>
              {(Object.keys(PALETTES) as PaletteKey[]).map((key) => {
                const p = PALETTES[key];
                const isActive = palette === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.paletteOption,
                      { borderColor: isActive ? p.brand : Colors.border },
                    ]}
                    onPress={() => handleSetPalette(key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.paletteSwatch, { backgroundColor: p.brand }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paletteLabel} numberOfLines={1}>{p.label}</Text>
                      {isActive && <Text style={[styles.paletteActive, { color: p.brand }]}>Activa ✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Vista Previa</Text>
            <View style={[styles.previewBox, { backgroundColor: tones.bg, borderColor: tones.border }]}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewLogo, { backgroundColor: tones.brand }]}>
                  <Text style={styles.previewLogoText}>M</Text>
                </View>
                <View>
                  <Text style={[styles.previewBrand, { color: tones.dark }]}>MYPOS</Text>
                  <Text style={styles.previewSubtitle}>Paleta activa: {PALETTES[palette].label}</Text>
                </View>
              </View>
              <View style={styles.previewChips}>
                <View style={[styles.previewChip, { backgroundColor: tones.brand }]}>
                  <Text style={styles.previewChipTextWhite}>Primario</Text>
                </View>
                <View style={[styles.previewChip, { backgroundColor: tones.surface }]}>
                  <Text style={[styles.previewChipText, { color: tones.dark }]}>Surface</Text>
                </View>
                <View style={[styles.previewChip, styles.previewChipOutline, { borderColor: tones.border }]}>
                  <Text style={[styles.previewChipText, { color: tones.dark }]}>Border</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.versionText}>
          MyPOS Mobile · v{Constants.expoConfig?.version || '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.white} />
      </TouchableOpacity>
      <Text style={styles.title}>Mi Perfil</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {!!hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function DetailBox({
  label,
  value,
  mono,
  bold,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  full?: boolean;
}) {
  return (
    <View style={[styles.detailBox, full && styles.detailBoxFull]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          mono && { fontFamily: 'monospace' },
          bold && { fontWeight: FontWeight.bold, color: Colors.primary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function SubmitButton({
  label,
  loadingLabel,
  saving,
  onPress,
}: {
  label: string;
  loadingLabel: string;
  saving: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.submitButton, saving && styles.submitButtonDisabled]}
      onPress={onPress}
      disabled={saving}
      activeOpacity={0.8}
    >
      {saving ? (
        <ActivityIndicator color={Colors.white} size="small" />
      ) : (
        <Text style={styles.submitButtonText}>{label}</Text>
      )}
    </TouchableOpacity>
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
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryDark,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    flex: 1,
    marginLeft: Spacing.md,
  },
  placeholder: {
    width: 40,
  },
  loadingBox: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textLight,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  scrollBody: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  bannerErrorText: {
    color: '#B91C1C',
    fontSize: FontSize.sm,
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  bannerSuccessText: {
    color: '#15803D',
    fontSize: FontSize.sm,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#374151',
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  warningTitle: {
    fontWeight: FontWeight.bold,
    color: '#A16207',
    fontSize: FontSize.sm,
  },
  warningText: {
    fontSize: FontSize.xs,
    color: '#A16207',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailBox: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  detailBoxFull: {
    flexBasis: '100%',
  },
  detailLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  infoBannerTitle: {
    fontWeight: FontWeight.bold,
    color: '#1D4ED8',
    fontSize: FontSize.sm,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: '#1D4ED8',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#1F2937',
    marginBottom: Spacing.md,
  },
  darkModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  darkModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  darkModeEmoji: {
    fontSize: 24,
  },
  darkModeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#1F2937',
  },
  darkModeSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  paletteOption: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  paletteSwatch: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  paletteLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#1F2937',
  },
  paletteActive: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },
  previewBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  previewLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  previewBrand: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  previewSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  previewChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  previewChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  previewChipOutline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  previewChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  previewChipTextWhite: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.white,
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.lg,
  },
});
