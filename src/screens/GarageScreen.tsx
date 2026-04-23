import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import {
  biometricSupported,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateBiometric,
} from '../security';
import { Language, UserProfile, VehicleProfile } from '../types';

export function GarageScreen({
  language,
  profile,
  vehicles,
  onProfileChange,
  onAddVehicle,
  onLogout,
  onLanguageChange,
}: {
  language: Language;
  profile: UserProfile;
  vehicles: VehicleProfile[];
  onProfileChange: (next: UserProfile) => void;
  onAddVehicle: (vehicle: Omit<VehicleProfile, 'id'>) => void;
  onLogout: () => void | Promise<void>;
  onLanguageChange?: (next: Language) => void;
}) {
  const { mode: themeMode, toggle: toggleTheme, colors: theme } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const cardBorder = isDark ? { borderWidth: 1, borderColor: theme.border } : null;
  const titleColor = isDark ? theme.text : '#0F1728';

  // Biometric
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioTypes, setBioTypes] = useState<string[]>([]);
  const [bioSupport, setBioSupport] = useState(false);
  useEffect(() => {
    (async () => {
      const s = await biometricSupported();
      setBioSupport(s.supported);
      setBioTypes(s.types);
      setBioEnabled(await isBiometricEnabled());
    })();
  }, []);

  const handleBiometricToggle = async () => {
    if (!bioSupport) {
      Alert.alert(
        'Not Available',
        'Your device does not support biometric authentication, or no fingerprint/face is enrolled.'
      );
      return;
    }
    if (!bioEnabled) {
      const ok = await authenticateBiometric('Enable biometric login');
      if (ok) {
        await setBiometricEnabled(true);
        setBioEnabled(true);
      }
    } else {
      await setBiometricEnabled(false);
      setBioEnabled(false);
    }
  };

  const cycleLanguage = () => {
    if (!onLanguageChange) return;
    const order: Language[] = ['en', 'ru', 'tj'];
    const i = order.indexOf(language);
    const next = order[(i + 1) % order.length];
    onLanguageChange(next);
  };
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [nickname, setNickname] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  // Account Settings modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [editCity, setEditCity] = useState(profile.city);

  const openAccountModal = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setEditPhone(profile.phone);
    setEditCity(profile.city);
    setShowAccountModal(true);
  };

  const saveAccount = () => {
    if (!editName.trim()) return Alert.alert('Error', 'Name cannot be empty.');
    if (!editEmail.trim()) return Alert.alert('Error', 'Email cannot be empty.');
    onProfileChange({
      ...profile,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      city: editCity.trim(),
    });
    setShowAccountModal(false);
  };

  const showPaymentMethods = () => {
    Alert.alert(
      'Payment Methods',
      `Current plan: ${profile.plan}\n\nUpgrade to Pro to unlock:\n• Unlimited diagnoses\n• Priority AI analysis\n• Advanced OBD features`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Upgrade to Pro', onPress: () => Alert.alert('Coming Soon', 'Pro upgrade will be available soon!') },
      ]
    );
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => onLogout() },
    ]);
  };

  const languageLabel =
    language === 'tj' ? 'Тоҷикӣ (TJ)' : language === 'ru' ? 'Русский (RU)' : 'English (US)';

  const firstVehicle = vehicles[0];

  const handleAddVehicle = () => {
    const numericYear = Number(year);
    const maxYear = new Date().getFullYear() + 1;
    if (
      !nickname.trim() ||
      !make.trim() ||
      !model.trim() ||
      !Number.isInteger(numericYear) ||
      numericYear < 1950 ||
      numericYear > maxYear
    ) {
      setError(t(language, 'diagnosisBadYear'));
      return;
    }
    onAddVehicle({
      nickname: nickname.trim(),
      make: make.trim(),
      model: model.trim(),
      year: numericYear,
    });
    setError('');
    setNickname('');
    setMake('');
    setModel('');
    setYear('');
    setShowAddVehicle(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: isDark ? theme.border : '#F1F3F7' }]}>
        <Text style={styles.headerLeft}>AI Mechanic</Text>
        <Text style={styles.headerRight}>PROFILE</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(profile.name || 'U')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() || '')
                .join('') || 'U'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editBadge} activeOpacity={0.85} onPress={openAccountModal}>
            <Feather name="edit-2" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.name, { color: titleColor }]}>{profile.name || 'User'}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        {/* Vehicle Card */}
        <TouchableOpacity
          style={[styles.card, styles.rowCard, { backgroundColor: cardBg }, cardBorder]}
          activeOpacity={0.9}
          onPress={() => setShowAddVehicle((s) => !s)}
        >
          <View style={styles.iconSquare}>
            <MaterialCommunityIcons name="car" size={22} color="#2256D8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Vehicle Profile</Text>
            {firstVehicle ? (
              <Text style={styles.rowSub}>
                {firstVehicle.year} {firstVehicle.make} {firstVehicle.model}
                {firstVehicle.nickname ? `  •  ${firstVehicle.nickname}` : ''}
              </Text>
            ) : (
              <Text style={styles.rowSub}>{t(language, 'garageEmpty')}</Text>
            )}
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Add vehicle inline form */}
        {showAddVehicle && (
          <View style={[styles.card, { backgroundColor: cardBg }, cardBorder]}>
            <Text style={styles.formTitle}>{t(language, 'addVehicle')}</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t(language, 'vehicleNickname')}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput]}
                value={make}
                onChangeText={setMake}
                placeholder={t(language, 'vehicleMake')}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.input, styles.rowInput]}
                value={model}
                onChangeText={setModel}
                placeholder={t(language, 'vehicleModel')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TextInput
              style={styles.input}
              value={year}
              onChangeText={setYear}
              placeholder={t(language, 'vehicleYear')}
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAddVehicle}>
              <Text style={styles.primaryBtnText}>{t(language, 'addVehicle')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.achSectionHeader}>
          <Text style={[styles.achSectionTitle, { color: titleColor }]}>Achievements</Text>
          <Text style={styles.achSectionCount}>
            {[true, vehicles.length > 0, vehicles.length > 1, profile.plan === 'Pro', false, false].filter(Boolean).length}/6
          </Text>
        </View>
        {(() => {
          const badges = [
            { icon: 'rocket-launch' as const, label: 'First Step', desc: 'Created account', unlocked: true, color: '#2256D8' },
            { icon: 'car' as const, label: 'Garage', desc: 'Added a vehicle', unlocked: vehicles.length > 0, color: '#10B981' },
            { icon: 'car-multiple' as const, label: 'Multi-car', desc: '2+ vehicles', unlocked: vehicles.length > 1, color: '#F59E0B' },
            { icon: 'crown' as const, label: 'Pro Member', desc: 'Upgrade to Pro', unlocked: profile.plan === 'Pro', color: '#A855F7' },
            { icon: 'shield-check' as const, label: 'OBD Master', desc: '5+ OBD scans', unlocked: false, color: '#06B6D4' },
            { icon: 'piggy-bank' as const, label: 'Smart Saver', desc: 'Save $500+', unlocked: false, color: '#EC4899' },
          ];
          return (
            <View style={styles.achGrid}>
              {badges.map((b, i) => (
                <View key={i} style={[styles.achCard, !b.unlocked && styles.achCardLocked]}>
                  <View
                    style={[
                      styles.achIconCircle,
                      { backgroundColor: b.unlocked ? b.color + '20' : '#F3F4F6' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={b.icon}
                      size={22}
                      color={b.unlocked ? b.color : '#9CA3AF'}
                    />
                    {!b.unlocked && (
                      <View style={styles.achLockOverlay}>
                        <Feather name="lock" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[styles.achLabel, !b.unlocked && { color: '#9CA3AF' }]}
                    numberOfLines={1}
                  >
                    {b.label}
                  </Text>
                  <Text style={styles.achDesc} numberOfLines={1}>
                    {b.desc}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Grouped settings list */}
        <View style={[styles.card, { backgroundColor: cardBg }, cardBorder]}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={openAccountModal}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons name="account-cog" size={22} color="#2256D8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Account Settings</Text>
              <Text style={styles.rowSub}>Edit name, email, phone, city</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={cycleLanguage}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons name="web" size={22} color="#2256D8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Language</Text>
              <Text style={styles.rowSub}>{languageLabel} — tap to change</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={toggleTheme}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons
                name={themeMode === 'dark' ? 'weather-night' : 'white-balance-sunny'}
                size={22}
                color="#2256D8"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Appearance</Text>
              <Text style={styles.rowSub}>{themeMode === 'dark' ? 'Dark mode' : 'Light mode'} — tap to switch</Text>
            </View>
            <View style={[styles.toggleTrack, themeMode === 'dark' && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, themeMode === 'dark' && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={handleBiometricToggle}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons name="fingerprint" size={22} color="#2256D8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Biometric Login</Text>
              <Text style={styles.rowSub}>
                {bioSupport
                  ? bioEnabled
                    ? `${bioTypes.join(' · ') || 'Enabled'} active`
                    : `Secure login with ${bioTypes.join(' or ') || 'biometrics'}`
                  : 'Not available on this device'}
              </Text>
            </View>
            <View style={[styles.toggleTrack, bioEnabled && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, bioEnabled && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={showPaymentMethods}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons name="credit-card-outline" size={22} color="#2256D8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Payment Methods</Text>
              <Text style={styles.rowSub}>Plan: {profile.plan}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Account Settings Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F5F6FA' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAccountModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveAccount}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.inputField}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="John Doe"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Email</Text>
              <View style={styles.inputWrap}>
                <Feather name="mail" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.inputField}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Phone</Text>
              <View style={styles.inputWrap}>
                <Feather name="phone" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.inputField}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+992 90 000 0000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>City</Text>
              <View style={styles.inputWrap}>
                <Feather name="map-pin" size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.inputField}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Dushanbe"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={[styles.card, { marginTop: 14 }]}>
              <Text style={styles.inputLabel}>Member Since</Text>
              <Text style={styles.readOnlyValue}>{profile.memberSince}</Text>
              <View style={{ height: 1, backgroundColor: '#F1F3F7', marginVertical: 12 }} />
              <Text style={styles.inputLabel}>Current Plan</Text>
              <Text style={styles.readOnlyValue}>{profile.plan}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F5F6FA',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    color: '#0F1728',
    fontSize: 18,
    fontWeight: '900',
  },
  headerRight: {
    color: '#2256D8',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 18,
    paddingTop: 6,
  },

  /* Avatar */
  avatarWrap: {
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 14,
    width: 120,
    height: 120,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2256D8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#2256D8',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2256D8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
    marginTop: 6,
  },
  email: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 22,
  },

  /* Cards / rows */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F3F7',
    marginVertical: 4,
  },
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F1728',
  },
  rowSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  /* Form */
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F1728',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#0F1728',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#2256D8',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Toggle */
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#2256D8',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },

  /* Achievements */
  achSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  achSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F1728',
  },
  achSectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2256D8',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  achGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  achCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  achCardLocked: {
    backgroundColor: '#FAFAFA',
  },
  achIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  achLockOverlay: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  achLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F1728',
    marginBottom: 2,
  },
  achDesc: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  /* Modal */
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F7',
  },
  modalCancel: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#0F1728',
    fontSize: 17,
    fontWeight: '900',
  },
  modalSave: {
    color: '#2256D8',
    fontSize: 15,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F1728',
    fontWeight: '500',
    padding: 0,
  },
  readOnlyValue: {
    fontSize: 15,
    color: '#0F1728',
    fontWeight: '700',
  },
});
