import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { createQuote, listDiagnoses } from '../api/client';
import { Diagnosis, Language, Quote } from '../types';
import { formatMoney } from '../utils/format';
import { useTheme } from '../theme/ThemeContext';

export function QuoteScreen({ language, onBack }: { language: Language; onBack?: () => void }) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const titleColor = isDark ? theme.text : '#0F1728';
  const subColor = isDark ? theme.textMuted : '#9CA3AF';
  const borderColor = isDark ? theme.border : '#E5E7EB';

  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [diagnosisId, setDiagnosisId] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [mechanicName, setMechanicName] = useState('');
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [result, setResult] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await listDiagnoses(1, 8);
        setDiagnoses(response.data);
        if (!diagnosisId && response.data[0]) {
          setDiagnosisId(response.data[0].id);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load diagnoses');
      }
    };

    void load();
  }, []);

  const submit = async () => {
    try {
      const amount = Number(quotedAmount);
      if (!diagnosisId.trim()) {
        setError('Please select a diagnosis first.');
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Please enter a valid quoted amount.');
        return;
      }
      setLoading(true);
      setError('');
      const response = await createQuote({
        diagnosisId: diagnosisId.trim(),
        quotedAmount: amount,
        mechanicName: mechanicName.trim() || undefined,
        mechanicNotes: mechanicNotes.trim() || undefined,
      });
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Quote validation failed');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (v: string) => {
    if (v === 'FAIR') return '#10B981';
    if (v === 'CHEAP') return '#2256D8';
    return '#EF4444'; // OVERPRICED
  };

  const getVerdictIcon = (v: string): any => {
    if (v === 'FAIR') return 'check-circle';
    if (v === 'CHEAP') return 'trending-down';
    return 'alert-triangle';
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: cardBg }]} onPress={onBack}>
            <Feather name="arrow-left" size={20} color="#2256D8" />
          </TouchableOpacity>
        ) : <View style={{ width: 40 }} />}
        <Text style={[styles.headerTitle, { color: titleColor }]}>Quote Check</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="scale-balance" size={28} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Is this a fair price?</Text>
            <Text style={styles.heroSub}>Paste the mechanic quote, get an AI verdict in seconds.</Text>
          </View>
        </View>

        {/* Choose diagnosis */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>Select Case</Text>
        </View>
        {diagnoses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Feather name="inbox" size={28} color="#9CA3AF" />
            <Text style={[styles.emptyText, { color: subColor }]}>No diagnoses yet. Create one first.</Text>
          </View>
        ) : (
          diagnoses.map((item) => {
            const selected = diagnosisId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.caseCard, 
                  { backgroundColor: cardBg, borderColor: isDark ? 'transparent' : '#FFFFFF' }, 
                  selected && [styles.caseCardActive, isDark && { backgroundColor: 'rgba(34,86,216,0.1)' }]
                ]}
                onPress={() => setDiagnosisId(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.caseRadio}>
                  {selected && <View style={styles.caseRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.caseTitle, { color: titleColor }]}>
                    {item.carMake} {item.carModel} {item.carYear}
                  </Text>
                  <Text style={[styles.caseMeta, { color: subColor }]} numberOfLines={1}>{item.problem}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Form */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: titleColor }]}>Quote Details</Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={styles.label}>QUOTED AMOUNT ($)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
            value={quotedAmount}
            onChangeText={setQuotedAmount}
            placeholder="450"
            placeholderTextColor={subColor}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>MECHANIC NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
            value={mechanicName}
            onChangeText={setMechanicName}
            placeholder="John's Auto Shop"
            placeholderTextColor={subColor}
          />

          <Text style={styles.label}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.multiLine, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB', borderColor, color: titleColor }]}
            value={mechanicNotes}
            onChangeText={setMechanicNotes}
            placeholder="Includes parts and labor..."
            placeholderTextColor={subColor}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="gavel" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>CHECK QUOTE</Text>
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

        {/* Result */}
        {result ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: titleColor }]}>AI Verdict</Text>
            </View>

            <View style={[styles.verdictCard, { backgroundColor: cardBg, borderColor: getVerdictColor(result.verdict) }]}>
              <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor(result.verdict) }]}>
                <Feather name={getVerdictIcon(result.verdict)} size={18} color="#FFFFFF" />
                <Text style={styles.verdictBadgeText}>{result.verdict}</Text>
              </View>
              <Text style={[styles.verdictExplain, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                {result.explanation || 'No explanation provided.'}
              </Text>

              <View style={styles.verdictMetricsRow}>
                <View style={[styles.verdictMetric, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB' }]}>
                  <Text style={styles.verdictMetricLabel}>QUOTED</Text>
                  <Text style={[styles.verdictMetricValue, { color: titleColor }]}>{formatMoney(result.quotedAmount)}</Text>
                </View>
                {result.recommendedRange ? (
                  <View style={[styles.verdictMetric, { backgroundColor: isDark ? theme.surfaceAlt : '#F9FAFB' }]}>
                    <Text style={styles.verdictMetricLabel}>FAIR RANGE</Text>
                    <Text style={[styles.verdictMetricValue, { color: titleColor }]}>
                      {formatMoney(result.recommendedRange.min)}–{formatMoney(result.recommendedRange.max)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {result.savingsPotential ? (
                <View style={[styles.savingsBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }]}>
                  <MaterialCommunityIcons name="piggy-bank" size={18} color="#10B981" />
                  <Text style={[styles.savingsText, isDark && { color: '#34D399' }]}>
                    Potential savings: <Text style={{ fontWeight: '900' }}>{formatMoney(result.savingsPotential)}</Text>
                  </Text>
                </View>
              ) : null}
            </View>

            {result.negotiationTips?.length ? (
              <View style={[styles.tipsCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.05)' : '#FFFBEB', borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <MaterialCommunityIcons name="lightbulb-on" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
                  <Text style={[styles.tipsTitle, { color: titleColor }]}>Negotiation Tips</Text>
                </View>
                {result.negotiationTips.map((tip, idx) => (
                  <View key={idx} style={styles.tipItem}>
                    <Text style={[styles.tipNum, isDark && { backgroundColor: '#F59E0B' }]}>{idx + 1}</Text>
                    <Text style={[styles.tipText, { color: isDark ? '#D1D5DB' : '#374151' }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0F1728' },
  content: { padding: 18, paddingTop: 8 },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#2256D8',
    borderRadius: 22,
    padding: 18,
    marginBottom: 4,
    elevation: 6,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroIcon: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18, marginTop: 2 },

  sectionHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F1728' },

  emptyCard: {
    alignItems: 'center', padding: 28, gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16,
  },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },

  caseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  caseCardActive: { borderColor: '#2256D8', backgroundColor: '#F0F4FF' },
  caseRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#2256D8',
    alignItems: 'center', justifyContent: 'center',
  },
  caseRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2256D8' },
  caseTitle: { fontSize: 15, fontWeight: '800', color: '#0F1728' },
  caseMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  label: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, height: 48,
    fontSize: 15, color: '#0F1728', marginBottom: 14,
  },
  multiLine: { minHeight: 90, height: undefined, textAlignVertical: 'top', paddingTop: 12 },
  primaryBtn: {
    flexDirection: 'row', backgroundColor: '#2256D8',
    borderRadius: 14, height: 50,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },

  verdictCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    borderWidth: 2, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  verdictBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, marginBottom: 12,
  },
  verdictBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  verdictExplain: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 14 },
  verdictMetricsRow: { flexDirection: 'row', gap: 10 },
  verdictMetric: {
    flex: 1, backgroundColor: '#F9FAFB',
    borderRadius: 12, padding: 12,
  },
  verdictMetricLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5 },
  verdictMetricValue: { fontSize: 16, fontWeight: '900', color: '#0F1728', marginTop: 4 },

  savingsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 12,
  },
  savingsText: { fontSize: 13, color: '#047857', flex: 1 },

  tipsCard: {
    backgroundColor: '#FFFBEB', borderRadius: 18, padding: 16,
    marginTop: 14, borderWidth: 1, borderColor: '#FEF3C7',
  },
  tipsTitle: { fontSize: 15, fontWeight: '800', color: '#0F1728' },
  tipItem: { flexDirection: 'row', gap: 10, marginTop: 8 },
  tipNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#B45309', color: '#FFFFFF',
    fontSize: 11, fontWeight: '900', textAlign: 'center',
    lineHeight: 20,
  },
  tipText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 19 },
});
