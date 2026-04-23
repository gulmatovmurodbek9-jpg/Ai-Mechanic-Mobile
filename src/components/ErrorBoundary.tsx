import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  children: React.ReactNode;
}

interface InnerProps extends Props {
  theme: any;
  isDark: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<InnerProps, State> {
  constructor(props: InnerProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production: send to Sentry/Bugsnag here
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { theme, isDark } = this.props;

    if (this.state.hasError) {
      return (
        <View style={[styles.root, { backgroundColor: theme.bg }]}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEE2E2' }]}>
            <Feather name="alert-triangle" size={44} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Something went wrong</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            Don't worry — your data is safe. Try reloading the app.
          </Text>
          {this.state.error?.message ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(254,242,242,0.05)' : '#FEF2F2', borderColor: isDark ? 'rgba(254,202,202,0.2)' : '#FECACA' }]}>
              <Text style={styles.errorTitle}>Error details</Text>
              <Text style={[styles.errorMessage, isDark && { color: '#FCA5A5' }]} numberOfLines={4}>
                {this.state.error.message}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={this.handleReset} activeOpacity={0.9}>
            <Feather name="refresh-cw" size={18} color="#FFFFFF" />
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  const { colors, mode } = useTheme();
  return <ErrorBoundaryInner {...props} theme={colors} isDark={mode === 'dark'} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 320,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    width: '100%',
    maxWidth: 360,
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2256D8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
