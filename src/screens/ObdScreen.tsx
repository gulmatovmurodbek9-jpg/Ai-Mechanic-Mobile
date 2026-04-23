import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { BleManager, Device, State as BleState } from 'react-native-ble-plx';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { analyzeObd, getObdCodes, listDiagnoses } from '../api/client';
import { Diagnosis, KnownObdCode, Language, ObdLog } from '../types';
import { useTheme } from '../theme/ThemeContext';

type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

const OBD_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const OBD_WRITE_CHAR = '0000fff1-0000-1000-8000-00805f9b34fb';
const OBD_NOTIFY_CHAR = '0000fff2-0000-1000-8000-00805f9b34fb';
const ELM327_NAME_HINTS = ['obd', 'elm', 'v-link', 'carista', 'bafx'];

function requestBlePermissions() {
  if (Platform.OS === 'android') {
    return PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!,
    ]);
  }
  return Promise.resolve({});
}

function hexToDtc(bytes: number[]) {
  const dtcs: string[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    if (bytes[i] === 0 && bytes[i + 1] === 0) continue;
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const type = (b1 >> 6) & 0b11;
    const prefix = type === 0 ? 'P' : type === 1 ? 'C' : type === 2 ? 'B' : 'U';
    const code = prefix + ((b1 & 0x3f) * 256 + b2).toString(16).toUpperCase().padStart(4, '0');
    dtcs.push(code);
  }
  return dtcs;
}

function parseObdResponse(raw: string) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length < 2) return null;
  const mode = parseInt(parts[0], 16);
  const pid = parts.length > 1 ? parseInt(parts[1], 16) : null;
  const data = parts.slice(2).map((p) => parseInt(p, 16)).filter((n) => !isNaN(n));
  return { mode, pid, data, raw: cleaned };
}

