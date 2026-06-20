import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api } from '../../services/api';
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

export default function ResetPasswordScreen({ route, navigation }) {
  const emailParam = route.params?.email || '';
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleReset = async () => {
    if (!email || !code || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (code.length !== 6) {
      Alert.alert('Error', 'Reset code must be 6 digits');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });

      if (res?.success) {
        Alert.alert(
          'Success',
          'Password has been reset successfully. Please log in with your new password.',
          [
            {
              text: 'Log In',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        throw new Error(res?.error || 'Failed to reset password');
      }
    } catch (err) {
      Alert.alert('Reset Failed', err.message || 'Verification code or request is invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ForgotPassword')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.green} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to your email and choose a strong new password.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email (Pre-filled or editable) */}
          <Text style={styles.label}>Email Address</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'email' && styles.inputWrapperFocused,
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* Reset Code */}
          <Text style={styles.label}>6-Digit Reset Code</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'code' && styles.inputWrapperFocused,
            ]}
          >
            <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter 6 digits"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              onFocus={() => setFocusedInput('code')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          {/* New Password */}
          <Text style={styles.label}>New Password</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedInput === 'password' && styles.inputWrapperFocused,
            ]}
          >
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.toggleBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Password Strength indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      newPassword.length < 6
                        ? COLORS.red
                        : newPassword.length < 10
                        ? COLORS.gold
                        : COLORS.green,
                    width: `${Math.min(100, newPassword.length * 10)}%`,
                  },
                ]}
              />
              <Text style={styles.strengthText}>
                {newPassword.length < 6 ? 'Weak' : newPassword.length < 10 ? 'Medium' : 'Strong'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Resetting Password...' : 'Reset Password'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  inputWrapperFocused: {
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    height: '100%',
  },
  toggleBtn: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  strengthText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.green,
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
