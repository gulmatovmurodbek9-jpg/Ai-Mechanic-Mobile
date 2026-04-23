import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Diagnosis } from '../types';
import { useTheme } from '../theme/ThemeContext';

const openMap = (query: string) => {
  const url = Platform.select({
    ios: `maps://0,0?q=${encodeURIComponent(query)}`,
    android: `geo:0,0?q=${encodeURIComponent(query)}`,
  }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)
  );
};

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
};

const callPhone = (phone: string) => {
  const clean = phone.replace(/[^+\d]/g, '');
  Alert.alert('Call mechanic', `Call ${phone}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call', onPress: () => Linking.openURL(`tel:${clean}`) },
  ]);
};

const searchPartShop = (store: string, part?: string) => {
  const q = encodeURIComponent(`${store} ${part || 'auto parts'}`);
  Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
};

interface AgentChatScreenProps {
  diagnosis: Diagnosis;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  agentName?: string;
  icon?: keyof typeof Feather.glyphMap;
  isTyping?: boolean;
  content?: React.ReactNode;
}

const { width } = Dimensions.get('window');

export function AgentChatScreen({ diagnosis, onBack }: AgentChatScreenProps) {
  const { colors: theme, mode: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const surfaceBg = isDark ? theme.surface : '#FFFFFF';
  const borderColor = isDark ? theme.border : '#E2E8F0';
  const titleColor = isDark ? theme.text : '#1E293B';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const suggestedQuestions = [
    'How urgent is this?',
    'Can I drive safely?',
    'DIY or mechanic?',
  ];

  const sendUserQuestion = async (question: string) => {
    if (!question.trim() || chatLoading) return;
    const q = question.trim();
    setChatInput('');
    setMessages(prev => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        sender: 'user',
        content: <Text style={styles.userMsgText}>{q}</Text>,
      },
    ]);
    setChatLoading(true);
    // Simulated AI reply (offline-safe)
    setTimeout(() => {
      const replies: Record<string, string> = {
        'how urgent': `Based on ${diagnosis.severity} severity, I recommend addressing this ${diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH' ? 'within 1-2 days' : diagnosis.severity === 'MEDIUM' ? 'within 1-2 weeks' : 'at your next service'}.`,
        'can i drive': diagnosis.severity === 'CRITICAL' ? '⚠️ Not recommended. Get towed to a mechanic.' : diagnosis.severity === 'HIGH' ? 'Short trips only. Avoid highways.' : 'Yes, but monitor symptoms closely.',
        'diy or': diagnosis.severity === 'LOW' ? 'This is DIY-friendly with basic tools. Videos above can help!' : 'We recommend a professional for this one.',
      };
      const key = Object.keys(replies).find(k => q.toLowerCase().includes(k));
      const answer = key ? replies[key] : `Great question! For "${q}" — based on your diagnosis, I'd suggest consulting the recommended mechanics above or visiting a shop for a physical inspection.`;
      setMessages(prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'agent',
          agentName: 'AI Assistant',
          icon: 'message-circle',
          content: <Text style={styles.agentTextBody}>{answer}</Text>,
        },
      ]);
      setChatLoading(false);
    }, 1200);
  };

  useEffect(() => {
    // 1. Initial User Message
    const imgSource = diagnosis.localUri || (diagnosis.fileUrl?.startsWith('local') ? null : diagnosis.fileUrl);

    const userMsg: ChatMessage = {
      id: 'user_1',
      sender: 'user',
      content: (
        <View style={styles.userMsgWrap}>
          {imgSource && (
            <Image source={{ uri: imgSource }} style={styles.userMsgImage} />
          )}
          <Text style={styles.userMsgText}>
            {diagnosis.problem ? `Please help diagnose: ${diagnosis.problem}` : "Analyze my submission please."}
          </Text>
        </View>
      ),
    };

    setMessages([userMsg]);

    // 2. Primary Diagnostic Agent (Agent 2)
    setTimeout(() => pushTyping('Agent 2 (Diagnostic Expert)', 'cpu'), 500);
    setTimeout(() => {
      replaceTyping({
        id: 'agent_primary',
        sender: 'agent',
        agentName: 'Agent 2 (Diagnostic Expert)',
        icon: 'cpu',
        content: (
          <View>
            <Text style={styles.agentTextTitle}>{diagnosis.problem}</Text>
            <Text style={styles.agentTextBody}>{diagnosis.diagnosis}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor:
                    diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH'
                      ? '#FEE2E2'
                      : diagnosis.severity === 'MEDIUM'
                        ? '#FEF3C7'
                        : '#ECFDF5',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Feather
                  name={
                    diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH'
                      ? 'alert-triangle'
                      : 'info'
                  }
                  size={12}
                  color={
                    diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH'
                      ? '#B91C1C'
                      : diagnosis.severity === 'MEDIUM'
                        ? '#B45309'
                        : '#047857'
                  }
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '900',
                    letterSpacing: 0.4,
                    color:
                      diagnosis.severity === 'CRITICAL' || diagnosis.severity === 'HIGH'
                        ? '#B91C1C'
                        : diagnosis.severity === 'MEDIUM'
                          ? '#B45309'
                          : '#047857',
                  }}
                >
                  {diagnosis.severity}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: '#F0F4FF',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                }}
              >
                <Feather name="target" size={12} color="#2256D8" />
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#2256D8', letterSpacing: 0.3 }}>
                  {`${85 + (diagnosis.id?.charCodeAt(0) % 12 || 0)}% CONFIDENCE`}
                </Text>
              </View>
            </View>
          </View>
        ),
      });
    }, 2000);

    // 3. Location Agent (Agent 1)
    setTimeout(() => pushTyping('Agent 1 (Local Scout)', 'map-pin'), 3000);
    setTimeout(() => {
      const shops = diagnosis.agentData?.shops || [];
      replaceTyping({
        id: 'agent_loc',
        sender: 'agent',
        agentName: 'Agent 1 (Local Scout)',
        icon: 'map-pin',
        content: (
          <View>
            <Text style={styles.agentTextBody}>I found some repair shops near you:</Text>
            {shops.length > 0 ? shops.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cardItem}
                activeOpacity={0.75}
                onPress={() => openMap(`${s.name || 'Auto Shop'} ${s.address || ''}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.name || 'Local Shop'}</Text>
                  <Text style={styles.cardSub}>{s.address} ({s.distance})</Text>
                </View>
                <View style={styles.cardAction}>
                  <Feather name="navigation" size={14} color="#2256D8" />
                  <Text style={styles.cardActionText}>Open Map</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.cardSub}>No specific shops found in your exact location, but any standard mechanic can handle this.</Text>}
          </View>
        ),
      });
    }, 4500);

    // 4. Resource Agent (Agent 3)
    setTimeout(() => pushTyping('Agent 3 (Researcher)', 'youtube'), 5500);
    setTimeout(() => {
      const vids = diagnosis.agentData?.videos || [];
      replaceTyping({
        id: 'agent_res',
        sender: 'agent',
        agentName: 'Agent 3 (Researcher)',
        icon: 'youtube',
        content: (
          <View>
            <Text style={styles.agentTextBody}>Here are some tutorials if you want to fix it yourself:</Text>
            {vids.length > 0 ? vids.map((v, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cardItem}
                activeOpacity={0.75}
                onPress={() => openUrl(v.url)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{v.title}</Text>
                  <Text style={styles.linkText} numberOfLines={1}>{v.url}</Text>
                </View>
                <View style={[styles.cardAction, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="play" size={14} color="#DC2626" />
                  <Text style={[styles.cardActionText, { color: '#DC2626' }]}>Watch</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.cardSub}>No specific videos found.</Text>}
          </View>
        ),
      });
    }, 7000);

    // 5. Parts Agent (Agent 4)
    setTimeout(() => pushTyping('Agent 4 (Parts Shopper)', 'shopping-cart'), 8000);
    setTimeout(() => {
      const parts = diagnosis.agentData?.partsStores || [];
      replaceTyping({
        id: 'agent_parts',
        sender: 'agent',
        agentName: 'Agent 4 (Parts Shopper)',
        icon: 'shopping-cart',
        content: (
          <View>
            <Text style={styles.agentTextBody}>Estimated parts you'll need ({diagnosis.partsNeeded?.join(', ') || 'Various'}):</Text>
            {parts.length > 0 ? parts.map((p, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cardItemRow}
                activeOpacity={0.75}
                onPress={() => p.link ? openUrl(p.link) : searchPartShop(p.store, diagnosis.partsNeeded?.[0])}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{p.store}</Text>
                  <Text style={styles.cardSub}>Tap to view listings</Text>
                </View>
                <Text style={styles.priceTag}>${p.price}</Text>
                <Feather name="chevron-right" size={16} color="#9CA3AF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )) : <Text style={styles.cardSub}>Check AutoZone or O'Reilly for parts.</Text>}
          </View>
        ),
      });
    }, 9500);

    // 6. Mechanics & Pricing (Agents 5 & 6)
    setTimeout(() => pushTyping('Agent 5 & 6 (Mechanic & Pricing)', 'dollar-sign'), 10500);
    setTimeout(() => {
      const mechs = diagnosis.agentData?.mechanics || [];
      const prc = diagnosis.agentData?.pricing;
      replaceTyping({
        id: 'agent_mech',
        sender: 'agent',
        agentName: 'AI Mechanic Team Final Report',
        icon: 'check-circle',
        content: (
          <View>
            <Text style={styles.agentTextTitle}>Market Pricing Analysis</Text>
            <Text style={styles.agentTextBody}>{prc?.summary || `Expect around $${diagnosis.estimatedCostMin} to $${diagnosis.estimatedCostMax}`}</Text>
            <Text style={[styles.agentTextBody, { marginTop: 8 }]}>{prc?.comparison || ""}</Text>
            
            <Text style={[styles.agentTextTitle, { marginTop: 16 }]}>Recommended Local Mechanics</Text>
            {mechs.length > 0 ? mechs.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={styles.cardItem}
                activeOpacity={0.75}
                onPress={() => callPhone(m.phone)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{m.name}</Text>
                  <Text style={styles.cardSub}>{m.phone} — {m.specialty}</Text>
                </View>
                <View style={[styles.cardAction, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="phone" size={14} color="#10B981" />
                  <Text style={[styles.cardActionText, { color: '#10B981' }]}>Call</Text>
                </View>
              </TouchableOpacity>
            )) : <Text style={styles.cardSub}>Try calling a mobile mechanic near you for quotes.</Text>}
          </View>
        ),
      });
    }, 12500);

  }, [diagnosis]);

  const pushTyping = (agentName: string, icon: keyof typeof Feather.glyphMap) => {
    setMessages(prev => [
      ...prev,
      { id: 'typing', sender: 'agent', agentName, icon, isTyping: true },
    ]);
  };

  const replaceTyping = (msg: ChatMessage) => {
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'typing');
      return [...filtered, msg];
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: titleColor }]}>AI Mechanic Team</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>6 Agents Active</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={async () => {
            try {
              await Share.share({
                title: `AI Mechanic Diagnosis — ${diagnosis.carMake} ${diagnosis.carModel}`,
                message:
                  `🚗 ${diagnosis.carYear} ${diagnosis.carMake} ${diagnosis.carModel}\n` +
                  `\nProblem: ${diagnosis.problem}\n` +
                  `Diagnosis: ${diagnosis.diagnosis}\n` +
                  `Severity: ${diagnosis.severity}\n` +
                  (diagnosis.estimatedCostMax
                    ? `Estimated cost: $${diagnosis.estimatedCostMin || 0} - $${diagnosis.estimatedCostMax}\n`
                    : '') +
                  `\nShared via AI Mechanic 🔧`,
              });
            } catch (e) {
              // user cancelled
            }
          }}
        >
          <Feather name="share-2" size={22} color="#2256D8" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <ScrollView 
        ref={scrollRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Text style={styles.dateLabel}>Subject: {diagnosis.carYear} {diagnosis.carMake} {diagnosis.carModel}</Text>
        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.messageWrapper, msg.sender === 'user' ? styles.wrapperRight : styles.wrapperLeft]}>
            
            {msg.sender === 'agent' && (
              <LinearGradient colors={['#3B82F6', '#2256D8']} style={styles.avatar}>
                <Feather name={msg.icon || 'cpu'} size={16} color="#FFFFFF" />
              </LinearGradient>
            )}

            <View style={[styles.messageBubble, msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAgent]}>
              {msg.agentName && msg.sender === 'agent' && (
                <Text style={styles.agentNameLabel}>{msg.agentName}</Text>
              )}
              
              {msg.isTyping ? (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color="#2256D8" />
                  <Text style={styles.typingText}>Agent is typing...</Text>
                </View>
              ) : (
                msg.content
              )}
            </View>

          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Chat Input Bar */}
      <View>
        <View style={[styles.suggestionsRow, { backgroundColor: surfaceBg, borderTopColor: borderColor }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {suggestedQuestions.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.suggestionChip}
                onPress={() => sendUserQuestion(q)}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={11} color="#2256D8" />
                <Text style={styles.suggestionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.chatInputBar, { backgroundColor: surfaceBg, borderTopColor: borderColor }]}>
          <View style={styles.chatInputWrap}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask a follow-up question..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!chatInput.trim() || chatLoading) && { opacity: 0.5 }]}
            onPress={() => sendUserQuestion(chatInput)}
            disabled={!chatInput.trim() || chatLoading}
            activeOpacity={0.85}
          >
            {chatLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#059669',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  wrapperLeft: {
    justifyContent: 'flex-start',
  },
  wrapperRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#2256D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  messageBubble: {
    maxWidth: width * 0.76,
    padding: 16,
    borderRadius: 22,
  },
  bubbleUser: {
    backgroundColor: '#2256D8',
    borderBottomRightRadius: 4,
    shadowColor: '#2256D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleAgent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  agentNameLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#2256D8',
    marginLeft: 8,
  },
  userMsgWrap: {},
  userMsgImage: {
    width: width * 0.65,
    height: width * 0.5,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  userMsgText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  dateLabel: {
    alignSelf: 'center',
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  agentTextTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 6,
  },
  agentTextBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#9CA3AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestionsRow: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F7',
    paddingVertical: 10,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  suggestionText: {
    color: '#2256D8',
    fontSize: 12,
    fontWeight: '700',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F7',
  },
  chatInputWrap: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  chatInput: {
    fontSize: 14,
    color: '#0F1728',
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2256D8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#2256D8',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2256D8',
    letterSpacing: 0.3,
  },
  cardItemRow: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#9CA3AF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  cardSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  linkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#2256D8',
    marginTop: 4,
  },
  priceTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#10B981',
  },
});