export function ObdScreen({ language }: { language: Language }) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const titleColor = isDark ? theme.text : '#0F1728';
  const subColor = isDark ? theme.textMuted : '#9CA3AF';
  const borderColor = isDark ? theme.border : '#E5E7EB';

  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [codesInput, setCodesInput] = useState('P0300, P0171');
  const [diagnosisId, setDiagnosisId] = useState('');
  const [rpm, setRpm] = useState('—');
  const [temperature, setTemperature] = useState('—');
  const [knownCodes, setKnownCodes] = useState<KnownObdCode[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [result, setResult] = useState<ObdLog | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // BLE
  const bleManager = useRef<BleManager | null>(null);
  const [bleAvailable, setBleAvailable] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [obdResponseBuffer, setObdResponseBuffer] = useState('');
  const obdResponseRef = useRef('');
  const subscriptionRef = useRef<any>(null);
  const demoLiveInterval = useRef<any>(null);

  // Pulse animation for connecting state
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (connectionState === 'connecting' || connectionState === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [connectionState]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getObdCodes();
        setKnownCodes(data.slice(0, 4));
        const diagnosisResponse = await listDiagnoses(1, 10);
        setDiagnoses(diagnosisResponse.data);
      } catch (e) {
        // silent
      }
    };
    void load();

    try {
      bleManager.current = new BleManager();
      setBleAvailable(true);
    } catch (e) {
      setBleAvailable(false);
    }
    return () => {
      try {
        bleManager.current?.destroy();
      } catch (e) {}
    };
  }, []);

  const stopScan = useCallback(() => {
    bleManager.current?.stopDeviceScan();
  }, []);

  // ── DEMO MODE ──────────────────────────────
  const startDemoScan = async () => {
    setError('');
    setDemoMode(true);
    setDiscoveredDevices([]);
    setConnectionState('scanning');

    // Simulate scanning delay, then "discover" fake adapters
    await new Promise((r) => setTimeout(r, 1200));
    const fakeDevices = [
      { id: 'DEMO-ELM327-001', name: 'OBDII ELM327 v1.5', rssi: -52 },
      { id: 'DEMO-VLINK-002', name: 'V-LINK Pro', rssi: -71 },
    ] as unknown as Device[];
    setDiscoveredDevices(fakeDevices);
  };

  const connectToDemoDevice = async (device: Device) => {
    setConnectionState('connecting');
    setSelectedDevice(device);
    // Simulate connection handshake (ATZ, ATE0, ATL1, ATSP0)
    await new Promise((r) => setTimeout(r, 2400));
    setConnectionState('connected');
    setRpm('—');
    setTemperature('—');
  };

  const readDemoLiveData = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    // Realistic idle values that fluctuate a bit
    const baseRpm = 780 + Math.floor(Math.random() * 140 - 70);
    const baseTemp = 88 + Math.floor(Math.random() * 6 - 2);
    setRpm(String(baseRpm));
    setTemperature(String(baseTemp));
    setLoading(false);
  };

  const readDemoDtcCodes = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    // Realistic common DTCs for demo
    setCodesInput('P0300, P0171, P0420');
    setError('');
    setLoading(false);
  };

  const handleConnect = async () => {
    setError('');
    if (!bleAvailable) {
      // Fall back to demo mode automatically when BLE is not available
      await startDemoScan();
      return;
    }
    setDemoMode(false);
    setDiscoveredDevices([]);
    setConnectionState('scanning');

    try {
      await requestBlePermissions();
      const state = await bleManager.current?.state();
      if (state !== BleState.PoweredOn) {
        setError('Bluetooth is off. Please enable Bluetooth.');
        setConnectionState('idle');
        return;
      }

      bleManager.current?.startDeviceScan(null, null, (error, device) => {
        if (error) {
          setError('Scan error: ' + error.message);
          setConnectionState('idle');
          return;
        }
        if (!device?.name) return;
        const lowerName = device.name.toLowerCase();
        if (ELM327_NAME_HINTS.some((h) => lowerName.includes(h))) {
          setDiscoveredDevices((prev) => {
            if (prev.find((d) => d.id === device.id)) return prev;
            return [...prev, device];
          });
        }
      });

      // Stop scan after 8 seconds automatically
      setTimeout(() => {
        stopScan();
        setConnectionState((s) => (s === 'scanning' ? 'idle' : s));
      }, 8000);
    } catch (e: any) {
      setError(e?.message || 'Bluetooth scan failed');
      setConnectionState('idle');
    }
  };

  const connectToDevice = async (device: Device) => {
    stopScan();
    setConnectionState('connecting');
    setSelectedDevice(device);

    try {
      const connected = await bleManager.current?.connectToDevice(device.id, { timeout: 10000 });
      if (!connected) throw new Error('Connection failed');
      await connected.discoverAllServicesAndCharacteristics();

      const services = await connected.services();
      const obdService = services.find((s) => s.uuid.toLowerCase().includes('fff0'));
      if (!obdService) {
        throw new Error('OBD service not found on this adapter.');
      }

      const chars = await obdService.characteristics();
      const writeChar = chars.find((c) => c.isWritableWithResponse && c.uuid.toLowerCase().includes('fff1'));
      const notifyChar = chars.find((c) => c.isNotifiable && c.uuid.toLowerCase().includes('fff2'));

      if (!writeChar || !notifyChar) {
        throw new Error('Required OBD characteristics not found.');
      }

      // Start monitoring notifications
      subscriptionRef.current = notifyChar.monitor((error, characteristic) => {
        if (error) return;
        if (characteristic?.value) {
          const decoded = atob(characteristic.value);
          obdResponseRef.current += decoded;
          setObdResponseBuffer((prev) => prev + decoded);
        }
      });

      // Initialize adapter
      await writeChar.writeWithResponse(btoa('ATZ\r'));
      await new Promise((r) => setTimeout(r, 2000));
      await writeChar.writeWithResponse(btoa('ATE0\r'));
      await new Promise((r) => setTimeout(r, 300));
      await writeChar.writeWithResponse(btoa('ATL1\r'));
      await new Promise((r) => setTimeout(r, 300));
      await writeChar.writeWithResponse(btoa('ATSP0\r'));
      await new Promise((r) => setTimeout(r, 300));

      setSelectedDevice(connected);
      setConnectionState('connected');
      setRpm('—');
      setTemperature('—');
    } catch (e: any) {
      setError(e?.message || 'Failed to connect');
      setConnectionState('error');
    }
  };

  const sendObdCommand = async (command: string): Promise<string> => {
    if (!selectedDevice || !bleManager.current) return '';
    const services = await selectedDevice.services();
    const obdService = services.find((s) => s.uuid.toLowerCase().includes('fff0'));
    if (!obdService) return '';
    const chars = await obdService.characteristics();
    const writeChar = chars.find((c) => c.isWritableWithResponse && c.uuid.toLowerCase().includes('fff1'));
    if (!writeChar) return '';

    obdResponseRef.current = '';
    setObdResponseBuffer('');

    await writeChar.writeWithResponse(btoa(command + '\r'));

    // Wait up to 2 seconds for response
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const resp = obdResponseRef.current;
      if (resp.includes('>') || resp.includes('OK') || resp.includes('NO DATA') || resp.includes('?')) {
        return resp;
      }
    }
    return obdResponseRef.current;
  };

  const readLiveData = async () => {
    try {
      setLoading(true);

      // RPM: 010C
      const rpmResp = await sendObdCommand('010C');
      const rpmParsed = parseObdResponse(rpmResp);
      if (rpmParsed && rpmParsed.data.length >= 2) {
        const val = ((rpmParsed.data[0] * 256) + rpmParsed.data[1]) / 4;
        setRpm(Math.round(val).toString());
      }

      // Coolant Temp: 0105
      const tempResp = await sendObdCommand('0105');
      const tempParsed = parseObdResponse(tempResp);
      if (tempParsed && tempParsed.data.length >= 1) {
        const val = tempParsed.data[0] - 40;
        setTemperature(val.toString());
      }
    } catch (e: any) {
      setError('Live data read failed: ' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const readDtcCodes = async () => {
    try {
      setLoading(true);
      const resp = await sendObdCommand('03');
      const parsed = parseObdResponse(resp);
      if (parsed && parsed.data.length >= 2) {
        const codes = hexToDtc(parsed.data);
        if (codes.length > 0) {
          setCodesInput(codes.join(', '));
          setError('');
        } else {
          setCodesInput('');
          setError('No trouble codes detected.');
        }
      } else {
        setError('Could not read DTCs. Response: ' + resp);
      }
    } catch (e: any) {
      setError('DTC read failed: ' + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (!demoMode) {
      try { stopScan(); } catch {}
      try { subscriptionRef.current?.remove?.(); } catch {}
      if (selectedDevice && bleManager.current) {
        bleManager.current.cancelDeviceConnection(selectedDevice.id).catch(() => {});
      }
    }
    if (demoLiveInterval.current) {
      clearInterval(demoLiveInterval.current);
      demoLiveInterval.current = null;
    }
    setConnectionState('idle');
    setSelectedDevice(null);
    setDiscoveredDevices([]);
    setResult(null);
    setRpm('—');
    setTemperature('—');
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError('');
      const parsedCodes = codesInput.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      if (parsedCodes.length === 0) {
        setError('Please enter at least one OBD code');
        return;
      }
      const sensorData: Record<string, number> = {};
      if (rpm) sensorData.rpm = Number(rpm);
      if (temperature) sensorData.temperature = Number(temperature);

      const response = await analyzeObd({
        codes: parsedCodes,
        diagnosisId: diagnosisId.trim() || undefined,
        sensorData: Object.keys(sensorData).length ? sensorData : undefined,
      });
      setResult(response);
    } catch (e: any) {
      setError(e.message || 'OBD analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (s: string) => {
    const lower = s?.toLowerCase() || '';
    if (lower.includes('critical') || lower.includes('high')) return '#EF4444';
    if (lower.includes('medium')) return '#F59E0B';
    return '#10B981';
  };

  // ── Header Component ──
  const Header = () => (
    <View style={styles.topHeader}>
      <Text style={[styles.appName, { color: theme.primary }]}>OBD Diagnostics</Text>
      <TouchableOpacity style={[styles.notifBtn, { backgroundColor: cardBg }]} onPress={handleDisconnect}>
        <Feather name={connectionState === 'connected' ? "bluetooth" : "settings"} size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  // ── IDLE / SCANNING STATE ──
  if (connectionState === 'idle' || connectionState === 'scanning') {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Header />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <MaterialCommunityIcons name="car-cog" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Smart OBD Connect</Text>
              <Text style={styles.heroSub}>Link your vehicle telemetry for direct AI analysis of error codes.</Text>
            </View>
          </View>

          {!bleAvailable && (
            <View style={[styles.card, { marginBottom: 16, borderColor: '#10B981', borderWidth: 1, backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <MaterialCommunityIcons name="flask-outline" size={20} color="#10B981" />
                <Text style={{ fontWeight: '800', fontSize: 14, color: '#10B981' }}>Demo Mode Active</Text>
              </View>
              <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 18 }}>
                Real Bluetooth needs a native build. For the hackathon, tap <Text style={{ fontWeight: '800', color: titleColor }}>SCAN FOR ADAPTER</Text> to run a realistic simulation with sample adapters, live data, and trouble codes.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleConnect} activeOpacity={0.9} disabled={connectionState === 'scanning'}>
            {connectionState === 'scanning' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="bluetooth-connect" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>SCAN FOR ADAPTER</Text>
              </>
            )}
          </TouchableOpacity>

          {discoveredDevices.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: titleColor }]}>Found Adapters</Text>
                <Text style={{ color: subColor, fontSize: 12 }}>{discoveredDevices.length}</Text>
              </View>
              {discoveredDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[styles.deviceItem, { backgroundColor: cardBg }]}
                  onPress={() => (demoMode ? connectToDemoDevice(device) : connectToDevice(device))}
                  activeOpacity={0.85}
                >
                  <View style={[styles.deviceIconWrap, isDark && { backgroundColor: theme.surfaceAlt }]}>
                    <MaterialCommunityIcons name="bluetooth" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, { color: titleColor }]}>{device.name}</Text>
                    <Text style={[styles.deviceId, { color: subColor }]}>{device.id}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={subColor} />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>Manual Entry</Text>
            <Feather name="edit-2" size={14} color={subColor} />
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={styles.label}>ENTER OBD CODES</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
              value={codesInput}
              onChangeText={setCodesInput}
              placeholder="e.g. P0300, P0171"
              placeholderTextColor={subColor}
            />
            <TouchableOpacity style={[styles.diagnoseBtn, isDark && { backgroundColor: theme.surfaceAlt }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.primary} /> : (
                <>
                  <Feather name="zap" size={16} color={theme.primary} />
                  <Text style={[styles.diagnoseBtnText, { color: theme.primary }]}>ANALYZE NOW</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {knownCodes.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: titleColor }]}>Common Codes</Text>
              </View>
              {knownCodes.map(item => (
                <View key={item.code} style={[styles.codeItem, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.codeItemHeader}>
                    <Text style={[styles.codeNum, { color: titleColor }]}>{item.code}</Text>
                    <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) + '11' }]}>
                      <Text style={[styles.badgeText, { color: getSeverityColor(item.severity) }]}>{item.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.codeDesc, { color: subColor }]}>{item.description}</Text>
                </View>
              ))}
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ── CONNECTING STATE ──
  if (connectionState === 'connecting') {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Header />
        <View style={styles.center}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(34,86,216,0.06)' }]}>
            <View style={[styles.pulseInner, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#F0F4FF' }]}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons name="bluetooth-connect" size={48} color={theme.primary} />
              </Animated.View>
            </View>
          </Animated.View>
          <Text style={[styles.loadingTitle, { color: titleColor }]}>Connecting to adapter...</Text>
          <Text style={[styles.loadingSub, { color: subColor }]}>Handshaking with OBD-II adapter via Bluetooth Low Energy.</Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleDisconnect}>
            <Text style={[styles.cancelBtnText, { color: theme.primary }]}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── ERROR STATE ──
  if (connectionState === 'error') {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Header />
        <View style={styles.center}>
          <View style={[styles.pulseCircle, { backgroundColor: 'rgba(239,68,68,0.06)' }]}>
            <View style={[styles.pulseInner, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEF2F2' }]}>
              <MaterialCommunityIcons name="bluetooth-off" size={40} color="#EF4444" />
            </View>
          </View>
          <Text style={[styles.loadingTitle, { color: titleColor }]}>Connection Failed</Text>
          <Text style={[styles.loadingSub, { color: subColor }]}>{error || 'Could not connect to the OBD adapter.'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleConnect}>
            <Text style={styles.primaryBtnText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── CONNECTED STATE ──
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: cardBg }]}>
          <View style={styles.statusBadgeGreen}>
            <View style={styles.dot} />
            <Text style={styles.statusTextGreen}>CONNECTED</Text>
          </View>
          <Text style={[styles.statusCar, { color: titleColor }]}>
            {selectedDevice?.name ?? 'OBD-II Adapter'}
            {demoMode ? '  (DEMO)' : ''}
          </Text>
          <MaterialCommunityIcons name="link-variant" size={24} color="#10B981" style={styles.statusIcon} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>Live Data</Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.row}>
            <View style={[styles.liveBlock, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#F0F4FF' }]}>
              <Text style={[styles.liveLabel, { color: theme.primary }]}>RPM</Text>
              <Text style={[styles.liveValue, { color: titleColor }]}>{rpm}</Text>
            </View>
            <View style={[styles.liveBlock, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFF7ED' }]}>
              <Text style={[styles.liveLabel, { color: '#D97706' }]}>TEMP (°C)</Text>
              <Text style={[styles.liveValue, { color: titleColor }]}>{temperature}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.secondaryBtn, { marginTop: 14, backgroundColor: isDark ? theme.surfaceAlt : '#F0F4FF' }]}
            onPress={demoMode ? readDemoLiveData : readLiveData}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={18} color={theme.primary} />
                <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>READ LIVE DATA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>Error Codes</Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={styles.label}>DETECTED CODES</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
            value={codesInput}
            onChangeText={setCodesInput}
            placeholder="Tap Read Codes or enter manually"
            placeholderTextColor={subColor}
          />
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginBottom: 12, backgroundColor: isDark ? theme.surfaceAlt : '#F0F4FF' }]}
            onPress={demoMode ? readDemoDtcCodes : readDtcCodes}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <MaterialCommunityIcons name="code-tags" size={18} color={theme.primary} />
                <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>READ CODES FROM ECU</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Feather name="cpu" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>REQUEST AI ANALYSIS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result?.analysis && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: titleColor }]}>AI Findings</Text>
            </View>
            {result.analysis.map(item => (
              <View key={item.code} style={[styles.resCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.resHeader}>
                  <Text style={[styles.resCode, { color: titleColor }]}>{item.code}</Text>
                  <View style={[styles.badge, { backgroundColor: getSeverityColor(item.severity) + '11' }]}>
                    <Text style={[styles.badgeText, { color: getSeverityColor(item.severity) }]}>{item.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[styles.resDesc, { color: subColor }]}>{item.description}</Text>
                <View style={[styles.recBox, isDark && { backgroundColor: theme.surfaceAlt }]}>
                  <Feather name="tool" size={14} color={theme.primary} />
                  <Text style={[styles.recText, isDark && { color: theme.primary }]}>{item.recommendation}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Text style={styles.disconnectBtnText}>End Session</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F5F6FA',
    flex: 1,
  },
  content: {
    padding: 18,
    paddingTop: 8,
  },
  topHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  appName: {
    color: "#2256D8",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  notifBtn: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#2256D8',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },

  /* Common UI Elements */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F1728',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F1728',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#2256D8',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  diagnoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  diagnoseBtnText: {
    color: '#2256D8',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#2256D8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1728',
  },
  deviceId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  liveBlock: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  liveValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
  },

  /* Code Items */
  codeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
  },
  codeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codeNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F1728',
  },
  codeDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Connecting */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34, 86, 216, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pulseInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
    marginBottom: 10,
  },
  loadingSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelBtn: {
    marginTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 13,
  },

  /* Connected */
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusTextGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  },
  statusCar: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1728',
  },
  statusIcon: {
    position: 'absolute',
    right: 20,
    top: 25,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
  minInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1728',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  /* Results */
  resCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F1728',
  },
  resDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 14,
  },
  recBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: '#2256D8',
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectBtn: {
    marginTop: 30,
    alignSelf: 'center',
    padding: 10,
  },
  disconnectBtnText: {
    color: '#9CA3AF',
    fontWeight: '700',
  }
});
