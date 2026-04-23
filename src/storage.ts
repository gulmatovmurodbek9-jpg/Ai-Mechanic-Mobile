import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureDelete, secureGet, secureSet } from './security';
import { AuthUser, Language, VehicleProfile } from './types';

const KEYS = {
  token: '@ai_mechanic/access_token',
  user: '@ai_mechanic/user',
  vehicles: '@ai_mechanic/vehicles',
  language: '@ai_mechanic/language',
  onboardingDone: '@ai_mechanic/onboarding_done',
  activeTab: '@ai_mechanic/active_tab',
};

export async function saveActiveTab(tab: string) {
  try { await AsyncStorage.setItem(KEYS.activeTab, tab); } catch {}
}
export async function loadActiveTab(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEYS.activeTab); } catch { return null; }
}

export async function saveToken(token: string) {
  try { await secureSet(KEYS.token, token); } catch {}
}
export async function loadToken(): Promise<string | null> {
  try { return await secureGet(KEYS.token); } catch { return null; }
}
export async function clearToken() {
  try { await secureDelete(KEYS.token); } catch {}
}

export async function saveUser(user: AuthUser) {
  try { await AsyncStorage.setItem(KEYS.user, JSON.stringify(user)); } catch {}
}
export async function loadUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.user);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}
export async function clearUser() {
  try { await AsyncStorage.removeItem(KEYS.user); } catch {}
}

export async function saveVehicles(vehicles: VehicleProfile[]) {
  try { await AsyncStorage.setItem(KEYS.vehicles, JSON.stringify(vehicles)); } catch {}
}
export async function loadVehicles(): Promise<VehicleProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.vehicles);
    return raw ? (JSON.parse(raw) as VehicleProfile[]) : [];
  } catch { return []; }
}

export async function saveLanguage(language: Language) {
  try { await AsyncStorage.setItem(KEYS.language, language); } catch {}
}
export async function loadLanguage(): Promise<Language> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.language);
    if (raw === 'tj' || raw === 'ru' || raw === 'en') return raw;
  } catch {}
  return 'en';
}

export async function saveOnboardingDone() {
  try { await AsyncStorage.setItem(KEYS.onboardingDone, '1'); } catch {}
}
export async function wasOnboardingDone(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.onboardingDone);
    return raw === '1';
  } catch { return false; }
}

export async function clearSession() {
  try {
    await Promise.all([
      secureDelete(KEYS.token),
      AsyncStorage.removeItem(KEYS.user),
      AsyncStorage.removeItem(KEYS.vehicles),
    ]);
  } catch {}
}
