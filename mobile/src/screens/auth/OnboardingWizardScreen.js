import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
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

const AVAILABLE_GOALS = [
  'Raise Funding',
  'Find Grants',
  'Find Mentors',
  'Find Opportunities',
  'Hire Talent',
  'Learn Entrepreneurship',
  'Invest in Startups',
  'Support Entrepreneurs',
];

const COUNTRIES = ['Ghana', 'Nigeria', 'Kenya', 'Egypt', 'South Africa', 'Rwanda'];

const ROLE_OPTIONS = [
  { value: 'startup', label: 'Startup Founder' },
  { value: 'investor', label: 'Ecosystem Investor' },
  { value: 'mentor', label: 'Professional Mentor' },
  { value: 'student', label: 'Ecosystem Student' },
  { value: 'corporate', label: 'Corporate Innovation Partner' },
  { value: 'government', label: 'Government Officer' },
  { value: 'service_provider', label: 'Service Provider' },
];

const SECTOR_OPTIONS = ['fintech', 'agritech', 'healthtech', 'cleantech', 'edtech', 'logistics', 'e-commerce', 'ai'];

export default function OnboardingWizardScreen({ navigation }) {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [goals, setGoals] = useState([]);
  const [country, setCountry] = useState('Ghana');
  const [roles, setRoles] = useState(['startup']);
  
  // Role specific profile states
  const [startupName, setStartupName] = useState('');
  const [startupSector, setStartupSector] = useState('fintech');
  const [startupStage, setStartupStage] = useState('idea');
  const [teamSize, setTeamSize] = useState('1');

  const [firmName, setFirmName] = useState('');
  const [investorType, setInvestorType] = useState('angel');
  const [ticketMin, setTicketMin] = useState('1000');
  const [ticketMax, setTicketMax] = useState('50000');

  const [mentorBio, setMentorBio] = useState('');

  // Sectors of interest
  const [sectors, setSectors] = useState([]);

  // Dropdown states for mobile lists
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showSectorPicker, setShowSectorPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);

  const toggleGoal = (goal) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter((g) => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const toggleRole = (r) => {
    if (roles.includes(r)) {
      if (roles.length > 1) {
        setRoles(roles.filter((role) => role !== r));
      }
    } else {
      setRoles([...roles, r]);
    }
  };

  const toggleSector = (sec) => {
    if (sectors.includes(sec)) {
      setSectors(sectors.filter((s) => s !== sec));
    } else {
      setSectors([...sectors, sec]);
    }
  };

  const handleNext = () => {
    if (step === 1 && goals.length === 0) {
      Alert.alert('Error', 'Please select at least one goal to proceed.');
      return;
    }
    if (step === 4) {
      if (roles.includes('startup') && !startupName) {
        Alert.alert('Error', 'Please enter your startup name.');
        return;
      }
      if (roles.includes('investor') && !firmName) {
        Alert.alert('Error', 'Please enter your firm name.');
        return;
      }
      if (roles.includes('mentor') && !mentorBio) {
        Alert.alert('Error', 'Please write a short biography overview.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await completeOnboarding({
        goals: ['Explore Dashboard'],
        country: country || 'Ghana',
        roles: roles || ['startup'],
        sectors: [],
      });
      // Auth routing will update to AppStack automatically
    } catch (err) {
      Alert.alert('Error', 'Unable to complete onboarding. Please complete the setup.');
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);

    const payload = {
      goals,
      country,
      roles,
      // Startup fields
      ...(roles.includes('startup') && {
        startup_name: startupName || `${user?.first_name}'s Startup`,
        sector: startupSector,
        stage: startupStage,
        team_size: parseInt(teamSize) || 1,
      }),
      // Investor fields
      ...(roles.includes('investor') && {
        firm_name: firmName,
        investor_type: investorType,
        ticket_min: parseInt(ticketMin) || 1000,
        ticket_max: parseInt(ticketMax) || 50000,
      }),
      // Mentor fields
      ...(roles.includes('mentor') && {
        expertise: sectors,
        languages: ['English'],
        experience_years: 5,
        mentor_bio: mentorBio,
      }),
      sectors,
    };

    try {
      await completeOnboarding(payload);
      // Navigation will route user to main AppStack automatically
    } catch (err) {
      Alert.alert('Onboarding Failed', err.message || 'Verification update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressHeader}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Step {step} of 6</Text>
          <Text style={styles.progressPercent}>{Math.round((step / 6) * 100)}% Complete</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(step / 6) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* STEP 1: GOALS */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What brings you to HopeFusion today?</Text>
            <Text style={styles.stepSubtitle}>
              Select all items that match your objectives. We will personalize your dashboard recommendations.
            </Text>

            <View style={styles.grid}>
              {AVAILABLE_GOALS.map((goal) => {
                const selected = goals.includes(goal);
                return (
                  <TouchableOpacity
                    key={goal}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => toggleGoal(goal)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{goal}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: COUNTRY */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose your active country</Text>
            <Text style={styles.stepSubtitle}>
              We align opportunities and compliance rules with your selected region.
            </Text>

            <Text style={styles.label}>Ecosystem Base Country</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={styles.pickerTriggerText}>{country}</Text>
              <Ionicons name={showCountryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {showCountryPicker && (
              <View style={styles.pickerDropdown}>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.pickerItem, country === c && styles.pickerItemActive]}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, country === c && styles.pickerItemTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* STEP 3: ROLE SELECTION */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select your ecosystem roles</Text>
            <Text style={styles.stepSubtitle}>
              Select all roles that apply. You can combine multiple roles (e.g. Founder + Mentor).
            </Text>

            <View style={styles.list}>
              {ROLE_OPTIONS.map((opt) => {
                const selected = roles.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.listItem, selected && styles.listItemActive]}
                    onPress={() => toggleRole(opt.value)}
                  >
                    <Text style={[styles.listItemText, selected && styles.listItemTextActive]}>
                      {opt.label}
                    </Text>
                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                      {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: DYNAMIC ROLE FORMS */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Define Profile Details</Text>
            <Text style={styles.stepSubtitle}>Fill in particulars for your selected roles.</Text>

            {/* Founder Form */}
            {roles.includes('startup') && (
              <View style={styles.roleSubForm}>
                <Text style={styles.roleHeader}>Startup Founder Details</Text>
                
                <Text style={styles.label}>Startup Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="My Company Ltd"
                  placeholderTextColor="#64748b"
                  value={startupName}
                  onChangeText={setStartupName}
                />

                <Text style={styles.label}>Industry Sector</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowSectorPicker(!showSectorPicker)}
                >
                  <Text style={styles.pickerTriggerText}>{startupSector.toUpperCase()}</Text>
                  <Ionicons name={showSectorPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {showSectorPicker && (
                  <View style={styles.pickerDropdown}>
                    {SECTOR_OPTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.pickerItem, startupSector === s && styles.pickerItemActive]}
                        onPress={() => {
                          setStartupSector(s);
                          setShowSectorPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, startupSector === s && styles.pickerItemTextActive]}>
                          {s.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Company Stage</Text>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowStagePicker(!showStagePicker)}
                    >
                      <Text style={styles.pickerTriggerText}>{startupStage.toUpperCase()}</Text>
                      <Ionicons name={showStagePicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {showStagePicker && (
                      <View style={styles.pickerDropdown}>
                        {['idea', 'mvp', 'early_traction', 'growth'].map((stageVal) => (
                          <TouchableOpacity
                            key={stageVal}
                            style={[styles.pickerItem, startupStage === stageVal && styles.pickerItemActive]}
                            onPress={() => {
                              setStartupStage(stageVal);
                              setShowStagePicker(false);
                            }}
                          >
                            <Text style={[styles.pickerItemText, startupStage === stageVal && styles.pickerItemTextActive]}>
                              {stageVal.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={[styles.formCol, { marginLeft: 12 }]}>
                    <Text style={styles.label}>Team Size</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 5"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={teamSize}
                      onChangeText={setTeamSize}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Investor Form */}
            {roles.includes('investor') && (
              <View style={[styles.roleSubForm, roles.includes('startup') && styles.borderTop]}>
                <Text style={styles.roleHeader}>Investor Details</Text>

                <Text style={styles.label}>Firm Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ecosystem Capital"
                  placeholderTextColor="#64748b"
                  value={firmName}
                  onChangeText={setFirmName}
                />

                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Min. Ticket (USD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Min"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={ticketMin}
                      onChangeText={setTicketMin}
                    />
                  </View>

                  <View style={[styles.formCol, { marginLeft: 12 }]}>
                    <Text style={styles.label}>Max. Ticket (USD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Max"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={ticketMax}
                      onChangeText={setTicketMax}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Mentor Form */}
            {roles.includes('mentor') && (
              <View style={[styles.roleSubForm, (roles.includes('startup') || roles.includes('investor')) && styles.borderTop]}>
                <Text style={styles.roleHeader}>Mentor Details</Text>

                <Text style={styles.label}>Biography Overview</Text>
                <TextInput
                  style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Briefly state your mentorship domains and work history..."
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={4}
                  value={mentorBio}
                  onChangeText={setMentorBio}
                />
              </View>
            )}

            {!roles.includes('startup') && !roles.includes('investor') && !roles.includes('mentor') && (
              <Text style={styles.emptyText}>No supplementary profile fields required. Tap Next.</Text>
            )}
          </View>
        )}

        {/* STEP 5: SECTORS */}
        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Areas of Interest</Text>
            <Text style={styles.stepSubtitle}>
              Choose the startup sectors you are interested in tracking. We personalize your feed with updates from these fields.
            </Text>

            <View style={styles.grid}>
              {SECTOR_OPTIONS.map((s) => {
                const selected = sectors.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sectorChip, selected && styles.sectorChipActive]}
                    onPress={() => toggleSector(s)}
                  >
                    <Text style={[styles.sectorChipText, selected && styles.sectorChipTextActive]}>
                      {s.toUpperCase()}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 6: CONFIRMATION */}
        {step === 6 && (
          <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.finishIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.green} />
            </View>
            <Text style={styles.stepTitle}>Onboarding Complete!</Text>
            <Text style={[styles.stepSubtitle, { textAlign: 'center' }]}>
              We've updated your HopeScore and personalized recommendations. You are now ready to access the continent's opportunities operating system!
            </Text>

            <TouchableOpacity
              style={[styles.finishBtn, loading && styles.btnDisabled]}
              onPress={handleFinish}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.finishBtnText}>Activate Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer Controls */}
      {step < 6 && (
        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.footerRight}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>Skip wizard</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  progressHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 10,
  },
  chipActive: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 12,
  },
  pickerTriggerText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  pickerDropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
  },
  pickerItemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  pickerItemTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  list: {
    width: '100%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  listItemActive: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
  },
  listItemText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  listItemTextActive: {
    color: COLORS.white,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  roleSubForm: {
    marginBottom: 20,
  },
  roleHeader: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: COLORS.card,
    color: COLORS.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
  },
  formCol: {
    flex: 1,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 16,
    marginTop: 16,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  sectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    marginBottom: 10,
  },
  sectorChipActive: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
  },
  sectorChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
  sectorChipTextActive: {
    color: COLORS.white,
  },
  finishIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(45, 181, 98, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  finishBtn: {
    backgroundColor: COLORS.green,
    width: '100%',
    height: 54,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  finishBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  skipBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
