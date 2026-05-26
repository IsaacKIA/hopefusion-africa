/**
 * HopeFusion Africa — React Native Mobile App
 * Covers: navigation, screens, components, API hooks, offline sync
 * Install: npx create-expo-app hopefusion-mobile --template
 * Then: npm install @react-navigation/native @react-navigation/stack
 *       @react-navigation/bottom-tabs expo-secure-store expo-notifications
 *       expo-camera expo-document-picker @tanstack/react-query
 *       react-native-async-storage socket.io-client
 */

/* ============================================================
   APP ENTRY — App.js
   ============================================================ */
export const AppJs = `
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';

// Screens
import SplashScreen     from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen      from './src/screens/auth/LoginScreen';
import RegisterScreen   from './src/screens/auth/RegisterScreen';
import DashboardScreen  from './src/screens/dashboard/DashboardScreen';
import MatchesScreen    from './src/screens/matches/MatchesScreen';
import MatchDetailScreen from './src/screens/matches/MatchDetailScreen';
import GrantsScreen     from './src/screens/grants/GrantsScreen';
import GrantDetailScreen from './src/screens/grants/GrantDetailScreen';
import LearnScreen      from './src/screens/learn/LearnScreen';
import CourseScreen     from './src/screens/learn/CourseScreen';
import MentorsScreen    from './src/screens/mentors/MentorsScreen';
import MessagesScreen   from './src/screens/messages/MessagesScreen';
import ChatScreen       from './src/screens/messages/ChatScreen';
import ProfileScreen    from './src/screens/profile/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

LogBox.ignoreLogs(['Non-serializable values were found']);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 2, retryDelay: 1000 },
  },
});

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const COLORS = {
  green:  '#2DB562',
  gold:   '#E8A020',
  red:    '#E02020',
  black:  '#1A1A1A',
  white:  '#ffffff',
  bg:     '#F4F5F7',
  text:   '#3D3D3D',
};

// Configure push notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.black,
          borderTopColor:  'rgba(255,255,255,0.08)',
          paddingBottom:   8,
          paddingTop:      6,
          height:          62,
        },
        tabBarActiveTintColor:   COLORS.green,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'SpaceGrotesk-Medium' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard:  focused ? 'grid'           : 'grid-outline',
            Matches:    focused ? 'flash'          : 'flash-outline',
            Grants:     focused ? 'trophy'         : 'trophy-outline',
            Learn:      focused ? 'school'         : 'school-outline',
            Messages:   focused ? 'chatbubbles'    : 'chatbubbles-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Matches"   component={MatchesScreen}   />
      <Tab.Screen name="Grants"    component={GrantsScreen}    />
      <Tab.Screen name="Learn"     component={LearnScreen}     />
      <Tab.Screen name="Messages"  component={MessagesScreen}  />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login"      component={LoginScreen} />
      <Stack.Screen name="Register"   component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerStyle:     { backgroundColor: COLORS.black },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontFamily: 'Sora-SemiBold', fontSize: 16 },
    }}>
      <Stack.Screen name="Main"         component={MainTabs}         options={{ headerShown: false }} />
      <Stack.Screen name="MatchDetail"  component={MatchDetailScreen} options={{ title: 'Match details' }} />
      <Stack.Screen name="GrantDetail"  component={GrantDetailScreen} options={{ title: 'Grant details' }} />
      <Stack.Screen name="Course"       component={CourseScreen}      options={{ title: 'Course' }} />
      <Stack.Screen name="Chat"         component={ChatScreen}        options={{ title: 'Message' }} />
      <Stack.Screen name="Profile"      component={ProfileScreen}     options={{ title: 'My profile' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  return user ? <AppStack /> : <AuthStack />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer>
              <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
              <RootNavigator />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
`;

/* ============================================================
   AUTH CONTEXT — src/context/AuthContext.js
   ============================================================ */
