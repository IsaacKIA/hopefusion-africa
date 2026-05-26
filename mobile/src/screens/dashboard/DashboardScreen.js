import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Dimensions, Animated
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLORS = { green:'#2DB562', gold:'#E8A020', red:'#E02020', black:'#1A1A1A', white:'#fff', bg:'#F4F5F7', text:'#3D3D3D', txt2:'#6b6b6b', border:'#e4e4e4' };

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ['me'],
    queryFn:  () => api.get('/users/me'),
  });

  const { data: matches } = useQuery({
    queryKey: ['my-matches'],
    queryFn:  () => api.get('/matches/my?limit=5&min_score=80'),
    enabled:  !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications'),
    refetchInterval: 30000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchProfile();
    setRefreshing(false);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const unreadCount = notifications?.filter(n => !n.is_read)?.length || 0;

  const stats = [
    { label: 'AI Matches',  value: matches?.count || '—', icon: 'flash',          color: COLORS.green },
    { label: 'Applications',value: '3',                   icon: 'document-text',  color: COLORS.gold  },
    { label: 'Messages',    value: unreadCount || '0',    icon: 'chatbubbles',    color: COLORS.red   },
    { label: 'XP Points',   value: '2,840',               icon: 'trophy',         color: '#7c3aed'    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {user?.first_name} 👋</Text>
          <Text style={styles.headerSub}>Africa's startup ecosystem awaits</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* AI Banner */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigation.navigate('Matches')}
          activeOpacity={0.85}
        >
          <View style={styles.aiBannerLeft}>
            <Text style={styles.aiBannerTag}>🤖 AI Engine Active</Text>
            <Text style={styles.aiBannerTitle}>
              {matches?.count || 0} new matches{'
'}ready for you
            </Text>
            <Text style={styles.aiBannerSub}>Tap to view your ranked matches</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={48} color={COLORS.green} />
        </TouchableOpacity>

        {/* Top matches preview */}
        {matches?.data?.slice(0, 3).map((match, i) => (
          <TouchableOpacity
            key={i}
            style={styles.matchCard}
            onPress={() => navigation.navigate('MatchDetail', { match })}
          >
            <View style={[styles.matchAvatar, { backgroundColor: COLORS.green }]}>
              <Text style={styles.matchAvatarText}>
                {(match.investor_detail?.first_name?.[0] || 'I')}
              </Text>
            </View>
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>
                {match.investor_detail?.first_name} {match.investor_detail?.last_name}
              </Text>
              <Text style={styles.matchSub}>{match.investor_detail?.firm} · {match.target_type}</Text>
            </View>
            <View style={styles.matchScore}>
              <Text style={styles.matchScoreText}>{match.ai_score}%</Text>
              <Text style={styles.matchScoreLabel}>match</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActions}>
          {[
            { title: 'Apply for grant', icon: 'trophy', color: COLORS.gold,   screen: 'Grants'  },
            { title: 'Book a mentor',   icon: 'people', color: '#7c3aed',     screen: 'Learn'   },
            { title: 'Start a course',  icon: 'school', color: COLORS.green,  screen: 'Learn'   },
            { title: 'Send message',    icon: 'send',   color: COLORS.red,    screen: 'Messages'},
          ].map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickCard}
              onPress={() => navigation.navigate(a.screen)}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.color + '18' }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.black },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  greeting:        { fontSize: 20, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 2 },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Regular' },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn:        { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge:           { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
  badgeText:       { fontSize: 10, color: COLORS.white, fontFamily: 'SpaceGrotesk-Medium' },
  avatar:          { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontSize: 14, fontFamily: 'Sora-Bold', color: COLORS.white },
  scroll:          { flex: 1, backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  statsRow:        { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 10, marginBottom: 16 },
  statCard:        { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal:         { fontSize: 18, fontFamily: 'Sora-Bold', color: '#111', marginBottom: 2 },
  statLabel:       { fontSize: 10, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular', textAlign: 'center' },
  aiBanner:        { marginHorizontal: 16, backgroundColor: COLORS.black, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(45,181,98,0.3)' },
  aiBannerLeft:    { flex: 1 },
  aiBannerTag:     { fontSize: 11, color: '#6fdfa3', fontFamily: 'SpaceGrotesk-Medium', marginBottom: 6 },
  aiBannerTitle:   { fontSize: 20, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 6, lineHeight: 26 },
  aiBannerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Regular' },
  matchCard:       { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  matchAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  matchAvatarText: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.white },
  matchInfo:       { flex: 1 },
  matchName:       { fontSize: 14, fontFamily: 'Sora-SemiBold', color: '#111', marginBottom: 3 },
  matchSub:        { fontSize: 12, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular' },
  matchScore:      { alignItems: 'center' },
  matchScoreText:  { fontSize: 20, fontFamily: 'Sora-Bold', color: COLORS.green },
  matchScoreLabel: { fontSize: 10, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular' },
  sectionTitle:    { fontSize: 15, fontFamily: 'Sora-SemiBold', color: '#111', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  quickActions:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  quickCard:       { width: (width - 44) / 2, backgroundColor: COLORS.white, borderRadius: 14, padding: 16, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  quickIcon:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickLabel:      { fontSize: 13, fontFamily: 'Sora-SemiBold', color: '#111' },
});
