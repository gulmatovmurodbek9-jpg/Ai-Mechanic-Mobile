import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getApiBaseUrl, loadStoredApiBaseUrl } from './src/config';
import {
  clearAccessToken as clearApiToken,
  getMe,
  login,
  register,
  requestPasswordReset,
  setAccessToken,
  setUnauthorizedHandler,
} from './src/api/client';
import {
  clearSession,
  loadLanguage,
  loadToken,
  loadUser,
  loadVehicles,
  saveLanguage,
  saveToken,
  saveUser,
  saveVehicles,
  wasOnboardingDone,
  saveOnboardingDone,
  loadActiveTab,
  saveActiveTab,
} from './src/storage';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { authenticateBiometric, biometricSupported, isBiometricEnabled, setBiometricEnabled } from './src/security';
import { registerForPushNotifications } from './src/notifications';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { AgentChatScreen } from './src/screens/AgentChatScreen';
import { DiagnosisScreen } from './src/screens/DiagnosisScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { GarageScreen } from './src/screens/GarageScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ObdScreen } from './src/screens/ObdScreen';
import { PricingScreen } from './src/screens/PricingScreen';
import { QuoteScreen } from './src/screens/QuoteScreen';
import { t } from './src/i18n';
import { AuthUser, Diagnosis, Language, UserProfile, VehicleProfile } from './src/types';

// ── Bottom tabs ──────────────────────────────────────────────
const tabs = [
  { key: 'home',      label: 'Home',        icon: 'robot-industrial'   },
  { key: 'obd',       label: 'OBD',         icon: 'car-cog'            },
  { key: 'pricing',   label: 'Pricing',     icon: 'tag-outline'        },
  { key: 'history',   label: 'History',     icon: 'history'            },
  { key: 'garage',    label: 'Profile',     icon: 'account'            },
] as const;

type TabKey = (typeof tabs)[number]['key'] | 'diagnosis' | 'quote' | 'result';

