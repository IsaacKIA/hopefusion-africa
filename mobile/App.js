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
