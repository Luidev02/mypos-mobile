import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const INSTALL_ID_KEY = 'mypos_install_id';

/**
 * `expo-secure-store` no existe en web (lanza al invocarlo). Esta app también
 * se compila a web (`expo export --platform web`), así que todo acceso al
 * almacenamiento seguro pasa por acá y cae a AsyncStorage en esa plataforma.
 */
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // Un dispositivo sin keystore disponible no debe dejar la app inutilizable.
      return AsyncStorage.getItem(key);
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async remove(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

export interface DeviceContext {
  clientType: 'mobile' | 'web';
  installId: string | null;
  deviceModel: string | null;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
  appVersion: string | null;
}

let cached: DeviceContext | null = null;

/**
 * UUID que identifica esta instalación. Se genera una sola vez y vive en el
 * almacenamiento cifrado: si el usuario reinstala la app o restaura el backup
 * en otro equipo, será distinto y el backend cancelará el refresh — que es
 * exactamente el comportamiento pedido.
 */
async function getOrCreateInstallId(): Promise<string> {
  const existing = await secureStorage.get(INSTALL_ID_KEY);
  if (existing) return existing;

  const fresh = Crypto.randomUUID();
  await secureStorage.set(INSTALL_ID_KEY, fresh);
  return fresh;
}

export async function getDeviceContext(): Promise<DeviceContext> {
  if (cached) return cached;

  if (isWeb) {
    // En web no hay install_id: el backend ata la sesión web a
    // client_type + user-agent (y por eso su refresh dura 7 días y no 30).
    cached = {
      clientType: 'web',
      installId: null,
      deviceModel: null,
      deviceName: null,
      osName: null,
      osVersion: null,
      appVersion: Constants.expoConfig?.version ?? null,
    };
    return cached;
  }

  cached = {
    clientType: 'mobile',
    installId: await getOrCreateInstallId(),
    deviceModel: Device.modelName ?? null,
    deviceName: Device.deviceName ?? null,
    // NO se usa `Device.osName`. Su documentación promete "Android" / "iOS",
    // pero en Android devuelve `Build.VERSION.BASE_OS`, que en móviles de
    // fabricante es la huella de build completa (~70 chars), por ejemplo
    // "samsung/a52sxq/a52sxq:13/TP1A.220624.014/A528BXXU2CWA1:user/release-keys".
    // Eso tumbó el login en producción (columna de 40) y, peor, al entrar en
    // la huella estricta del dispositivo haría cerrar la sesión en cada
    // actualización del fabricante. `Platform.OS` es estable y corto.
    osName: Platform.OS === 'ios' ? 'iOS' : 'Android',
    osVersion: Device.osVersion ?? String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? null,
  };
  return cached;
}

/**
 * Cabeceras que identifican al cliente. El backend las lee en login y en
 * refresh (`sessions.service.js#extractClientContext`) para construir y
 * verificar la huella del dispositivo.
 */
export async function getDeviceHeaders(): Promise<Record<string, string>> {
  const ctx = await getDeviceContext();
  const headers: Record<string, string> = { 'x-client-type': ctx.clientType };

  const optional: Record<string, string | null> = {
    'x-install-id': ctx.installId,
    'x-device-model': ctx.deviceModel,
    'x-device-name': ctx.deviceName,
    'x-os-name': ctx.osName,
    'x-os-version': ctx.osVersion,
    'x-app-version': ctx.appVersion,
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value) headers[key] = value;
  }

  return headers;
}

/** Solo para pruebas / cambio de sesión: fuerza releer el contexto. */
export function resetDeviceContextCache(): void {
  cached = null;
}