function buildProfile(user: AuthUser): UserProfile {
  return {
    name: user.name,
    city: user.city,
    email: user.email,
    phone: user.phone,
    memberSince: new Date(user.createdAt).getFullYear().toString(),
    plan: user.plan,
  };
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <InnerApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function InnerApp() {
  console.log('[App] InnerApp mount / render');
  const { mode: themeMode, colors: themeColors } = useTheme();
  const isDark = themeMode === 'dark';
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [language, setLanguageState] = useState<Language>('en');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [diagnosisResult, setDiagnosisResult] = useState<Diagnosis | null>(null);
  const [booting, setBooting] = useState(true);

  const handleLanguageChange = (next: Language) => {
    setLanguageState(next);
    void saveLanguage(next);
  };

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const showToast = (msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    void (async () => {
      await loadStoredApiBaseUrl();
      const url = await getApiBaseUrl();
      console.log('API:', url);

      const lang = await loadLanguage();
      setLanguageState(lang);

      const token = await loadToken();
      if (token) {
        // Biometric unlock gate if enabled & supported
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          const { supported } = await biometricSupported();
          if (supported) {
            const ok = await authenticateBiometric('Unlock AI Mechanic');
            if (!ok) {
              await clearSession();
              clearApiToken();
              setBooting(false);
              return;
            }
          }
        }
        setAccessToken(token);
        // Load cached user/vehicles first so the UI stays logged in even if /me fails (offline).
        const cachedUser = await loadUser();
        const cachedVehicles = await loadVehicles();
        if (cachedUser) {
          setUser(cachedUser);
          setProfile(buildProfile(cachedUser));
        }
        setVehicles(cachedVehicles);

        // Restore previously-active tab (in case app was killed by OS during a picker/camera flow).
        try {
          const savedTab = await loadActiveTab();
          if (savedTab) setActiveTab(savedTab as TabKey);
        } catch {}

        // Best-effort refresh
        try {
          const me = await getMe();
          setUser(me);
          setProfile(buildProfile(me));
        } catch (err: any) {
          // Only clear session on explicit 401 (handled by setUnauthorizedHandler).
          // Network / server errors should NOT kick user out.
        }
      }
      setBooting(false);

      // Register for push notifications (best-effort, graceful)
      try {
        const token = await registerForPushNotifications();
        if (token) console.log('Push token:', token);
      } catch {}
    })();
  }, []);

  // Persist activeTab so it survives Android OS killing the app during pickers/camera.
  useEffect(() => {
    console.log('[App] activeTab =', activeTab, 'booting =', booting);
    if (!booting) {
      void saveActiveTab(activeTab);
    }
  }, [activeTab, booting]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearApiToken();
      setUser(null);
      setProfile(null);
      setVehicles([]);
      setActiveTab('home');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // ── Auth handlers ──────────────────────────────────────────
  const handleLogin = async (input: { email: string; password: string }) => {
    try {
      const response = await login(input);
      setAccessToken(response.accessToken);
      await saveToken(response.accessToken);
      await saveUser(response.user);
      setUser(response.user);
      setProfile(buildProfile(response.user));
      setVehicles([]);
      await saveVehicles([]);
      showToast('✅ Хуш омадед!');
      const seen = await wasOnboardingDone();
      if (!seen) setShowOnboarding(true);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Login failed';
    }
  };

  const handleRegister = async (input: { name: string; email: string; password: string }) => {
    try {
      const response = await register(input);
      setAccessToken(response.accessToken);
      await saveToken(response.accessToken);
      await saveUser(response.user);
      setUser(response.user);
      setProfile(buildProfile(response.user));
      setVehicles([]);
      await saveVehicles([]);
      showToast('🎉 Аккаунт сохта шуд!');
      setShowOnboarding(true);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Registration failed';
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await requestPasswordReset(email);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Reset request failed';
    }
  };

  const handleLogout = async () => {
    clearApiToken();
    await clearSession();
    setUser(null);
    setProfile(null);
    setVehicles([]);
    setActiveTab('home');
  };

  const handleCreated = (result?: any) => {
    setRefreshToken((v) => v + 1);
    if (result && typeof result === 'object' && result.id) {
      setDiagnosisResult(result);
      setActiveTab('result' as any);
    } else {
      setActiveTab('history');
    }
  };

  const addVehicle = (vehicle: Omit<VehicleProfile, 'id'>) => {
    setVehicles((cur) => {
      const next = [...cur, { id: `garage-${Date.now()}`, ...vehicle }];
      void saveVehicles(next);
      return next;
    });
  };

  const handleProfileChange = (next: UserProfile) => {
    setProfile(next);
    if (user) {
      const updatedUser: AuthUser = {
        ...user,
        name: next.name,
        city: next.city,
        email: next.email,
        phone: next.phone,
      };
      void saveUser(updatedUser);
    }
  };

  const isAuthenticated = !!user && !!profile;

  // ── Booting splash ──
  if (booting) {
    return (
      <View style={[styles.appRoot, { backgroundColor: themeColors.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.splashLogo}>
          <MaterialCommunityIcons name="car-wrench" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.splashText}>AI Mechanic</Text>
        <ActivityIndicator color="#2256D8" style={{ marginTop: 16 }} />
      </View>
    );
  }

  // ── NOT authenticated ── show Auth screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.authRoot, { backgroundColor: themeColors.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
          onForgotPassword={handleForgotPassword}
        />
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Authenticated ── full-screen app with bottom tabs
  return (
    <View style={[styles.appRoot, { backgroundColor: themeColors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Top safe area */}
      <View style={{ height: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 0 }} />

      {/* Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <OnboardingScreen
          onDone={() => {
            setShowOnboarding(false);
            void saveOnboardingDone();
            setActiveTab('home');
          }}
        />
      </Modal>

      {/* ── Screen content ─────────────────────── */}
      <View style={styles.screenArea}>
        {activeTab === 'home' && profile ? (
          <DashboardScreen
            refreshToken={refreshToken}
            language={language}
            profile={profile}
            vehicles={vehicles}
            onNavigateToScan={() => setActiveTab('diagnosis')}
            onNavigateToPricing={() => setActiveTab('pricing')}
            onNavigateToObd={() => setActiveTab('obd')}
            onNavigateToQuote={() => setActiveTab('quote')}
          />
        ) : null}
        {activeTab === 'diagnosis' ? (
          <DiagnosisScreen 
            onCreated={handleCreated} 
            language={language} 
            vehicles={vehicles}
            onBack={() => setActiveTab('home')}
          />
        ) : null}
        {activeTab === ('result' as any) && diagnosisResult ? (
          <AgentChatScreen 
            diagnosis={diagnosisResult}
            onBack={() => setActiveTab('home')}
          />
        ) : null}
        {activeTab === 'history' ? (
          <HistoryScreen 
            refreshToken={refreshToken} 
            language={language}
            onViewReport={(diag) => {
              setDiagnosisResult(diag);
              setActiveTab('result' as any);
            }}
          />
        ) : null}
        {activeTab === 'pricing' ? <PricingScreen language={language} /> : null}
        {activeTab === 'quote' ? <QuoteScreen language={language} onBack={() => setActiveTab('home')} /> : null}
        {activeTab === 'obd' ? <ObdScreen language={language} /> : null}
        {activeTab === 'garage' && profile ? (
          <GarageScreen
            language={language}
            profile={profile}
            vehicles={vehicles}
            onProfileChange={handleProfileChange}
            onAddVehicle={addVehicle}
            onLogout={handleLogout}
            onLanguageChange={handleLanguageChange}
          />
        ) : null}
      </View>

      {/* ── Bottom Tab Bar ─────────────────────── */}
      <View style={[styles.tabBar, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabPill, active && styles.tabPillActive]}>
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={22}
                  color={active ? '#2256D8' : '#9CA3AF'}
                />
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  authRoot: {
    backgroundColor: '#EEF0F7',
    flex: 1,
  },
  appRoot: {
    backgroundColor: '#F5F6FA',
    flex: 1,
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#2256D8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  splashText: {
    color: '#0F1728',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
    letterSpacing: -0.3,
  },
  screenArea: {
    flex: 1,
  },

  // Bottom tab bar
  tabBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    paddingTop: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 56,
  },
  tabPillActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    color: '#9CA3AF',
    fontSize: 10.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
  tabLabelActive: {
    color: '#2256D8',
    fontWeight: '800',
  },

  // Toast
  toast: {
    alignSelf: 'center',
    backgroundColor: '#1A2235',
    borderRadius: 20,
    bottom: 90,
    elevation: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    zIndex: 200,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
