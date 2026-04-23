// Push notifications helper with graceful fallback when expo-notifications
// is not yet installed. Install with: `npx expo install expo-notifications expo-device`
import { Platform } from 'react-native';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
let notifAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Device = require('expo-device');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Constants = require('expo-constants').default;
  } catch {}
  notifAvailable = true;
} catch {
  notifAvailable = false;
}

// Detect Expo Go — push notifications on Android were removed from Expo Go in SDK 53.
function isExpoGo(): boolean {
  try {
    return Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

if (notifAvailable) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!notifAvailable) return null;

  // Expo Go on Android no longer supports push notifications (SDK 53+).
  // Skip silently to avoid noisy warnings — works fine in a dev/production build.
  if (Platform.OS === 'android' && isExpoGo()) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      });
    }
    if (!Device?.isDevice) return null;
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token?.data || null;
  } catch {
    return null;
  }
}

export async function scheduleLocalNotification(title: string, body: string, seconds = 2) {
  if (!notifAvailable) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { seconds },
    });
  } catch {}
}

export const pushAvailable = notifAvailable;