export const AuthContextJs = `
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStoredAuth(); }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync('hfa_token'),
        SecureStore.getItemAsync('hfa_user'),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setToken(storedToken);
      }
    } catch (err) {
      console.error('Auth load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    await Promise.all([
      SecureStore.setItemAsync('hfa_token', data.token),
      SecureStore.setItemAsync('hfa_user',  JSON.stringify(data.user)),
    ]);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(payload) {
    const data = await api.post('/auth/register', payload);
    await Promise.all([
      SecureStore.setItemAsync('hfa_token', data.token),
      SecureStore.setItemAsync('hfa_user',  JSON.stringify(data.user)),
    ]);
    api.setToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try { await api.post('/auth/logout', {}); } catch {}
    await Promise.all([
      SecureStore.deleteItemAsync('hfa_token'),
      SecureStore.deleteItemAsync('hfa_user'),
    ]);
    api.setToken(null);
    setToken(null);
    setUser(null);
  }

  async function updateProfile(updates) {
    await api.patch('/users/me', updates);
    const updated = { ...user, ...updates };
    setUser(updated);
    await SecureStore.setItemAsync('hfa_user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
`;

/* ============================================================
   API SERVICE — src/services/api.js
   ============================================================ */
export const ApiServiceJs = `
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hopefusion-api.onrender.com/api';
let authToken = null;

export const api = {
  setToken: (t) => { authToken = t; },

  async request(method, path, body, opts = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: \`Bearer \${authToken}\` } : {}),
      ...opts.headers,
    };
    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const res = await fetch(\`\${BASE_URL}\${path}\`, config);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || \`HTTP \${res.status}\`);
      return data.data ?? data;
    } catch (err) {
      if (err.message === 'Network request failed') {
        throw new Error('No internet connection. Check your network.');
      }
      throw err;
    }
  },

  get:    (path, opts)        => api.request('GET',    path, null, opts),
  post:   (path, body, opts)  => api.request('POST',   path, body, opts),
  patch:  (path, body, opts)  => api.request('PATCH',  path, body, opts),
  put:    (path, body, opts)  => api.request('PUT',    path, body, opts),
  delete: (path, opts)        => api.request('DELETE', path, null, opts),
};

// AI Engine
const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'https://hopefusion-ai.onrender.com';
export const aiApi = {
  match:    (startup, investor)   => fetch(\`\${AI_URL}/api/ai/match\`,              { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup, investor }) }).then(r => r.json()),
  pitch:    (text, startupData)   => fetch(\`\${AI_URL}/api/ai/pitch/analyze\`,      { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pitch_text: text, startupData }) }).then(r => r.json()),
  grants:   (startup)             => fetch(\`\${AI_URL}/api/ai/grants/discover\`,    { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup }) }).then(r => r.json()),
  recommend:(user, type)          => fetch(\`\${AI_URL}/api/ai/recommend\`,          { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user, type }) }).then(r => r.json()),
  compliance:(startup, country)   => fetch(\`\${AI_URL}/api/ai/compliance/check\`,   { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startup, country }) }).then(r => r.json()),
};
`;

/* ============================================================
   DASHBOARD SCREEN — src/screens/dashboard/DashboardScreen.js
   ============================================================ */
export const DashboardScreenJs = `
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
              {matches?.count || 0} new matches{'\n'}ready for you
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
`;

/* ============================================================
   MATCHES SCREEN — src/screens/matches/MatchesScreen.js
   ============================================================ */
