import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getPopularParts, searchPricing } from '../api/client';
import { Language, PartPrice, PricingResponse } from '../types';
import { formatMoney } from '../utils/format';
import { useTheme } from '../theme/ThemeContext';

export function PricingScreen({ language }: { language: Language }) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const titleColor = isDark ? theme.text : '#0F1728';
  const subColor = isDark ? theme.textMuted : '#9CA3AF';
  const borderColor = isDark ? theme.border : '#E5E7EB';

  const [part, setPart] = useState('Brake Pads');
  const [carMake, setCarMake] = useState('Toyota');
  const [carModel, setCarModel] = useState('Camry');
  const [result, setResult] = useState<PricingResponse | null>(null);
  const [popularParts, setPopularParts] = useState<PartPrice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getPopularParts();
        setPopularParts(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load price data');
      }
    };

    void load();
  }, []);

  const submit = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await searchPricing(part.trim(), carMake.trim(), carModel.trim());
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const list = result ? result.results : popularParts;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>Pricing</Text>
        <MaterialCommunityIcons name="tag-multiple" size={22} color="#2256D8" />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="currency-usd" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Fair Parts Pricing</Text>
            <Text style={styles.heroSub}>Compare prices before you pay the mechanic.</Text>
          </View>
        </View>

        {/* Search form */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={styles.label}>PART NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
            value={part}
            onChangeText={setPart}
            placeholder="e.g. Brake Pads"
            placeholderTextColor={subColor}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>MAKE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
                value={carMake}
                onChangeText={setCarMake}
                placeholder="Toyota"
                placeholderTextColor={subColor}
              />
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>MODEL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
                value={carModel}
                onChangeText={setCarModel}
                placeholder="Camry"
                placeholderTextColor={subColor}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading} activeOpacity={0.9}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="search" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>SEARCH MARKET</Text>
              </>
            )}
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        {result?.results.length ? (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(34,86,216,0.1)' : '#F0F4FF' }]}>
              <Text style={[styles.statLabel, { color: '#2256D8' }]}>AVERAGE</Text>
              <Text style={[styles.statValue, { color: titleColor }]}>{formatMoney(result.averagePrice)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }]}>
              <Text style={[styles.statLabel, { color: '#059669' }]}>MIN</Text>
              <Text style={[styles.statValue, { color: titleColor }]}>{formatMoney(result.priceRange.min)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FEF3C7' }]}>
              <Text style={[styles.statLabel, { color: '#B45309' }]}>MAX</Text>
              <Text style={[styles.statValue, { color: titleColor }]}>{formatMoney(result.priceRange.max)}</Text>
            </View>
          </View>
        ) : null}

        {/* Best deal */}
        {result?.cheapest ? (
          <View style={[styles.card, styles.dealCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <MaterialCommunityIcons name="fire" size={20} color="#10B981" />
              <Text style={[styles.dealTitle, { color: titleColor }]}>Cheapest Listing</Text>
            </View>
            <Text style={[styles.dealSource, { color: titleColor }]}>{result.cheapest.source}</Text>
            <Text style={styles.dealPrice}>{formatMoney(result.cheapest.price)}</Text>
            {result.cheapest.sourceUrl ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(result.cheapest!.sourceUrl!)}
                style={styles.dealLinkBtn}
              >
                <Feather name="external-link" size={14} color="#2256D8" />
                <Text style={styles.dealLinkText}>Open listing</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>
            {result ? 'Market Results' : 'Popular Parts'}
          </Text>
          <Text style={[styles.sectionCount, { color: subColor }]}>{list.length}</Text>
        </View>

        {list.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.resultCard, { backgroundColor: cardBg }]}
            activeOpacity={0.85}
            onPress={() => item.sourceUrl && Linking.openURL(item.sourceUrl)}
          >
            <View style={[styles.resultIcon, { backgroundColor: isDark ? 'rgba(34,86,216,0.1)' : '#F0F4FF' }]}>
              <MaterialCommunityIcons name="wrench" size={20} color="#2256D8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultTitle, { color: titleColor }]}>{item.partName}</Text>
              <Text style={[styles.resultMeta, { color: subColor }]}>
                {item.carMake} {item.carModel} · {item.source}
              </Text>
            </View>
            <Text style={styles.resultPrice}>{formatMoney(item.price)}</Text>
          </TouchableOpacity>
        ))}

        {list.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Feather name="inbox" size={28} color="#9CA3AF" />
            <Text style={[styles.emptyText, { color: subColor }]}>No parts data yet.</Text>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 14,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
    letterSpacing: -0.3,
  },
  content: { padding: 18, paddingTop: 8 },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2256D8',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18, marginTop: 2 },

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
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#0F1728',
    marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2256D8',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  errorText: { color: '#EF4444', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F1728',
  },

  dealCard: { borderWidth: 1, borderColor: '#10B981' },
  dealTitle: { fontSize: 14, fontWeight: '800', color: '#0F1728' },
  dealSource: { fontSize: 16, fontWeight: '800', color: '#0F1728', marginTop: 2 },
  dealPrice: { fontSize: 28, fontWeight: '900', color: '#10B981', marginTop: 4 },
  dealLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F0F4FF',
  },
  dealLinkText: { color: '#2256D8', fontSize: 13, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F1728' },
  sectionCount: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  resultIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: { fontSize: 15, fontWeight: '800', color: '#0F1728' },
  resultMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  resultPrice: { fontSize: 16, fontWeight: '900', color: '#2256D8' },

  emptyCard: {
    alignItems: 'center',
    padding: 28,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
});
