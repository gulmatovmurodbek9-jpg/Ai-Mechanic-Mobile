import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Your AI Mechanic\nin your pocket.',
    subtitle: 'Identify car issues instantly using your camera, audio, or video.',
    image: require('../../assets/onboarding_car.png'),
    heroBg: '#0D1B3E',
    badge1: { label: 'ENGINE HEALTH', value: '98% Nominal', iconName: 'bar-chart-2' as const },
    badge2: { label: 'DIAGNOSTICS', value: 'Scanning Audio...', iconName: 'settings' as const },
    features: [
      { iconName: 'camera' as const, label: 'Visual' },
      { iconName: 'mic' as const, label: 'Acoustic' },
      { iconName: 'video' as const, label: 'Live Tech' },
    ],
    accentColor: '#2256D8',
    buttonLabel: 'Get Started  →',
  },
  {
    id: 2,
    title: 'Never overpay\nagain.',
    subtitle: 'Compare mechanic quotes with real‑market prices for parts and labor.',
    image: require('../../assets/onboarding_engine.png'),
    heroBg: '#111827',
    badge1: { label: 'Labor Estimate', value: '1.5 hrs', iconName: 'clock' as const },
    badge2: { label: 'Parts Cost', value: '$84.00', iconName: 'tag' as const },
    features: [],
    accentColor: '#2256D8',
    buttonLabel: 'Next',
  },
  {
    id: 3,
    title: 'Expert help,\nsimplified.',
    subtitle: 'Non-technical explanations for complex car problems.',
    image: require('../../assets/onboarding_person.png'),
    heroBg: '#D8F3EE',
    badge1: { label: 'System Ready', value: 'All diagnostics clear', iconName: 'check-circle' as const },
    badge2: null,
    features: [
      { iconName: 'message-circle' as const, label: 'No Jargon\nSimple language only.' },
      { iconName: 'cpu' as const, label: 'AI Precision\nVerified repair paths.' },
    ],
    accentColor: '#2256D8',
    buttonLabel: 'Start Scanning  →',
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const animateTransition = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIndex);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (isLast) {
      onDone();
    } else {
      animateTransition(index + 1);
    }
  };

  const goBack = () => {
    if (index > 0) animateTransition(index - 1);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {index > 0 ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Text style={[styles.brand, { color: theme.primary }]}>AI Mechanic</Text>
        </View>
        <TouchableOpacity onPress={onDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.skip, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.slideWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* ── Hero ── */}
        <View style={[styles.heroCard, { backgroundColor: slide.heroBg }]}>
          <Image
            source={slide.image}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* overlay gradient for dark slides */}
          {slide.id !== 3 && <View style={styles.heroOverlay} />}

          {/* Badge 1 */}
          <View style={[styles.badge, styles.badgeTopLeft, { backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.97)' }]}>
            <Feather name={slide.badge1.iconName as any} size={20} color={theme.primary} />
            <View>
              <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>{slide.badge1.label}</Text>
              <Text style={[styles.badgeValue, { color: theme.text }]}>{slide.badge1.value}</Text>
            </View>
          </View>

          {/* Badge 2 */}
          {slide.badge2 ? (
            <View style={[styles.badge, styles.badgeBottomRight, { backgroundColor: isDark ? theme.surface : 'rgba(255,255,255,0.97)' }]}>
              <Feather name={slide.badge2.iconName as any} size={20} color={theme.primary} />
              <View>
                <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>{slide.badge2.label}</Text>
                <Text style={[styles.badgeValue, { color: theme.text }]}>{slide.badge2.value}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Text ── */}
        <Text style={[styles.title, { color: theme.text }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{slide.subtitle}</Text>

        {/* ── Feature chips ── */}
        {slide.features.length > 0 ? (
          <View style={styles.features}>
            {slide.features.map((f) => (
              <View key={f.label} style={[styles.featureChip, { backgroundColor: isDark ? theme.surface : '#F3F4F6' }]}>
                <View style={[styles.featureIconWrap, isDark && { backgroundColor: theme.surfaceAlt }]}>
                  <Feather name={f.iconName as any} size={22} color={theme.primary} />
                </View>
                <Text style={[styles.featureLabel, { color: isDark ? '#D1D5DB' : '#374151' }]}>{f.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      {/* ── Bottom area ── */}
      <View style={styles.bottom}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => animateTransition(i)}>
              <View style={[styles.dot, { backgroundColor: isDark ? theme.border : '#E5E7EB' }, i === index && [styles.dotActive, { backgroundColor: theme.primary }]]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={goNext} activeOpacity={0.88}>
          <Text style={styles.buttonText}>{slide.buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },

  /* Header */
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backBtn: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  backArrow: {
    color: '#2256D8',
    fontSize: 22,
    fontWeight: '700',
  },
  brand: {
    color: '#2256D8',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  skip: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },

  /* Slide */
  slideWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },

  /* Hero */
  heroCard: {
    borderRadius: 24,
    height: height * 0.32,
    marginBottom: 28,
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 15, 40, 0.25)',
  },

  /* Badges */
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 14,
    elevation: 10,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  badgeTopLeft: {
    left: 14,
    top: 18,
  },
  badgeBottomRight: {
    bottom: 18,
    right: 14,
  },
  badgeIcon: {
    fontSize: 18,
  },
  featureIconWrap: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  badgeLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },

  /* Text */
  title: {
    color: '#0F1728',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },

  /* Features */
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 22,
  },
  featureChip: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    gap: 6,
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  featureIcon: {
    fontSize: 26,
  },
  featureChipRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  featureLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },

  /* Bottom */
  bottom: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
  },
  dot: {
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: '#2256D8',
    borderRadius: 5,
    width: 26,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1953C8',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 58,
    shadowColor: '#1953C8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