export const MatchesScreenJs = `
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { green:'#2DB562', gold:'#E8A020', red:'#E02020', black:'#1A1A1A', white:'#fff', bg:'#F4F5F7', text:'#3D3D3D', txt2:'#6b6b6b' };

export default function MatchesScreen({ navigation }) {
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(70);
  const [filter,   setFilter]   = useState('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches', minScore, filter],
    queryFn:  () => api.get(\`/matches/my?min_score=\${minScore}&limit=50\`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(\`/matches/\${id}/status\`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['matches']),
  });

  const renderMatch = ({ item: match }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MatchDetail', { match })}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={[styles.logo, { backgroundColor: scoreColor(match.ai_score) }]}>
          <Text style={styles.logoText}>{(match.investor_detail?.first_name?.[0] || 'I')}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {match.investor_detail?.first_name} {match.investor_detail?.last_name}
          </Text>
          <Text style={styles.cardSub}>{match.investor_detail?.firm_name || 'Impact Investor'}</Text>
          <View style={styles.tagRow}>
            {match.investor_detail?.sectors?.slice(0,2).map((s,i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
            ))}
          </View>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: scoreColor(match.ai_score) }]}>{match.ai_score}%</Text>
          <Text style={styles.scoreLbl}>match</Text>
        </View>
      </View>

      {match.ai_reasons?.[0] && (
        <View style={styles.reasonBox}>
          <Ionicons name="sparkles" size={13} color={COLORS.green} />
          <Text style={styles.reasonText} numberOfLines={2}>{match.ai_reasons[0]}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'contacted' })}
        >
          <Text style={styles.actionBtnTextWhite}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'saved' })}
        >
          <Ionicons name="bookmark-outline" size={16} color={COLORS.txt2} />
          <Text style={styles.actionBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'declined' })}
        >
          <Text style={styles.actionBtnText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  function scoreColor(s) {
    if (s >= 90) return COLORS.green;
    if (s >= 75) return COLORS.gold;
    return COLORS.red;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Matches</Text>
        <Text style={styles.sub}>{data?.count || 0} investors matched to your startup</Text>
      </View>

      <View style={styles.filters}>
        {['all','90+','saved','contacted'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter===f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); if (f==='90+') setMinScore(90); else setMinScore(70); }}
          >
            <Text style={[styles.filterText, filter===f && styles.filterTextActive]}>
              {f==='all'?'All':f==='90+'?'90%+ match':f.charAt(0).toUpperCase()+f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.green} /></View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={i => i.id}
          renderItem={renderMatch}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.green} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Complete your startup profile to get AI-matched with investors.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.bg },
  header:              { backgroundColor: COLORS.black, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  title:               { fontSize: 24, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 4 },
  sub:                 { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Regular' },
  filters:             { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn:           { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: '#e4e4e4' },
  filterBtnActive:     { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterText:          { fontSize: 12.5, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.txt2 },
  filterTextActive:    { color: COLORS.white },
  loading:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:                { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 14, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTop:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  logo:                { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoText:            { fontSize: 18, fontFamily: 'Sora-Bold', color: COLORS.white },
  cardInfo:            { flex: 1 },
  cardName:            { fontSize: 15, fontFamily: 'Sora-SemiBold', color: '#111', marginBottom: 3 },
  cardSub:             { fontSize: 12, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 },
  tagRow:              { flexDirection: 'row', gap: 6 },
  tag:                 { backgroundColor: '#E9F9EF', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  tagText:             { fontSize: 11, color: '#0f5233', fontFamily: 'SpaceGrotesk-Medium' },
  scoreWrap:           { alignItems: 'center' },
  score:               { fontSize: 22, fontFamily: 'Sora-Bold' },
  scoreLbl:            { fontSize: 10, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular' },
  reasonBox:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E9F9EF', borderRadius: 8, padding: 10, marginBottom: 14 },
  reasonText:          { flex: 1, fontSize: 12.5, color: '#0f5233', fontFamily: 'SpaceGrotesk-Regular', lineHeight: 18 },
  actions:             { flexDirection: 'row', gap: 10 },
  actionBtn:           { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  actionBtnPrimary:    { backgroundColor: COLORS.green },
  actionBtnOutline:    { borderWidth: 1.5, borderColor: '#e4e4e4', backgroundColor: COLORS.white },
  actionBtnTextWhite:  { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white },
  actionBtnText:       { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.txt2 },
  empty:               { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle:          { fontSize: 18, fontFamily: 'Sora-SemiBold', color: '#111', marginTop: 16, marginBottom: 8 },
  emptySub:            { fontSize: 14, color: COLORS.txt2, textAlign: 'center', lineHeight: 20, fontFamily: 'SpaceGrotesk-Regular' },
});
`;

