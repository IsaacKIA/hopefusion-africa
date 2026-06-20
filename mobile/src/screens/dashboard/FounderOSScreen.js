import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Dimensions
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
  bg: '#F4F5F7',
  text: '#3D3D3D',
  txt2: '#6b6b6b',
  border: '#e4e4e4',
  cardBg: '#262626'
};

export default function FounderOSScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('runway'); // 'runway', 'crm'
  const [balance, setBalance] = useState('');
  const [burnRate, setBurnRate] = useState('');

  // Ledger item form state
  const [ledgerMonth, setLedgerMonth] = useState('');
  const [ledgerIn, setLedgerIn] = useState('');
  const [ledgerOut, setLedgerOut] = useState('');

  // CRM deal form state
  const [selectedInvestorId, setSelectedInvestorId] = useState('');
  const [crmNotes, setCrmNotes] = useState('');
  const [crmEquity, setCrmEquity] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });

  const startupId = profile?.startup_profile?.id;

  const { data: financials, isLoading: loadingFin, refetch: refetchFin } = useQuery({
    queryKey: ['financials', startupId],
    queryFn: () => api.get(`/workspace/financials/${startupId}`),
    enabled: !!startupId,
    onSuccess: (data) => {
      if (data) {
        setBalance(String(data.bank_balance));
        setBurnRate(String(data.monthly_burn_rate));
      }
    }
  });

  const { data: crmDeals, isLoading: loadingCrm } = useQuery({
    queryKey: ['crm-deals', startupId],
    queryFn: () => api.get(`/workspace/crm/${startupId}`),
    enabled: !!startupId,
  });

  const { data: matches } = useQuery({
    queryKey: ['my-matches'],
    queryFn: () => api.get('/matches/my?limit=20'),
    enabled: !!startupId,
  });

  const saveFinancials = useMutation({
    mutationFn: (payload) => api.post('/workspace/financials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['financials']);
      Alert.alert('Success', 'Financial runway parameters updated.');
    },
    onError: (err) => {
      Alert.alert('Error', err.message || 'Failed to update financials.');
    }
  });

  const saveLedgerItem = useMutation({
    mutationFn: (payload) => api.post('/workspace/financials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['financials']);
      setLedgerMonth('');
      setLedgerIn('');
      setLedgerOut('');
      Alert.alert('Success', 'Cash flow entry logged.');
    }
  });

  const saveCrmDeal = useMutation({
    mutationFn: (payload) => api.post('/workspace/crm', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['crm-deals']);
      setSelectedInvestorId('');
      setCrmNotes('');
      setCrmEquity('');
      Alert.alert('Success', 'CRM deal created.');
    }
  });

  const handleUpdateRunway = () => {
    if (!startupId) return;
    saveFinancials.mutate({
      startup_id: startupId,
      bank_balance: parseFloat(balance) || 0,
      monthly_burn_rate: parseFloat(burnRate) || 0,
      currency: financials?.currency || 'USD',
      ledger_history: financials?.ledger_history || []
    });
  };

  const handleAddLedger = () => {
    if (!startupId || !ledgerMonth) return;
    const items = [...(financials?.ledger_history || [])];
    items.push({
      month: ledgerMonth,
      cash_in: parseFloat(ledgerIn) || 0,
      cash_out: parseFloat(ledgerOut) || 0
    });
    saveLedgerItem.mutate({
      startup_id: startupId,
      bank_balance: financials?.bank_balance || 0,
      monthly_burn_rate: financials?.monthly_burn_rate || 0,
      currency: financials?.currency || 'USD',
      ledger_history: items
    });
  };

  const handleAddCrm = () => {
    if (!startupId || !selectedInvestorId) return;
    saveCrmDeal.mutate({
      startup_id: startupId,
      investor_node_id: selectedInvestorId,
      pipeline_stage: 'lead',
      notes: crmNotes,
      equity_offered: parseFloat(crmEquity) || 0
    });
  };

  const handleMoveCrm = (deal, offset) => {
    if (!startupId) return;
    const stages = ['lead', 'contacted', 'pitching', 'due_diligence', 'term_sheet', 'funded', 'passed'];
    const curIdx = stages.indexOf(deal.pipeline_stage);
    const newIdx = curIdx + offset;
    if (newIdx < 0 || newIdx >= stages.length) return;

    saveCrmDeal.mutate({
      startup_id: startupId,
      investor_node_id: deal.investor_node_id,
      pipeline_stage: stages[newIdx],
      notes: deal.notes,
      equity_offered: deal.equity_offered
    });
  };

  if (!startupId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.white }}>Please create a Startup profile first.</Text>
      </View>
    );
  }

  const runwayVal = financials?.forecasted_runway_months || 0.0;
  const runwayColor = runwayVal >= 12 ? COLORS.green : runwayVal >= 6 ? COLORS.gold : COLORS.red;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Founder OS / Workspace</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'runway' && styles.tabActive]}
          onPress={() => setActiveTab('runway')}
        >
          <Text style={[styles.tabText, activeTab === 'runway' && styles.tabTextActive]}>📊 Runway & Ledger</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'crm' && styles.tabActive]}
          onPress={() => setActiveTab('crm')}
        >
          <Text style={[styles.tabText, activeTab === 'crm' && styles.tabTextActive]}>🤝 Investor CRM</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ==================== RUNWAY TAB ==================== */}
        {activeTab === 'runway' && (
          <View>
            {/* Runway Ring */}
            <View style={styles.runwayCard}>
              <View style={[styles.ringOuter, { borderColor: runwayColor + '30' }]}>
                <View style={[styles.ringInner, { borderColor: runwayColor }]}>
                  <Text style={[styles.runwayTitle, { color: runwayColor }]}>{runwayVal.toFixed(1)}</Text>
                  <Text style={styles.runwaySub}>Months Runway</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Liquid Cash</Text>
                  <Text style={styles.statVal}>${financials?.bank_balance?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Monthly Burn</Text>
                  <Text style={styles.statVal}>${financials?.monthly_burn_rate?.toLocaleString() || '0'}</Text>
                </View>
              </View>
            </View>

            {/* Parameter Inputs */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Runway Parameters</Text>
              <Text style={styles.inputLabel}>Bank Balance ($ USD)</Text>
              <TextInput
                style={styles.input}
                value={balance}
                onChangeText={setBalance}
                keyboardType="numeric"
                placeholder="100000"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={styles.inputLabel}>Monthly Burn Rate ($ USD)</Text>
              <TextInput
                style={styles.input}
                value={burnRate}
                onChangeText={setBurnRate}
                keyboardType="numeric"
                placeholder="5000"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdateRunway}>
                <Text style={styles.btnText}>Update Parameters</Text>
              </TouchableOpacity>
            </View>

            {/* Ledger History */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Cash Flow Record</Text>
              <TextInput
                style={styles.input}
                placeholder="Month Name (e.g. June 2026)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={ledgerMonth}
                onChangeText={setLedgerMonth}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Inflow ($)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={ledgerIn}
                  onChangeText={setLedgerIn}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Outflow ($)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={ledgerOut}
                  onChangeText={setLedgerOut}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity style={styles.btnSecondary} onPress={handleAddLedger}>
                <Text style={styles.btnText}>Log Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== CRM TAB ==================== */}
        {activeTab === 'crm' && (
          <View>
            {/* Create CRM Deal */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Track New Deal</Text>
              <Text style={styles.inputLabel}>Select Investor Match</Text>
              <View style={styles.pickerFake}>
                {matches?.data?.map(m => (
                  <TouchableOpacity
                    key={m.target_id}
                    style={[styles.pickerItem, selectedInvestorId === m.target_id && styles.pickerItemActive]}
                    onPress={() => setSelectedInvestorId(m.target_id)}
                  >
                    <Text style={[styles.pickerText, selectedInvestorId === m.target_id && styles.pickerTextActive]}>
                      {m.investor_detail?.firm || 'Investor VC'} ({m.ai_score}% Match)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Equity Offered (%)</Text>
              <TextInput
                style={styles.input}
                value={crmEquity}
                onChangeText={setCrmEquity}
                keyboardType="numeric"
                placeholder="5"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={styles.inputLabel}>Interaction Notes</Text>
              <TextInput
                style={styles.input}
                value={crmNotes}
                onChangeText={setCrmNotes}
                placeholder="Scheduled introductory pitch call..."
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={handleAddCrm}>
                <Text style={styles.btnText}>Register Deal</Text>
              </TouchableOpacity>
            </View>

            {/* Deals Pipeline */}
            <Text style={styles.sectionHeader}>CRM Pipeline Deals</Text>
            {crmDeals?.length === 0 ? (
              <Text style={styles.emptyText}>No deal relations tracked yet.</Text>
            ) : (
              crmDeals?.map(deal => (
                <View key={deal.id} style={styles.dealCard}>
                  <View style={styles.dealHeader}>
                    <Text style={styles.dealTitle}>{deal.investor_details?.firm || 'Matched VC'}</Text>
                    <View style={styles.stageBadge}>
                      <Text style={styles.stageText}>{deal.pipeline_stage.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.dealNotes}>{deal.notes || 'No notes yet.'}</Text>
                  <View style={styles.dealFooter}>
                    <Text style={styles.dealMeta}>Equity: {deal.equity_offered}%</Text>
                    <View style={styles.dealActions}>
                      <TouchableOpacity style={styles.dealBtn} onPress={() => handleMoveCrm(deal, -1)}>
                        <Ionicons name="chevron-back" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dealBtn} onPress={() => handleMoveCrm(deal, 1)}>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 18, fontFamily: 'Sora-Bold', color: COLORS.white },
  loadingContainer: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.green },
  tabText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Medium' },
  tabTextActive: { color: COLORS.green },
  scrollContent: { padding: 16 },
  runwayCard: { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  ringOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  ringInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  runwayTitle: { fontSize: 32, fontFamily: 'Sora-Bold' },
  runwaySub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 16 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Regular', marginBottom: 4 },
  statVal: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.white },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginBottom: 16 },
  inputLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Medium', marginBottom: 6 },
  input: { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 12, color: COLORS.white, fontSize: 14, marginBottom: 12 },
  btnPrimary: { backgroundColor: COLORS.green, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 14, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white },
  pickerFake: { maxHeight: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'scroll', marginBottom: 12 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  pickerItemActive: { backgroundColor: 'rgba(45,181,98,0.1)' },
  pickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: 'SpaceGrotesk-Regular' },
  pickerTextActive: { color: COLORS.green, fontFamily: 'SpaceGrotesk-Medium' },
  sectionHeader: { fontSize: 15, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginTop: 8, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginVertical: 20 },
  dealCard: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 16, marginBottom: 12 },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dealTitle: { fontSize: 14, fontFamily: 'Sora-SemiBold', color: COLORS.white },
  stageBadge: { backgroundColor: 'rgba(232,160,32,0.1)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  stageText: { fontSize: 10, color: COLORS.gold, fontFamily: 'SpaceGrotesk-Bold' },
  dealNotes: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'SpaceGrotesk-Regular', marginBottom: 12, lineHeight: 18 },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'SpaceGrotesk-Medium' },
  dealActions: { flexDirection: 'row', gap: 6 },
  dealBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }
});
