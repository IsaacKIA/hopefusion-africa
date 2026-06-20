import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions
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

export default function EscrowTrackerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [submittingMilestoneId, setSubmittingMilestoneId] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // Fetch profile to get startup ID
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });
  const startupId = profile?.startup_profile?.id;

  // Fetch active escrows & milestones for startup
  const { data: escrows, isLoading: loadingEscrows, refetch, isRefetching } = useQuery({
    queryKey: ['my-escrows', startupId],
    queryFn: () => api.get(`/workspace/escrows/${startupId}`),
    enabled: !!startupId,
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: ({ escrowId, milestoneId, evidenceUri }) =>
      api.post(`/corporate/escrow/${escrowId}/milestone/${milestoneId}/submit`, { evidence_uri: evidenceUri }),
    onSuccess: () => {
      Alert.alert('Success', 'Milestone validation evidence submitted successfully.');
      setSubmittingMilestoneId(null);
      setEvidenceUrl('');
      queryClient.invalidateQueries(['my-escrows']);
    },
    onError: (err) => Alert.alert('Error', err.message || 'Failed to submit evidence.')
  });

  const handleSubmitEvidence = (escrowId, milestoneId) => {
    if (!evidenceUrl.trim()) return;
    submitEvidenceMutation.mutate({
      escrowId,
      milestoneId,
      evidenceUri: evidenceUrl.trim()
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return COLORS.green;
      case 'submitted': return COLORS.gold;
      case 'rejected': return COLORS.red;
      default: return COLORS.txt2;
    }
  };

  if (loadingProfile || loadingEscrows) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={{ color: COLORS.txt2, marginTop: 10 }}>Syncing ledger nodes...</Text>
      </View>
    );
  }

  if (!startupId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.white }}>Please register a Startup profile first.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Disbursement Tracker</Text>
          <Text style={styles.headerSub}>Capital Escrows v4</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={COLORS.green} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={escrows || []}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No Active Disbursements</Text>
            <Text style={styles.emptySubtitle}>
              Dynamic escrows created by government grants or corporate procurement programs will list here.
            </Text>
          </View>
        }
        renderItem={({ item: escrow }) => (
          <View style={styles.escrowCard}>
            <View style={styles.escrowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.escrowTitle}>Ref: {escrow.deal_id}</Text>
                <Text style={styles.escrowSub}>Gateway: {escrow.escrow_type} · Status: {escrow.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.escrowAmount}>${escrow.total_amount.toLocaleString()}</Text>
            </View>

            {/* Milestones list */}
            <View style={styles.milestonesList}>
              <Text style={styles.sectionHeader}>Contract Milestones</Text>
              {escrow.milestones?.map((m, idx) => (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.milestoneTitle}>{m.title}</Text>
                    {m.evidence_uri && (
                      <Text style={styles.evidenceUri} numberOfLines={1}>
                        Proof: {m.evidence_uri}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.milestoneVal}>${m.amount.toLocaleString()}</Text>
                    <Text style={[styles.statusText, { color: getStatusColor(m.status) }]}>
                      {m.status.toUpperCase()}
                    </Text>

                    {/* Submit Proof Actions */}
                    {(m.status === 'pending' || m.status === 'rejected') && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => setSubmittingMilestoneId(submittingMilestoneId === m.id ? null : m.id)}
                      >
                        <Text style={styles.submitBtnText}>
                          {submittingMilestoneId === m.id ? 'Cancel' : 'Submit Proof'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Inline Proof Form */}
                  {submittingMilestoneId === m.id && (
                    <View style={styles.proofForm}>
                      <TextInput
                        style={styles.input}
                        placeholder="Evidence URL (e.g. GitHub link, report link...)"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={evidenceUrl}
                        onChangeText={setEvidenceUrl}
                      />
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => handleSubmitEvidence(escrow.id, m.id)}
                      >
                        <Text style={styles.btnPrimaryText}>Send Evidence</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.white },
  headerSub: { fontSize: 9, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.green, textTransform: 'uppercase', letterSpacing: 0.5 },
  listContent: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18 },
  escrowCard: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  escrowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 10, marginBottom: 10 },
  escrowTitle: { fontSize: 14, fontFamily: 'Sora-SemiBold', color: COLORS.white },
  escrowSub: { fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  escrowAmount: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.gold },
  milestonesList: { gap: 10 },
  sectionHeader: { fontSize: 11, fontFamily: 'SpaceGrotesk-Bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 },
  milestoneRow: { flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  milestoneTitle: { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: 'rgba(255,255,255,0.8)' },
  evidenceUri: { fontSize: 10, color: COLORS.green, fontFamily: 'SpaceGrotesk-Regular', marginTop: 2 },
  milestoneVal: { fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white },
  statusText: { fontSize: 10, fontFamily: 'SpaceGrotesk-Bold', textTransform: 'uppercase' },
  submitBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginTop: 4 },
  submitBtnText: { fontSize: 10, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white },
  proofForm: { width: '100%', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  input: { backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 8, color: COLORS.white, fontSize: 12, marginBottom: 8, fontFamily: 'SpaceGrotesk-Regular' },
  btnPrimary: { backgroundColor: COLORS.green, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  btnPrimaryText: { fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white }
});
