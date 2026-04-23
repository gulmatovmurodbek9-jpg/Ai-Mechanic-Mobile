import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Secure Storage (expo-secure-store with AsyncStorage fallback) ──
// If expo-secure-store is installed, use it; otherwise fallback to AsyncStorage.
let secureAvailable = false;
let SecureStore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecureStore = require('expo-secure-store');
  secureAvailable = true;
} catch {
  secureAvailable = false;
}

// Dual-write: save to BOTH secure store and AsyncStorage so that session
// survives app re-initialization even if secure store read fails.
export async function secureSet(key: string, value: string) {
  if (secureAvailable) {
    try { await SecureStore.setItemAsync(key, value); } catch {}
  }
  try { await AsyncStorage.setItem(key, value); } catch {}
}

export async function secureGet(key: string): Promise<string | null> {
  // Try secure store first, fall back to AsyncStorage.
  if (secureAvailable) {
    try {
      const v = await SecureStore.getItemAsync(key);
      if (v) return v;
    } catch {}
  }
  try {
    const v = await AsyncStorage.getItem(key);
    if (v) return v;
  } catch {}
  return null;
}

export async function secureDelete(key: string) {
  if (secureAvailable) {
    try { await SecureStore.deleteItemAsync(key); } catch {}
  }
  try { await AsyncStorage.removeItem(key); } catch {}
}

// ── Biometric Auth (expo-local-authentication with graceful fallback) ──
let biometricAvailable = false;
let LocalAuth: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuth = require('expo-local-authentication');
  biometricAvailable = true;
} catch {
  biometricAvailable = false;
}

const BIO_KEY = '@ai_mechanic/biometric_enabled';

export async function biometricSupported(): Promise<{ supported: boolean; types: string[] }> {
  if (!biometricAvailable) return { supported: false, types: [] };
  try {
    const hw = await LocalAuth.hasHardwareAsync();
    const enrolled = await LocalAuth.isEnrolledAsync();
    const types = await LocalAuth.supportedAuthenticationTypesAsync();
    const names: string[] = [];
    // 1=Fingerprint, 2=FaceID, 3=Iris per expo docs
    if (types.includes(1)) names.push('Fingerprint');
    if (types.includes(2)) names.push('Face ID');
    if (types.includes(3)) names.push('Iris');
    return { supported: hw && enrolled, types: names };
  } catch {
    return { supported: false, types: [] };
  }
}

export async function authenticateBiometric(reason = 'Unlock AI Mechanic'): Promise<boolean> {
  if (!biometricAvailable) return true; // graceful pass-through when not installed
  try {
    const res = await LocalAuth.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return !!res?.success;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(BIO_KEY, enabled ? '1' : '0');
  } catch {}
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(BIO_KEY);
    return v === '1';
  } catch {
    return false;
  }
}
