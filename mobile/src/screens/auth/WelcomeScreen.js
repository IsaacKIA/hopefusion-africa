import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  green: '#2DB562',
  gold: '#E8A020',
  red: '#E02020',
  black: '#1A1A1A',
  card: '#1E293B',
  white: '#ffffff',
  bg: '#121212',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  border: '#334155',
};

export default function WelcomeScreen({ navigation }) {
  const { user, checkStatus, logout, completeOnboarding } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passportData, setPassportData] = useState(null);

  useEffect(() => {
    loadPassport();
  }, []);

  const loadPassport = async () => {
    try {
      const data = await checkStatus();
      if (data) {
        setPassportData(data);
      }
    } catch (err) {
      console.error('Welcome screen status fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      // Complete onboarding with default values to allow permanent skip
      await completeOnboarding({
        goals: ['Explore Dashboard'],
        country: user?.country || 'Ghana',
        roles: [user?.role || 'startup'],
        sectors: [],
      });
      // Auth routing will update automatically to AppStack
    } catch (err) {
      Alert.alert('Error', 'Unable to skip onboarding at this time. Please complete the setup.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
      </View>
    );
  }

  const score = passportData?.hope_score || 300;
  const completion = passportData?.profile_completion || 10;
  const verificationStatus = passportData?.verification_status || 'Verified';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greenTag}>Passport Created</Text>
        <Text style={styles.title}>Welcome, {user?.first_name}!</Text>
        <Text style={styles.subtitle}>
          Your digital identity is active. We've initialized your HopeScore Passport to track your progress and match you with global opportunities.
        </Text>

        {/* Passport Card Design */}
        <View style={styles.passportCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ecosystem Credentials</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{verificationStatus}</Text>
            </View>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>HopeScore™ Trust</Text>
              <Text style={[styles.metricValue, { color: COLORS.green }]}>{score}</Text>
            </View>

            <View style={styles.metricColumn}>
              <Text style={styles.metricLabel}>Profile Progress</Text>
              <Text style={styles.metricValue}>{completion}%</Text>
            </View>
          </View>

          <View style={styles.recommendedAction}>
            <View style={styles.bulletContainer}>
              <View style={styles.bullet} />
              <Text style={styles.actionText}>Complete Progressive Profile Setup</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('OnboardingWizard')}
        >
          <Text style={styles.primaryBtnText}>Configure Onboarding</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip}>
          <Text style={styles.secondaryBtnText}>Skip and explore dashboard</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  greenTag: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  passportCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    marginBottom: 36,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 16,
    marginBottom: 20,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  badgeContainer: {
    backgroundColor: 'rgba(45, 181, 98, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricColumn: {
    flex: 1,
  },
  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metricValue: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: '800',
  },
  recommendedAction: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
    marginRight: 8,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    width: '100%',
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryBtn: {
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
