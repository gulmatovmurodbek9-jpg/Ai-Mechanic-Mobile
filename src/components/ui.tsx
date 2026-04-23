import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {children}
    </ScrollView>
  );
}

export function HeroCard({
  title,
  subtitle,
  badge,
  metrics,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  metrics?: Array<{ label: string; value: string }>;
}) {
  return (
    <LinearGradient colors={['#17345C', '#0F1B2D', '#0A1525']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />
      {badge ? <Text style={styles.heroBadge}>{badge}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
      {metrics?.length ? (
        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function Label({ children }: PropsWithChildren) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({ style, ...props }: ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.textDim}
      selectionColor={theme.colors.accent}
      style={[styles.input, style]}
      {...props}
    />
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const wrapperStyle =
    variant === 'secondary'
      ? styles.secondaryButton
      : variant === 'danger'
        ? styles.dangerButton
        : styles.primaryButton;

  const textStyle =
    variant === 'secondary'
      ? styles.secondaryButtonText
      : styles.primaryButtonText;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? theme.colors.text : '#06101D'} />
      ) : null}
      <Text style={[textStyle, loading && styles.loadingSpacing]}>{title}</Text>
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity disabled={disabled || loading} onPress={onPress} style={(disabled || loading) && styles.buttonDisabled}>
        <LinearGradient
          colors={['#62E3C8', '#3EC3BA', '#2E84C8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, wrapperStyle]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, wrapperStyle, (disabled || loading) && styles.buttonDisabled]}
    >
      {content}
    </TouchableOpacity>
  );
}

export function Message({
  tone,
  text,
}: {
  tone: 'error' | 'success' | 'info';
  text?: string;
}) {
  if (!text) return null;

  const toneStyle =
    tone === 'error' ? styles.errorBox : tone === 'success' ? styles.successBox : styles.infoBox;

  return (
    <View style={[styles.messageBox, toneStyle]}>
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  style,
  textStyle,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive, style]}>
      <Text style={[styles.pillText, active && styles.pillTextActive, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warm' | 'success';
}) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          tone === 'warm' && styles.statValueWarm,
          tone === 'success' && styles.statValueSuccess,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  hero: {
    borderColor: 'rgba(128, 209, 255, 0.15)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  heroGlowOne: {
    backgroundColor: 'rgba(103, 255, 221, 0.16)',
    borderRadius: 120,
    height: 140,
    position: 'absolute',
    right: -30,
    top: -24,
    width: 140,
  },
  heroGlowTwo: {
    backgroundColor: 'rgba(255, 155, 113, 0.14)',
    borderRadius: 90,
    bottom: -20,
    height: 110,
    left: -20,
    position: 'absolute',
    width: 110,
  },
  heroBadge: {
    color: '#8AF2D4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    maxWidth: '78%',
  },
  heroSubtitle: {
    color: '#C1D0E4',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: '88%',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionCopy: {
    flex: 1,
    gap: 6,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionAction: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingTop: 4,
    textTransform: 'uppercase',
  },
  label: {
    color: '#D2DDF0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.input,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  button: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButton: {},
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 106, 136, 0.14)',
    borderColor: 'rgba(255, 106, 136, 0.28)',
    borderWidth: 1,
  },
  primaryButtonText: {
    color: '#07111F',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loadingSpacing: {
    marginLeft: 4,
  },
  messageBox: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 106, 136, 0.12)',
  },
  successBox: {
    backgroundColor: 'rgba(95, 227, 161, 0.12)',
  },
  infoBox: {
    backgroundColor: 'rgba(95, 161, 227, 0.12)',
  },
  messageText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  pill: {
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: 'rgba(85, 214, 190, 0.14)',
    borderColor: 'rgba(85, 214, 190, 0.36)',
  },
  pillText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  pillTextActive: {
    color: '#9AF3DD',
  },
  stat: {
    backgroundColor: theme.colors.panelSoft,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statValueWarm: {
    color: theme.colors.gold,
  },
  statValueSuccess: {
    color: theme.colors.accent,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
