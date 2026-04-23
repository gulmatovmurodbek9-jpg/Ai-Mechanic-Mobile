import React, { useEffect, useState } from 'react';
import { Alert, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView, Image } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { listDiagnoses, deleteDiagnosis } from '../api/client';
import { t } from '../i18n';
import { useTheme } from '../theme/ThemeContext';
import { Diagnosis, Language } from '../types';

export function HistoryScreen({
  refreshToken,
  language,
  onViewReport,
}: {
  refreshToken: number;
  language: Language;
  onViewReport: (diagnosis: Diagnosis) => void;
}) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const cardBg = isDark ? theme.surface : '#FFFFFF';
  const cardBorder = isDark ? { borderWidth: 1, borderColor: theme.border } : null;
  const titleColor = isDark ? theme.text : '#0F1728';

  const [items, setItems] = useState<Diagnosis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Repaired'>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const response = await listDiagnoses(1, 50);
      setItems(response.data);
    } catch (e) {
      console.log('History load error', e);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t(language, 'deleteConfirmTitle') || 'Delete Diagnosis',
      t(language, 'deleteConfirmBody') || 'Are you sure you want to delete this diagnosis?',
      [
        { text: t(language, 'cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t(language, 'confirmDelete') || 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiagnosis(id);
              await load();
            } catch (e) {
              console.log('Delete error', e);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    void load();
  }, [refreshToken]);

  const filteredItems = items.filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${item.carMake} ${item.carModel} ${item.problem}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    // Mock tab filtering
    if (activeTab === 'Pending' && item.severity === 'LOW') return false;
    if (activeTab === 'Repaired' && item.severity !== 'LOW') return false;
    return true;
  });

  const getPillProps = (severity: string) => {
    switch(severity) {
      case 'CRITICAL':
      case 'HIGH':
        return { label: 'Attention', bg: '#FEE2E2', text: '#EF4444' };
      case 'MEDIUM':
        return { label: 'Pending', bg: '#FEF3C7', text: '#F59E0B' };
      default:
        return { label: 'Fair', bg: '#D1FAE5', text: '#10B981' };
    }
  };

  const getIconProps = (fileType: string) => {
    if (fileType === 'audio') return { name: 'volume-2', color: '#8B5CF6', bg: '#EDE9FE' };
    if (fileType === 'video') return { name: 'video', color: '#10B981', bg: '#D1FAE5' };
    return { name: 'tool', color: '#3B82F6', bg: '#DBEAFE' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: isDark ? theme.border : '#E5E7EB' }]}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>History</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => Alert.alert('Options', 'More options coming soon.', [{ text: 'OK' }])}
        >
          <Feather name="more-horizontal" size={20} color="#2256D8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <Text style={styles.pageTitle}>Diagnosis History</Text>
        <Text style={styles.pageSub}>Track all your past vehicle check-ups</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#F0F4FF' }]}>
            <MaterialCommunityIcons name="file-document-multiple" size={18} color="#2256D8" />
            <Text style={styles.statNum}>{items.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#B45309" />
            <Text style={styles.statNum}>{items.filter((i) => i.severity !== 'LOW').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
            <Text style={styles.statNum}>{items.filter((i) => i.severity === 'LOW').length}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by vehicle or problem..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['All', 'Pending', 'Repaired'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive ? styles.tabBtnActive : styles.tabBtnInactive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>{tab}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Cards */}
        {filteredItems.map(item => {
          const pill = getPillProps(item.severity);
          const iconObj = getIconProps(item.fileType);
          const exactDate = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
          
          return (
            <View key={item.id} style={[styles.card, { backgroundColor: cardBg }, cardBorder]}>
              <View style={styles.cardTopRow}>
                <Text style={styles.dateText}>{exactDate}</Text>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
                </View>
              </View>

              <Text style={styles.vehicleTitle}>{item.carYear} {item.carMake} {item.carModel}</Text>

              <View style={styles.problemBox}>
                <View style={[styles.problemIconWrap, { backgroundColor: iconObj.bg }]}>
                  <Feather name={iconObj.name as any} size={18} color={iconObj.color} />
                </View>
                <View style={styles.problemTextColumn}>
                  <Text style={styles.problemTitle} numberOfLines={1}>{item.problem}</Text>
                  <Text style={styles.problemDesc} numberOfLines={2}>AI suggested: {item.diagnosis}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {item.fileUrl && !item.fileUrl.startsWith('local') ? (
                  <Image source={{ uri: item.fileUrl }} style={styles.avatarMini} />
                ) : (
                  <Text style={styles.serviceId}>Service ID: #{item.id.slice(0, 5)}</Text>
                )}
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => handleDelete(item.id)}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.viewReportBtn} onPress={() => onViewReport(item)}>
                    <Text style={styles.viewReportText}>View Report</Text>
                    <Feather name="chevron-right" size={16} color="#2256D8" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {filteredItems.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons name="file-search-outline" size={48} color="#2256D8" />
            </View>
            <Text style={styles.emptyTitle}>No diagnoses yet</Text>
            <Text style={styles.emptySub}>
              Start your first vehicle check and your history will appear here.
            </Text>
          </View>
        )}
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 14,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F1728',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSub: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F1728',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F1728',
    marginBottom: 6,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#0F172A',
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  tabBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },
  vehicleTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 16,
  },
  problemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  problemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  problemTextColumn: {
    flex: 1,
  },
  problemTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  problemDesc: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceId: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#9CA3AF',
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  viewReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewReportText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#2256D8',
    marginRight: 4,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
