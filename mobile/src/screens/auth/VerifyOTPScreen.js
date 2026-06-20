import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  green: '#2DB562',
  gold: '#E8A020',
  red: '#E02020',
  black: '#1A1A1A',
  card: '#262626',
  white: '#ffffff',
  bg: '#121212',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  border: '#334155',
};

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const { user, verifyOTP, resendOTP, logout } = useAuth();
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown timer
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleOtpChange = async (text, index) => {
    const cleanText = text.replace(/[^0-9]/g, '');

    // Check if the user pasted or autofilled a 6-digit code
    if (cleanText.length === 6) {
      const digits = cleanText.split('');
      setOtp(digits);
      await submitCode(cleanText);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input if filled
    if (cleanText && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Check if OTP is fully filled (6 digits)
    const code = newOtp.join('');
    if (code.length === 6 && newOtp.every((val) => val !== '')) {
      await submitCode(code);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const submitCode = async (code) => {
    setLoading(true);
    try {
      await verifyOTP(code);
      // Auth status state updates automatically and routes to onboarding / welcome
    } catch (err) {
      Alert.alert('Verification Failed', err.message || 'Invalid verification code');
      // Reset OTP values
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await resendOTP();
      setResendCooldown(60);
      Alert.alert('Success', 'Verification code resent to your email');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open-outline" size={48} color={COLORS.green} />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit verification code to{' '}
          <Text style={styles.emailText}>{user?.email || 'your email'}</Text>. Please enter it below.
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => (inputRefs.current[idx] = ref)}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              placeholderTextColor="#64748b"
              placeholder="-"
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
            />
          ))}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.green} />
            <Text style={styles.loadingText}>Verifying code...</Text>
          </View>
        )}

        <View style={styles.resendRow}>
          {resendCooldown > 0 ? (
            <Text style={styles.cooldownText}>Resend code in {resendCooldown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={styles.resendText}>
                {resending ? 'Sending...' : 'Resend Verification Code'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.logoutText}>Cancel & Log Out</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  emailText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 32,
  },
  otpInput: {
    backgroundColor: COLORS.card,
    color: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: 46,
    height: 54,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: COLORS.green,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  resendRow: {
    marginBottom: 40,
    alignItems: 'center',
  },
  cooldownText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  resendText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
