import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

const ROLE_OPTIONS = [
  { value: 'startup', label: 'Startup Founder' },
  { value: 'investor', label: 'Ecosystem Investor' },
  { value: 'mentor', label: 'Professional Mentor' },
  { value: 'student', label: 'Ecosystem Student' },
  { value: 'corporate', label: 'Corporate Innovation Partner' },
  { value: 'government', label: 'Government Officer' },
  { value: 'service_provider', label: 'Service Provider' },
];

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('startup');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus tracking for premium border highlights
  const [focusedInput, setFocusedInput] = useState(null);

  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }
    
    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      // Context will automatically update state and navigators will route to Verification
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Check inputs');
    } finally {
      setLoading(false);
    }
  };

  const selectedRoleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || 'Select Role';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Join HopeFusion</Text>
          <Text style={styles.subtitle}>Connect with Africa's largest opportunities operating system</Text>
        </View>

        <View style={styles.form}>
          {/* First Name & Last Name in Row */}
          <View style={styles.row}>
            <View style={styles.flexHalf}>
              <Text style={styles.label}>First Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'firstName' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First"
                  placeholderTextColor="#64748b"
                  value={firstName}
                  onChangeText={setFirstName}
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={[styles.flexHalf, { marginLeft: 12 }]}>
              <Text style={styles.label}>Last Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === 'lastName' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last"
                  placeholderTextColor="#64748b"
                  value={lastName}
                  onChangeText={setLastName}
                  onFocus={() => setFocusedInput('lastName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>
          </View>

          {/* Email */}
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

          {/* Password */}
          <Text style={styles.label}>Password</Text>
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
              value={password}
              onChangeText={setPassword}
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
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View
                style={[
                  styles.strengthBar,
                  {
                    backgroundColor:
                      password.length < 6
                        ? COLORS.red
                        : password.length < 10
                        ? COLORS.gold
                        : COLORS.green,
                    width: `${Math.min(100, password.length * 10)}%`,
                  },
                ]}
              />
              <Text style={styles.strengthText}>
                {password.length < 6 ? 'Weak' : password.length < 10 ? 'Medium' : 'Strong'}
              </Text>
            </View>
          )}

          {/* Custom Expandable Dropdown for Role Selector */}
          <Text style={styles.label}>Primary Role</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.dropdownTrigger,
                showRoleDropdown && styles.dropdownTriggerActive,
              ]}
              onPress={() => setShowRoleDropdown(!showRoleDropdown)}
            >
              <View style={styles.dropdownTriggerLeft}>
                <Ionicons name="briefcase-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <Text style={styles.dropdownTriggerText}>{selectedRoleLabel}</Text>
              </View>
              <Ionicons
                name={showRoleDropdown ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {showRoleDropdown && (
              <View style={styles.dropdownMenu}>
                {ROLE_OPTIONS.map((opt, idx) => {
                  const isSelected = role === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.dropdownItem,
                        idx < ROLE_OPTIONS.length - 1 && styles.dropdownItemBorder,
                        isSelected && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setRole(opt.value);
                        setShowRoleDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={COLORS.green} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating Account...' : 'Create Account'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkHighlightText}>Log in</Text>
            </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: COLORS.green,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  flexHalf: {
    flex: 1,
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
    marginBottom: 16,
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
  dropdownContainer: {
    marginBottom: 24,
    position: 'relative',
    zIndex: 10,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 14,
    height: 52,
  },
  dropdownTriggerActive: {
    borderColor: COLORS.green,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    color: COLORS.text,
    fontSize: 15,
  },
  dropdownMenu: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownItemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  button: {
    backgroundColor: COLORS.green,
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  linkHighlightText: {
    color: COLORS.green,
    fontWeight: 'bold',
  },
});
