import AsyncStorage from '@react-native-async-storage/async-storage';

// ===================================================
// IP-и компютур дар шабакаи Wi-Fi (тағйир диҳед агар IP иваз шавад)
// ===================================================
const DEFAULT_COMPUTER_IP = '192.168.31.219';
const DEFAULT_PORT = 3000;
const STORAGE_KEY = '@ai_mechanic/api_base_url';

function defaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  return `http://${DEFAULT_COMPUTER_IP}:${DEFAULT_PORT}`;
}

let currentBaseUrl = defaultBaseUrl();

export const API_BASE_URL = currentBaseUrl;

export async function loadStoredApiBaseUrl() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      currentBaseUrl = stored;
    }
  } catch {}
  return currentBaseUrl;
}

export async function setApiBaseUrl(url: string) {
  currentBaseUrl = url;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, url);
  } catch {}
}

export async function getApiBaseUrl() {
  return currentBaseUrl;
}
