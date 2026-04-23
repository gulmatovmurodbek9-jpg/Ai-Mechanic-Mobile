import { Platform, Vibration } from 'react-native';

export function tapLight() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(12);
  } else {
    Vibration.vibrate(10);
  }
}

export function tapMedium() {
  Vibration.vibrate(25);
}

export function tapSuccess() {
  Vibration.vibrate([0, 15, 40, 15]);
}

export function tapError() {
  Vibration.vibrate([0, 30, 50, 30, 50, 30]);
}
