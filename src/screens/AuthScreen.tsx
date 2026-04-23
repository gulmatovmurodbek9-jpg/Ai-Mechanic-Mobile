import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot';

export function AuthScreen({
  onLogin,
  onRegister,
  onForgotPassword,
}: {
  onLogin: (input: { email: string; password: string }) => Promise<string | null>;
  onRegister: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<string | null>;
  onForgotPassword: (email: string) => Promise<string | null>;
}) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const sheetBg = isDark ? theme.surface : '#FFFFFF';
  const titleColor = isDark ? theme.text : '#0F1728';
  const subColor = isDark ? theme.textMuted : '#6B7280';
  const borderColor = isDark ? theme.border : '#E5E7EB';
  const inputBg = isDark ? theme.surfaceAlt : '#F9FAFB';

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const reset = () => {
    setError('');
    setSuccess('');
  };

  const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleLogin = async () => {
    reset();
    if (!emailValid(email)) return setError('Please enter a valid email address.');
    if (!password) return setError('Please enter your password.');
    setLoading(true);
    const err = await onLogin({ email: email.trim(), password });
    setLoading(false);
    if (err) setError(err);
  };

  const handleRegister = async () => {
    reset();
    if (!name.trim()) return setError('Please enter your name.');
    if (!emailValid(email)) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    const err = await onRegister({ name: name.trim(), email: email.trim(), password });
    setLoading(false);
    if (err) setError(err);
  };

  const handleForgot = async () => {
    reset();
    if (!emailValid(email)) return setError('Please enter a valid email address.');
    setLoading(true);
    const err = await onForgotPassword(email.trim());
    setLoading(false);
    if (err) setError(err);
    else setSuccess('Reset link sent! Check your email.');
  };

  // ── WELCOME ─────────────────────────────────────────
  if (mode === 'welcome') {
    return (
      <View style={styles.welcomeRoot}>
        <StatusBar barStyle="light-content" />
        <View style={styles.heroSection}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          <Animated.View style={[styles.logoFloat, { transform: [{ translateY: floatY }] }]}>
            <View style={styles.logoGlow} />
            <View style={styles.logoSquareLarge}>
              <MaterialCommunityIcons name="car-wrench" size={46} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Text style={styles.heroTitle}>AI Mechanic</Text>
          <View style={styles.trustRow}>
            <View style={styles.trustPill}>
              <MaterialCommunityIcons name="star" size={13} color="#FBBF24" />
              <Text style={styles.trustText}>4.9 Rating</Text>
            </View>
            <View style={styles.trustPill}>
              <MaterialCommunityIcons name="account-group" size={13} color="#10B981" />
              <Text style={styles.trustText}>10k+ Users</Text>
            </View>
          </View>

          <Text style={styles.heroSub}>
            Understand your car.{"\n"}
            <Text style={{ color: '#FBBF24' }}>Stop overpaying.</Text>
          </Text>
        </View>

        <View style={[styles.bottomSheet, { backgroundColor: sheetBg }]}>
          <View style={styles.featureRow}>
            <View style={styles.featureCol}>
              <View style={[styles.featureIcon, { backgroundColor: '#F0F4FF' }]}>
                <MaterialCommunityIcons name="camera-plus" size={20} color="#2256D8" />
              </View>
              <Text style={styles.featureLabel}>Instant{"\n"}Diagnose</Text>
            </View>
            <View style={styles.featureCol}>
              <View style={[styles.featureIcon, { backgroundColor: '#ECFDF5' }]}>
                <MaterialCommunityIcons name="car-cog" size={20} color="#10B981" />
              </View>
              <Text style={styles.featureLabel}>OBD{"\n"}Scanner</Text>
            </View>
            <View style={styles.featureCol}>
              <View style={[styles.featureIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="currency-usd" size={20} color="#D97706" />
              </View>
              <Text style={styles.featureLabel}>Fair{"\n"}Pricing</Text>
            </View>
            <View style={styles.featureCol}>
              <View style={[styles.featureIcon, { backgroundColor: '#FCE7F3' }]}>
                <MaterialCommunityIcons name="robot-happy" size={20} color="#DB2777" />
              </View>
              <Text style={styles.featureLabel}>AI{"\n"}Assistant</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={() => { reset(); setMode('register'); }}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => { reset(); setMode('login'); }}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our <Text style={styles.termsLink}>Terms</Text> &{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    );
  }

  // ── FORM (login / register / forgot) ────────────────
  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';
  const isRegister = mode === 'register';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.backRound, isDark && { backgroundColor: theme.surfaceAlt }]}
            onPress={() => { reset(); setMode('welcome'); }}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={18} color="#0F1728" />
          </TouchableOpacity>
          <View style={styles.brandPill}>
            <MaterialCommunityIcons name="car-wrench" size={14} color="#2256D8" />
            <Text style={styles.brandText}>AI Mechanic</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.formHeader}>
          <Text style={[styles.formTitle, { color: titleColor }]}>
            {isLogin ? 'Welcome back 👋' : isForgot ? 'Reset Password 🔑' : 'Create Account 🚀'}
          </Text>
          <Text style={[styles.formSub, { color: subColor }]}>
            {isLogin
              ? "Glad to see you again. Let's check your car."
              : isForgot
                ? "Enter your email and we'll send you a reset link."
                : 'Join 10,000+ drivers saving money on repairs.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={16} color="#10B981" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {isRegister && (
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: titleColor }]}>Full Name</Text>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}>
              <Feather name="user" size={18} color={subColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { color: titleColor }]}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={subColor}
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: titleColor }]}>Email Address</Text>
          <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}>
            <Feather name="mail" size={18} color={subColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.inputField, { color: titleColor }]}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={subColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {!isForgot && (
          <View style={styles.inputGroup}>
            <View style={styles.passwordRow}>
              <Text style={[styles.inputLabel, { color: titleColor }]}>Password</Text>
              {isLogin && (
                <TouchableOpacity onPress={() => setMode('forgot')}>
                  <Text style={styles.linkText}>Forgot?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor }]}>
              <Feather name="lock" size={18} color={subColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.inputField, { color: titleColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={subColor}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((s) => !s)}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={subColor} />
              </TouchableOpacity>
            </View>
            {isRegister && password.length > 0 && (
              <View style={styles.passHint}>
                <View
                  style={[
                    styles.passBar,
                    {
                      backgroundColor:
                        password.length < 6 ? '#EF4444' : password.length < 10 ? '#F59E0B' : '#10B981',
                      width: `${Math.min(100, password.length * 10)}%`,
                    },
                  ]}
                />
                <Text style={styles.passHintText}>
                  {password.length < 6 ? 'Too short' : password.length < 10 ? 'Okay strength' : 'Strong 🔒'}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          activeOpacity={0.9}
          disabled={loading}
          onPress={() => {
            if (loading) return;
            if (isLogin) void handleLogin();
            else if (isForgot) void handleForgot();
            else void handleRegister();
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>
                {isLogin ? 'Login' : isForgot ? 'Send Reset Link' : 'Create Account'}
              </Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        {!isForgot && (
          <>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              <Text style={[styles.dividerText, { color: subColor }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: isDark ? theme.surfaceAlt : '#FFFFFF', borderColor }]} activeOpacity={0.85}>
                <MaterialCommunityIcons name="google" size={22} color="#EA4335" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: isDark ? theme.surfaceAlt : '#FFFFFF', borderColor }]} activeOpacity={0.85}>
                <MaterialCommunityIcons name="apple" size={22} color={isDark ? '#FFFFFF' : '#0F1728'} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: isDark ? theme.surfaceAlt : '#FFFFFF', borderColor }]} activeOpacity={0.85}>
                <MaterialCommunityIcons name="facebook" size={22} color="#1877F2" />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.bottomLinkRow}>
          {isLogin ? (
            <>
              <Text style={[styles.bottomText, { color: subColor }]}>New to AI Mechanic? </Text>
              <TouchableOpacity onPress={() => { reset(); setMode('register'); }}>
                <Text style={styles.bottomLink}>Create account</Text>
              </TouchableOpacity>
            </>
          ) : isRegister ? (
            <>
              <Text style={[styles.bottomText, { color: subColor }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => { reset(); setMode('login'); }}>
                <Text style={styles.bottomLink}>Log in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.bottomText, { color: subColor }]}>Remember your password? </Text>
              <TouchableOpacity onPress={() => { reset(); setMode('login'); }}>
                <Text style={styles.bottomLink}>Log in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  /* ── WELCOME ── */
  welcomeRoot: { flex: 1, backgroundColor: '#0F1B3D' },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  blob1: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#2256D8', opacity: 0.4, top: -60, right: -80 },
  blob2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7C3AED', opacity: 0.25, bottom: 20, left: -60 },
  blob3: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#EC4899', opacity: 0.18, top: 120, left: 40 },
  logoFloat: { alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  logoGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#2256D8', opacity: 0.45, top: -15 },
  logoSquareLarge: {
    width: 104, height: 104, borderRadius: 28,
    backgroundColor: '#2256D8',
    alignItems: 'center', justifyContent: 'center',
    elevation: 14, shadowColor: '#2256D8', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
  },
  heroTitle: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', letterSpacing: -1, marginBottom: 14 },
  trustRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  trustPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  trustText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.78)', fontSize: 18, lineHeight: 26, textAlign: 'center', fontWeight: '500' },

  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34, borderTopRightRadius: 34,
    paddingHorizontal: 22, paddingTop: 26,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  featureCol: { flex: 1, alignItems: 'center', gap: 6 },
  featureIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { color: '#374151', fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  primaryBtn: {
    backgroundColor: '#2256D8', borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 6, shadowColor: '#2256D8', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  secondaryBtn: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryBtnText: { color: '#2256D8', fontSize: 14, fontWeight: '700' },
  termsText: { textAlign: 'center', color: '#9CA3AF', fontSize: 11, marginTop: 10 },
  termsLink: { color: '#2256D8', fontWeight: '700' },

  /* ── FORM ── */
  formScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backRound: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  brandPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0F4FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  brandText: { color: '#2256D8', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  formHeader: { marginBottom: 24 },
  formTitle: { color: '#0F1728', fontSize: 28, fontWeight: '900', letterSpacing: -0.4, marginBottom: 6 },
  formSub: { color: '#6B7280', fontSize: 14, lineHeight: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1, fontWeight: '600' },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  successText: { color: '#047857', fontSize: 13, flex: 1, fontWeight: '600' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, height: 54, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, fontSize: 15, color: '#0F1728', fontWeight: '500', padding: 0 },
  eyeBtn: { padding: 4, marginLeft: 6 },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { color: '#2256D8', fontSize: 13, fontWeight: '700' },
  passHint: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  passBar: { height: 4, borderRadius: 2, maxWidth: 140 },
  passHintText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  submitBtn: {
    backgroundColor: '#2256D8', borderRadius: 16, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 10,
    elevation: 4, shadowColor: '#2256D8', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  socialRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  socialBtn: {
    width: 60, height: 54, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },

  bottomLinkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  bottomText: { color: '#6B7280', fontSize: 14 },
  bottomLink: { color: '#2256D8', fontSize: 14, fontWeight: '800' },
});