/* ============================================================
   PUSH NOTIFICATIONS — src/services/notifications.js
   ============================================================ */
export const NotificationsServiceJs = `
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('hopefusion', {
      name:         'HopeFusion Africa',
      importance:   Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:   '#2DB562',
      sound:        true,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })).data;

  // Register token with backend
  try {
    await api.post('/push/register', { token, platform: Platform.OS });
  } catch (err) {
    console.error('Failed to register push token:', err);
  }

  return token;
}

export function setupNotificationHandlers(navigation) {
  // Handle notification tap while app is in background/closed
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    switch (data?.type) {
      case 'new_match':
        navigation.navigate('Matches');
        break;
      case 'message':
        navigation.navigate('Messages');
        break;
      case 'grant_deadline':
        navigation.navigate('Grants');
        break;
      case 'session_reminder':
        navigation.navigate('Dashboard');
        break;
      default:
        navigation.navigate('Notifications');
    }
  });
  return () => sub.remove();
}
`;

/* ============================================================
   APP.JSON / EXPO CONFIG
   ============================================================ */
export const AppJson = `{
  "expo": {
    "name": "HopeFusion Africa",
    "slug": "hopefusion-africa",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1A1A1A"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.hopefusionafrica.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "HopeFusion uses your camera for video mentor sessions.",
        "NSMicrophoneUsageDescription": "HopeFusion uses your microphone for audio and video calls.",
        "NSPhotoLibraryUsageDescription": "HopeFusion uses your photo library to upload your pitch deck and logo."
      }
    },
    "android": {
      "package": "com.hopefusionafrica.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A1A1A"
      },
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "expo-secure-store",
      "expo-notifications",
      "expo-camera",
      "expo-document-picker",
      ["expo-build-properties", {
        "android": { "compileSdkVersion": 34, "targetSdkVersion": 34, "buildToolsVersion": "34.0.0" },
        "ios": { "deploymentTarget": "15.0" }
      }]
    ],
    "extra": {
      "eas": { "projectId": "your-expo-project-id" }
    }
  }
}`;

/* ============================================================
   MOBILE PACKAGE.JSON
   ============================================================ */
export const MobilePackageJson = `{
  "name": "hopefusion-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start":          "expo start",
    "android":        "expo run:android",
    "ios":            "expo run:ios",
    "build:android":  "eas build --platform android",
    "build:ios":      "eas build --platform ios",
    "submit:android": "eas submit --platform android",
    "submit:ios":     "eas submit --platform ios"
  },
  "dependencies": {
    "expo":                          "~51.0.0",
    "expo-status-bar":               "~1.12.1",
    "expo-secure-store":             "~13.0.1",
    "expo-notifications":            "~0.28.1",
    "expo-camera":                   "~15.0.10",
    "expo-document-picker":          "~12.0.1",
    "expo-device":                   "~6.0.1",
    "expo-build-properties":         "~0.12.1",
    "react":                         "18.2.0",
    "react-native":                  "0.74.1",
    "@react-navigation/native":      "^6.1.17",
    "@react-navigation/stack":       "^6.4.0",
    "@react-navigation/bottom-tabs": "^6.6.0",
    "react-native-screens":          "3.31.1",
    "react-native-safe-area-context":"4.10.1",
    "@tanstack/react-query":         "^5.40.0",
    "socket.io-client":              "^4.7.5",
    "@expo/vector-icons":            "^14.0.2",
    "react-native-async-storage":    "^1.23.1"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0"
  }
}`;

export default {
  AppJs, AuthContextJs, ApiServiceJs, DashboardScreenJs,
  MatchesScreenJs, NotificationsServiceJs, AppJson, MobilePackageJson
};
