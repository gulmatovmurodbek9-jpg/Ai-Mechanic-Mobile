import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Alert } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { getPopularParts, listDiagnoses } from "../api/client";
import { tapLight, tapMedium } from "../utils/haptics";
import { useTheme } from "../theme/ThemeContext";
import { t } from "../i18n";
import {
  Diagnosis,
  Language,
  PartPrice,
  UserProfile,
  VehicleProfile,
} from "../types";
import { formatDate } from "../utils/format";

export function DashboardScreen({
  refreshToken,
  language,
  profile,
  vehicles,
  onNavigateToScan,
  onNavigateToPricing,
  onNavigateToObd,
  onNavigateToQuote,
}: {
  refreshToken: number;
  language: Language;
  profile: UserProfile;
  vehicles: VehicleProfile[];
  onNavigateToScan: () => void;
  onNavigateToPricing?: () => void;
  onNavigateToObd?: () => void;
  onNavigateToQuote?: () => void;
}) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const cardBorder = isDark ? { borderWidth: 1, borderColor: theme.border } : null;
  const titleColor = isDark ? theme.text : '#0F1728';
  const subColor = isDark ? theme.textMuted : '#6B7280';

  const [recentDiagnoses, setRecentDiagnoses] = useState<Diagnosis[]>([]);
  const [popularParts, setPopularParts] = useState<PartPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = async () => {
    try {
      const [parts, diagnoses] = await Promise.all([
        getPopularParts(),
        listDiagnoses(1, 5),
      ]);
      setPopularParts(parts);
      setRecentDiagnoses(diagnoses.data);
    } catch {
      // silent
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => { void load(); }, [refreshToken]);

  const firstName = profile.name?.split(" ")[0] ?? "there";

  const getSeverityColor = (s: string) => {
    const lower = s.toLowerCase();
    if (lower.includes("low") || lower.includes("fixed")) return "#22C55E";
    if (lower.includes("high") || lower.includes("critical")) return "#EF4444";
    return "#3B82F6";
  };

  const relativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor="#2256D8"
          colors={["#2256D8"]}
        />
      }
    >
      {/* ── App Header ── */}
      <View style={styles.topHeader}>
        <Text style={[styles.appName, isDark && { color: '#60A5FA' }]}>AI Mechanic</Text>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: isDark ? theme.border : '#F3F4F6' }]}
          onPress={() =>
            Alert.alert('Notifications', 'No new notifications.', [{ text: 'OK' }])
          }
        >
          <Feather name="bell" size={20} color={isDark ? theme.text : "#374151"} />
        </TouchableOpacity>
      </View>

      {/* ── Greeting ── */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingSub, { color: subColor }]}>Welcome back,</Text>
        <Text style={[styles.greetingName, { color: titleColor }]}>Hello, {firstName} 👋</Text>
      </View>

      {/* ── Car Health + Savings Row ── */}
      {(() => {
        const critCount = recentDiagnoses.filter(d => d.severity === 'CRITICAL' || d.severity === 'HIGH').length;
        const medCount = recentDiagnoses.filter(d => d.severity === 'MEDIUM').length;
        const healthScore = Math.max(40, Math.min(100, 100 - critCount * 15 - medCount * 6));
        const healthColor = healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444';
        const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : 'Needs Attention';

        // Saved: sum of (estimatedCostMax - (estimatedCostMax * 0.3)) for each diagnosis
        const savings = recentDiagnoses.reduce((sum, d) => {
          const maxCost = Number(d.estimatedCostMax) || 0;
          return sum + Math.round(maxCost * 0.3);
        }, 0);

        return (
          <View style={styles.kpiRow}>
            <View style={[styles.healthCard, { backgroundColor: cardBg }, cardBorder]}>
              <View style={styles.healthHeader}>
                <MaterialCommunityIcons name="heart-pulse" size={18} color={healthColor} />
                <Text style={styles.healthLabel}>CAR HEALTH</Text>
              </View>
              <Text style={[styles.healthScore, { color: healthColor }]}>{healthScore}%</Text>
              <View style={styles.healthBarTrack}>
                <View style={[styles.healthBarFill, { width: `${healthScore}%`, backgroundColor: healthColor }]} />
              </View>
              <Text style={styles.healthStatus}>{healthLabel}</Text>
            </View>

            <View style={[styles.savingsCard, isDark && { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.healthHeader}>
                <MaterialCommunityIcons name="piggy-bank" size={18} color="#10B981" />
                <Text style={styles.healthLabel}>SAVED</Text>
              </View>
              <Text style={styles.savingsAmount}>${savings || 0}</Text>
              <Text style={styles.savingsSub}>
                vs. mechanic quotes
              </Text>
              <View style={styles.savingsBadge}>
                <Feather name="trending-up" size={10} color="#FFFFFF" />
                <Text style={styles.savingsBadgeText}>+12% this month</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* ── Scan New Problem CTA ── */}
      <TouchableOpacity
        style={styles.scanCard}
        activeOpacity={0.88}
        onPress={() => { tapMedium(); onNavigateToScan(); }}
      >
        <View style={styles.scanIconWrap}>
          <Feather name="camera" size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.scanTitle}>Scan New Problem</Text>
        <Text style={styles.scanSub}>
          Point your camera at the engine for instant AI diagnosis.
        </Text>
      </TouchableOpacity>

      {/* ── Quick actions ── */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg }, cardBorder]} activeOpacity={0.85} onPress={onNavigateToScan}>
          <View style={[styles.quickIconWrap, isDark && { backgroundColor: '#1E3A8A' }]}>
            <Feather name="video" size={22} color={isDark ? "#60A5FA" : "#2256D8"} />
          </View>
          <Text style={[styles.quickTitle, { color: titleColor }]}>Upload Video</Text>
          <Text style={[styles.quickSub, { color: subColor }]}>Analyze existing footage</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg }, cardBorder]} activeOpacity={0.85} onPress={onNavigateToPricing}>
          <View style={[styles.quickIconWrap, isDark && { backgroundColor: '#1E3A8A' }]}>
            <Feather name="mic" size={22} color={isDark ? "#60A5FA" : "#2256D8"} />
          </View>
          <Text style={[styles.quickTitle, { color: titleColor }]}>Record Audio</Text>
          <Text style={[styles.quickSub, { color: subColor }]}>Diagnostic by engine sound</Text>
        </TouchableOpacity>
      </View>

      {/* ── Secondary quick row ── */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg }, cardBorder]} activeOpacity={0.85} onPress={() => { tapLight(); onNavigateToObd && onNavigateToObd(); }}>
          <View style={[styles.quickIconWrap, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
            <MaterialCommunityIcons name="car-cog" size={22} color={isDark ? "#34D399" : "#10B981"} />
          </View>
          <Text style={[styles.quickTitle, { color: titleColor }]}>OBD Scanner</Text>
          <Text style={[styles.quickSub, { color: subColor }]}>Read live engine codes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.quickCard, { backgroundColor: cardBg }, cardBorder]} activeOpacity={0.85} onPress={() => { tapLight(); onNavigateToPricing && onNavigateToPricing(); }}>
          <View style={[styles.quickIconWrap, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
            <MaterialCommunityIcons name="tag-outline" size={22} color={isDark ? "#FBBF24" : "#B45309"} />
          </View>
          <Text style={[styles.quickTitle, { color: titleColor }]}>Parts Pricing</Text>
          <Text style={[styles.quickSub, { color: subColor }]}>Market price compare</Text>
        </TouchableOpacity>
      </View>

      {/* ── Emergency + Voice AI ── */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: isDark ? '#450a0a' : '#FEF2F2', borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#FECACA' }]}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(
              '🆘 Emergency SOS',
              'Need urgent help on the road?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call Tow Service', onPress: () => Alert.alert('Connecting...', '24/7 roadside assistance will be available soon.') },
              ]
            )
          }
        >
          <View style={[styles.quickIconWrap, { backgroundColor: isDark ? '#7f1d1d' : '#FEE2E2' }]}>
            <MaterialCommunityIcons name="alert-octagon" size={22} color={isDark ? "#fca5a5" : "#EF4444"} />
          </View>
          <Text style={[styles.quickTitle, { color: isDark ? '#fca5a5' : '#B91C1C' }]}>Emergency SOS</Text>
          <Text style={[styles.quickSub, { color: isDark ? '#f87171' : subColor }]}>Tap for roadside help</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickCard, { backgroundColor: isDark ? '#2e1065' : '#F5F3FF', borderWidth: 1, borderColor: isDark ? '#4c1d95' : '#DDD6FE' }]}
          activeOpacity={0.85}
          onPress={() =>
            Alert.alert(
              '🎙️ Voice Assistant',
              "Tell me what's wrong with your car and I'll help diagnose it.",
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Try Now', onPress: onNavigateToScan },
              ]
            )
          }
        >
          <View style={[styles.quickIconWrap, { backgroundColor: isDark ? '#4c1d95' : '#EDE9FE' }]}>
            <MaterialCommunityIcons name="microphone" size={22} color={isDark ? "#c4b5fd" : "#7C3AED"} />
          </View>
          <Text style={[styles.quickTitle, { color: isDark ? '#c4b5fd' : '#5B21B6' }]}>Voice AI</Text>
          <Text style={[styles.quickSub, { color: isDark ? '#a78bfa' : subColor }]}>Speak your problem</Text>
        </TouchableOpacity>
      </View>

      {/* ── Maintenance Reminders ── */}
      {vehicles.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: titleColor }]}>Maintenance</Text>
          </View>
          <View style={[styles.maintenanceCard, { backgroundColor: cardBg }, cardBorder]}>
            <View style={[styles.maintIcon, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <MaterialCommunityIcons name="oil" size={22} color={isDark ? "#FBBF24" : "#D97706"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.maintTitle, { color: titleColor }]}>Oil Change</Text>
              <Text style={[styles.maintSub, { color: subColor }]}>Due in ~2,500 km</Text>
            </View>
            <View style={[styles.maintBadgeYellow, isDark && { backgroundColor: '#78350F' }]}>
              <Text style={[styles.maintBadgeText, isDark && { color: '#FBBF24' }]}>SOON</Text>
            </View>
          </View>
          <View style={[styles.maintenanceCard, { backgroundColor: cardBg }, cardBorder]}>
            <View style={[styles.maintIcon, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <MaterialCommunityIcons name="car-brake-alert" size={22} color={isDark ? "#34D399" : "#10B981"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.maintTitle, { color: titleColor }]}>Brake Inspection</Text>
              <Text style={[styles.maintSub, { color: subColor }]}>Last check 3 months ago</Text>
            </View>
            <View style={[styles.maintBadgeGreen, isDark && { backgroundColor: '#064E3B' }]}>
              <Text style={[styles.maintBadgeText, isDark && { color: '#34D399' }]}>OK</Text>
            </View>
          </View>
        </>
      )}

      {/* ── Recent Scans ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: titleColor }]}>Recent Scans</Text>
      </View>

      {initialLoading ? (
        <>
          {[1, 2, 3].map((k) => (
            <View key={k} style={[styles.scanItem, { backgroundColor: cardBg }, cardBorder]}>
              <View style={[styles.scanItemThumb, { backgroundColor: '#E5E7EB' }]} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, width: '55%' }} />
                <View style={{ height: 10, backgroundColor: '#F1F3F7', borderRadius: 5, width: '75%' }} />
              </View>
            </View>
          ))}
        </>
      ) : recentDiagnoses.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg }, cardBorder]}>
          <Feather name="inbox" size={28} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            No scans yet. Start your first diagnosis!
          </Text>
        </View>
      ) : (
        recentDiagnoses.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.scanItem, { backgroundColor: cardBg }, cardBorder]}
            activeOpacity={0.8}
          >
            <View style={styles.scanItemThumb}>
              <Feather name="box" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.scanItemInfo}>
              <Text style={[styles.scanItemTitle, { color: titleColor }]}>
                {item.carMake} {item.carModel}
              </Text>
              <View style={styles.scanItemMeta}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getSeverityColor(item.severity) + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getSeverityColor(item.severity) },
                    ]}
                  >
                    {item.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.scanDate}>
                  {relativeDate(item.createdAt)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))
      )}

      {/* ── Quick Tip ── */}
      {popularParts.length > 0 && (
        <View style={[styles.tipCard, { backgroundColor: cardBg }, cardBorder]}>
          <Text style={[styles.tipTitle, { color: titleColor }]}>💡 Quick Tip</Text>
          <Text style={[styles.tipBody, { color: subColor }]}>
            {`${popularParts[0]?.partName ?? "Brake repair"} averages `}
            <Text style={[styles.tipBold, { color: titleColor }]}>
              ${popularParts[0]?.price ?? "120"}
            </Text>
            {` in your area. Always compare before paying.`}
          </Text>
          <View style={styles.tipTags}>
            <View style={[styles.tipTag, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
              <Text style={[styles.tipTagText, { color: isDark ? '#E5E7EB' : '#374151' }]}>Great Deal</Text>
            </View>
            <View style={[styles.tipTag, styles.tipTagBlue, { backgroundColor: isDark ? '#1E3A8A' : '#EEF2FF' }]}>
              <Text style={[styles.tipTagText, { color: isDark ? '#93C5FD' : "#2256D8" }]}>
                AI Verified
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#F5F6FA",
    flex: 1,
  },
  content: {
    padding: 18,
    paddingTop: 8,
  },

  /* Top header */
  topHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 4,
  },
  appName: {
    color: "#2256D8",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  notifBtn: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  /* Greeting */
  greeting: {
    marginBottom: 18,
  },
  greetingSub: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  greetingName: {
    color: "#0F1728",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 2,
  },

  /* Scan CTA */
  scanCard: {
    backgroundColor: "#2256D8",
    borderRadius: 20,
    marginBottom: 14,
    padding: 20,
    shadowColor: "#2256D8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  scanIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    marginBottom: 12,
    width: 52,
  },
  scanTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  scanSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 21,
  },

  /* Quick rows */
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    elevation: 2,
    flex: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  quickIconWrap: {
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    marginBottom: 10,
    width: 46,
  },
  quickTitle: {
    color: "#0F1728",
    fontSize: 14,
    fontWeight: "800",
  },
  quickSub: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  /* Section header */
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#0F1728",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionAction: {
    color: "#2256D8",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Scan items */
  scanItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    elevation: 2,
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  scanItemThumb: {
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  scanItemInfo: {
    flex: 1,
    gap: 6,
  },
  scanItemTitle: {
    color: "#0F1728",
    fontSize: 15,
    fontWeight: "800",
  },
  scanItemMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  scanDate: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },

  /* Empty */
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 10,
    marginBottom: 10,
    padding: 28,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },

  /* KPI Row */
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  healthCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  savingsCard: {
    flex: 1,
    backgroundColor: "#0F1B3D",
    borderRadius: 18,
    padding: 14,
    elevation: 4,
    shadowColor: "#0F1B3D",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.8,
  },
  healthScore: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  healthBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 6,
  },
  healthBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  healthStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  savingsAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: "#10B981",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  savingsSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingsBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  /* Maintenance */
  maintenanceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  maintIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  maintTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F1728",
  },
  maintSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  maintBadgeYellow: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  maintBadgeGreen: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
  },
  maintBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#0F1728",
    letterSpacing: 0.6,
  },

  /* Tip */
  tipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    elevation: 2,
    marginTop: 14,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tipTitle: {
    color: "#0F1728",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  tipBody: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 22,
  },
  tipBold: {
    color: "#0F1728",
    fontWeight: "800",
  },
  tipTags: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  tipTag: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tipTagBlue: {
    backgroundColor: "#EEF2FF",
  },
  tipTagText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
});
