import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Dimensions
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#2DB562',
  gold: '#E8A020',
  red: '#E02020',
  black: '#1A1A1A',
  white: '#fff',
  bg: '#121212',
  cardBg: '#1E1E1E',
  txt2: '#a0a0a0',
  border: 'rgba(255,255,255,0.08)'
};

export default function PortalWorkspaceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('escrows'); // 'escrows', 'startups', 'disburse'
  
  // Form state for Opportunity (Grant / Challenge)
  const [oppTitle, setOppTitle] = useState('');
  const [oppDesc, setOppDesc] = useState('');
  const [oppValue, setOppValue] = useState('');
  const [oppAgencyHost, setOppAgencyHost] = useState('');

  // Form state for Escrow creator
  const [dealId, setDealId] = useState('');
  const [selectedStartupId, setSelectedStartupId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [escrowType, setEscrowType] = useState('MOBILE_MONEY'); // 'MATIC', 'MOBILE_MONEY'
  const [milestones, setMilestones] = useState([
    { title: 'Milestone 1: Setup', amount: '5000' },
    { title: 'Milestone 2: Release', amount: '5000' }
  ]);

  // Query logged in profile to see role & type
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });

  const isGov = profile?.investor_profile?.investor_type === 'government' || profile?.role === 'admin';
  const isCorp = profile?.investor_profile?.investor_type === 'corporate' || profile?.role === 'admin';
  const investorType = profile?.investor_profile?.investor_type || 'government';

  // Query SME Startups listing
  const { data: startupsRes, isLoading: loadingStartups } = useQuery({
    queryKey: ['portal-startups'],
    queryFn: () => api.get('/government/startups'),
    enabled: isGov || isCorp,
  });
  const startups = startupsRes?.data || [];

  // Query SME national analytics
  const { data: analyticsRes, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['portal-analytics'],
    queryFn: () => api.get('/government/analytics'),
    enabled: isGov,
  });
  const analytics = analyticsRes?.data;

  // Query Escrows disburse history
  const { data: escrowsRes, isLoading: loadingEscrows, refetch: refetchEscrows } = useQuery({
    queryKey: ['portal-escrows', investorType],
    queryFn: () => api.get(isGov ? '/government/escrows' : '/corporate/escrows'),
    enabled: isGov || isCorp,
  });
  const escrows = escrowsRes?.data || [];

  // Mutations
  const createOppMutation = useMutation({
    mutationFn: (payload) => api.post(isGov ? '/government/grants' : '/corporate/challenges', payload),
    onSuccess: () => {
      Alert.alert('Success', `Dynamic ${isGov ? 'Grant Program' : 'Corporate Challenge'} published successfully.`);
      setOppTitle('');
      setOppDesc('');
      setOppValue('');
      setOppAgencyHost('');
    },
    onError: (err) => Alert.alert('Error', err.message || 'Failed to publish opportunity.')
  });

  const createEscrowMutation = useMutation({
    mutationFn: (payload) => api.post(isGov ? '/government/disburse' : '/corporate/escrow/create', payload),
    onSuccess: () => {
      Alert.alert('Success', 'Dynamic Milestone Escrow payout created.');
      setDealId('');
      setSelectedStartupId('');
      setTotalAmount('');
      setMilestones([
        { title: 'Milestone 1: Setup', amount: '5000' },
        { title: 'Milestone 2: Release', amount: '5000' }
      ]);
      queryClient.invalidateQueries(['portal-escrows']);
    },
    onError: (err) => Alert.alert('Error', err.message || 'Failed to deploy contract.')
  });

  const verifyMilestoneMutation = useMutation({
    mutationFn: ({ escrowId, milestoneId, action }) => 
      api.post(`/corporate/escrow/${escrowId}/milestone/${milestoneId}/${action}`, {}),
    onSuccess: (_, variables) => {
      Alert.alert('Success', `Milestone successfully ${variables.action}d.`);
      queryClient.invalidateQueries(['portal-escrows']);
    },
    onError: (err) => Alert.alert('Error', err.message || 'Failed to update milestone status.')
  });

  const handlePublishOpportunity = () => {
    if (!oppTitle.trim()) return;
    const value = parseFloat(oppValue) || 0;
    const countries = ['KE', 'NG', 'ZA'];
    const sectors = ['Agriculture', 'Fintech', 'Health'];
    const stages = ['idea', 'mvp', 'early_traction'];

    const payload = {
      title: oppTitle,
      description: oppDesc || 'Challenge description',
      value_amount: value,
      currency: 'USD',
      eligible_countries: countries,
      eligible_sectors: sectors,
      eligible_stages: stages,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), // 90 days from now
      metadata: isGov ? { agency: oppAgencyHost || 'National Fund' } : { host: oppAgencyHost || 'Enterprise Hub' }
    };
    createOppMutation.mutate(payload);
  };

  const handleAddMilestoneInput = () => {
    setMilestones([...milestones, { title: '', amount: '' }]);
  };

  const handleRemoveMilestoneInput = (index) => {
    const updated = [...milestones];
    updated.splice(index, 1);
    setMilestones(updated);
  };

  const handleMilestoneValueChange = (index, field, val) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: val };
    setMilestones(updated);
  };

  const handleDeployEscrow = () => {
    const total = parseFloat(totalAmount) || 0;
    const mSum = milestones.reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
    
    if (Math.abs(mSum - total) > 0.01) {
      Alert.alert('Validation Error', `Milestones sum ($${mSum}) must match total escrow amount ($${total}).`);
      return;
    }

    if (!selectedStartupId) {
      Alert.alert('Validation Error', 'Please select a target startup.');
      return;
    }

    const payload = {
      deal_id: dealId || 'contract-ref',
      startup_node_id: selectedStartupId,
      investor_node_id: '77777777-7777-4777-8777-777777777777', // Mock VC Node
      total_amount: total,
      currency: 'USD',
      escrow_type: escrowType,
      arbitrator_node_id: '66666666-6666-4666-8666-666666666666', // Mock Arbitrator Node
      milestones: milestones.map(m => ({ title: m.title, amount: parseFloat(m.amount) || 0 }))
    };

    createEscrowMutation.mutate(payload);
  };

  if (loadingProfile || loadingAnalytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={{ color: COLORS.txt2, marginTop: 10 }}>Loading Portal Workspace...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isGov ? 'Government Portal' : 'Corporate Portal'}</Text>
        <TouchableOpacity onPress={() => refetchEscrows()}>
          <Ionicons name="refresh" size={20} color={COLORS.green} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'escrows' && styles.tabActive]}
          onPress={() => setActiveTab('escrows')}
        >
          <Text style={[styles.tabText, activeTab === 'escrows' && styles.tabTextActive]}>📊 Escrows</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'startups' && styles.tabActive]}
          onPress={() => setActiveTab('startups')}
        >
          <Text style={[styles.tabText, activeTab === 'startups' && styles.tabTextActive]}>💼 SME List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'disburse' && styles.tabActive]}
          onPress={() => setActiveTab('disburse')}
        >
          <Text style={[styles.tabText, activeTab === 'disburse' && styles.tabTextActive]}>💵 Disburse</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ==================== ESCROWS TAB ==================== */}
        {activeTab === 'escrows' && (
          <View>
            {/* Gov Analytics summary */}
            {isGov && analytics && (
              <View style={styles.analyticsSection}>
                <Text style={styles.sectionHeader}>SME National Registry Summary</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsScroll}>
                  <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>Total Startups</Text>
                    <Text style={styles.analyticVal}>{analytics.total_startups}</Text>
                  </View>
                  <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>Incorporations</Text>
                    <Text style={styles.analyticVal}>{analytics.total_registered_corporations}</Text>
                  </View>
                  <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>Avg Female rep</Text>
                    <Text style={[styles.analyticVal, { color: COLORS.green }]}>{analytics.avg_female_representation}%</Text>
                  </View>
                  <View style={styles.analyticCard}>
                    <Text style={styles.analyticLabel}>Avg Youth rep</Text>
                    <Text style={[styles.analyticVal, { color: COLORS.gold }]}>{analytics.avg_youth_representation}%</Text>
                  </View>
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionHeader}>Active Milestone Payouts</Text>
            {loadingEscrows ? (
              <ActivityIndicator size="small" color={COLORS.green} style={{ marginVertical: 20 }} />
            ) : escrows.length === 0 ? (
              <Text style={styles.emptyText}>No active milestone escrows found.</Text>
            ) : (
              escrows.map(escrow => (
                <View key={escrow.id} style={styles.escrowCard}>
                  <View style={styles.escrowHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.escrowTitle}>{escrow.deal_id}</Text>
                      <Text style={styles.escrowSub}>SME Node: {escrow.startup_name || 'Vetted Startup'}</Text>
                    </View>
                    <Text style={styles.escrowAmount}>${escrow.total_amount.toLocaleString()}</Text>
                  </View>

                  {/* Milestones list */}
                  <View style={styles.milestonesList}>
                    {escrow.milestones?.map((m, idx) => (
                      <View key={m.id} style={styles.milestoneRow}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.milestoneTitle}>{m.title}</Text>
                          {m.status === 'submitted' && (
                            <Text style={styles.evidenceLink} numberOfLines={1}>
                              Evidence: {m.evidence_uri}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.milestoneVal}>${m.amount.toLocaleString()}</Text>
                          
                          {/* Render Actions for Submitted evidence */}
                          {m.status === 'submitted' ? (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity
                                style={[styles.miniBtn, { backgroundColor: COLORS.green }]}
                                onPress={() => verifyMilestoneMutation.mutate({ escrowId: escrow.id, milestoneId: m.id, action: 'approve' })}
                              >
                                <Text style={styles.miniBtnText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.miniBtn, { backgroundColor: COLORS.red }]}
                                onPress={() => verifyMilestoneMutation.mutate({ escrowId: escrow.id, milestoneId: m.id, action: 'reject' })}
                              >
                                <Text style={styles.miniBtnText}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <Text style={[
                              styles.statusLabel,
                              m.status === 'approved' && { color: COLORS.green },
                              m.status === 'rejected' && { color: COLORS.red },
                            ]}>
                              {m.status.toUpperCase()}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ==================== STARTUPS TAB ==================== */}
        {activeTab === 'startups' && (
          <View>
            <Text style={styles.sectionHeader}>National SME Audit Trail</Text>
            {loadingStartups ? (
              <ActivityIndicator size="small" color={COLORS.green} style={{ marginVertical: 20 }} />
            ) : startups.length === 0 ? (
              <Text style={styles.emptyText}>No registered startups listed.</Text>
            ) : (
              startups.map(s => (
                <View key={s.id} style={styles.startupCard}>
                  <View style={styles.startupRow}>
                    <Text style={styles.startupName}>{s.name}</Text>
                    {s.is_verified && <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />}
                  </View>
                  <Text style={styles.startupMeta}>
                    {s.sector} · {s.stage.toUpperCase()} · {s.country}
                  </Text>
                  <View style={styles.startupFooter}>
                    <Text style={styles.startupDetail}>Headcount: {s.headcount || 'N/A'}</Text>
                    <Text style={styles.startupDetail}>Reg Ref: {s.registry_number || 'N/A'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ==================== DISBURSE TAB ==================== */}
        {activeTab === 'disburse' && (
          <View>
            {/* Opportunity Publisher Form */}
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>Publish Opportunity ({isGov ? 'Grant' : 'Challenge'})</Text>
              
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="National Innovation program..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={oppTitle}
                onChangeText={setOppTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Provide eligibility constraints..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                value={oppDesc}
                onChangeText={setOppDesc}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.inputLabel}>Value Amount ($)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="50000"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={oppValue}
                    onChangeText={setOppValue}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{isGov ? 'Gov Agency' : 'Host Corporate'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Standard Bank"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={oppAgencyHost}
                    onChangeText={setOppAgencyHost}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handlePublishOpportunity}>
                <Text style={styles.btnText}>Publish Opportunity</Text>
              </TouchableOpacity>
            </View>

            {/* Escrow deployment form */}
            <View style={styles.formCard}>
              <Text style={styles.cardHeaderTitle}>Deploy Capital Payout Escrow</Text>

              <Text style={styles.inputLabel}>Contract / Deal Ref</Text>
              <TextInput
                style={styles.input}
                placeholder="Reference Deal Code"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={dealId}
                onChangeText={setDealId}
              />

              <Text style={styles.inputLabel}>Select Target Startup SME</Text>
              <View style={styles.pickerFake}>
                {startups.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerItem, selectedStartupId === s.startup_node_id && styles.pickerItemActive]}
                    onPress={() => setSelectedStartupId(s.startup_node_id)}
                  >
                    <Text style={[styles.pickerText, selectedStartupId === s.startup_node_id && styles.pickerTextActive]}>
                      {s.name} ({s.country} · {s.stage.toUpperCase()})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.inputLabel}>Total Capital ($)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="10000"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Escrow Type</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      style={[styles.selectBtn, escrowType === 'MOBILE_MONEY' && styles.selectBtnActive]}
                      onPress={() => setEscrowType('MOBILE_MONEY')}
                    >
                      <Text style={[styles.selectBtnText, escrowType === 'MOBILE_MONEY' && styles.selectBtnTextActive]}>MoMo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.selectBtn, escrowType === 'MATIC' && styles.selectBtnActive]}
                      onPress={() => setEscrowType('MATIC')}
                    >
                      <Text style={[styles.selectBtnText, escrowType === 'MATIC' && styles.selectBtnTextActive]}>MATIC</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Dynamic Milestones */}
              <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12, marginTop: 6, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={styles.inputLabel}>Escrow Milestones Checklist</Text>
                  <TouchableOpacity onPress={handleAddMilestoneInput}>
                    <Text style={{ color: COLORS.green, fontSize: 12, fontFamily: 'SpaceGrotesk-Bold' }}>+ Add Row</Text>
                  </TouchableOpacity>
                </View>

                {milestones.map((m, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 2, marginBottom: 0 }]}
                      placeholder="Goal..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={m.title}
                      onChangeText={v => handleMilestoneValueChange(idx, 'title', v)}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      placeholder="Amt"
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={m.amount}
                      onChangeText={v => handleMilestoneValueChange(idx, 'amount', v)}
                    />
                    {milestones.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveMilestoneInput(idx)}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleDeployEscrow}>
                <Text style={styles.btnText}>Deploy Escrow Payout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 17, fontFamily: 'Sora-Bold', color: COLORS.white },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.green },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Medium' },
  tabTextActive: { color: COLORS.green },
  scrollContent: { padding: 16 },
  analyticsSection: { marginBottom: 20 },
  sectionHeader: { fontSize: 15, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginVertical: 12 },
  analyticsScroll: { gap: 10, paddingVertical: 4 },
  analyticCard: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 14, minWidth: 120, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  analyticLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 },
  analyticVal: { fontSize: 18, fontFamily: 'Sora-Bold', color: COLORS.white },
  escrowCard: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  escrowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 10, marginBottom: 10 },
  escrowTitle: { fontSize: 14, fontFamily: 'Sora-SemiBold', color: COLORS.white },
  escrowSub: { fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  escrowAmount: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.gold },
  milestonesList: { gap: 10 },
  milestoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  milestoneTitle: { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: 'rgba(255,255,255,0.8)' },
  evidenceLink: { fontSize: 10, color: COLORS.green, fontFamily: 'SpaceGrotesk-Regular', textDecorationLine: 'underline', marginTop: 2 },
  milestoneVal: { fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white },
  statusLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Bold' },
  miniBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  miniBtnText: { fontSize: 9, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white },
  startupCard: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  startupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  startupName: { fontSize: 14, fontFamily: 'Sora-SemiBold', color: COLORS.white },
  startupMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Regular', marginBottom: 8 },
  startupFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 6 },
  startupDetail: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Regular' },
  formCard: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeaderTitle: { fontSize: 14, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 14 },
  inputLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Medium', marginBottom: 6 },
  input: { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: COLORS.white, fontSize: 13, marginBottom: 12, fontFamily: 'SpaceGrotesk-Regular' },
  pickerFake: { maxHeight: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'scroll', marginBottom: 12 },
  pickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  pickerItemActive: { backgroundColor: 'rgba(45,181,98,0.1)' },
  pickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'SpaceGrotesk-Regular' },
  pickerTextActive: { color: COLORS.green, fontFamily: 'SpaceGrotesk-Medium' },
  selectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  selectBtnActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  selectBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'SpaceGrotesk-Medium' },
  selectBtnTextActive: { color: COLORS.white, fontFamily: 'SpaceGrotesk-Bold' },
  btnPrimary: { backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { fontSize: 14, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white }
});
