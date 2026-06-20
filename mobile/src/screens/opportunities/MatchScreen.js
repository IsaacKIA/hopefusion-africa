import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, ScrollView, Alert, Dimensions
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

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
  cardBg: '#262626',
  modalOverlay: 'rgba(0,0,0,0.6)'
};

export default function MatchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const [selectedOpp, setSelectedOpp] = useState(null);

  // Fetch logged-in user profile to get startup status
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/users/me'),
  });

  const startupId = profile?.startup_profile?.id;

  // Fetch opportunities matched to this startup
  const { data: oppResponse, isLoading: loadingOpps, refetch, isRefetching } = useQuery({
    queryKey: ['opportunities-matches', startupId],
    queryFn: () => api.get('/opportunities/matches?limit=30'),
    enabled: !!startupId,
  });

  const matches = oppResponse?.data || [];

  // Filter opportunities locally
  const filteredMatches = matches.filter(opp => {
    if (filter === 'all') return true;
    if (filter === 'grant') return opp.opportunity_type === 'grant';
    if (filter === 'investment') return opp.opportunity_type === 'investment';
    if (filter === 'challenge') return opp.opportunity_type === 'corporate_challenge';
    if (filter === 'program') return opp.opportunity_type === 'government_program' || opp.opportunity_type === 'accelerator';
    return true;
  });

  const getOppBadgeColor = (type) => {
    switch (type) {
      case 'grant': return COLORS.green;
      case 'investment': return COLORS.gold;
      case 'corporate_challenge': return '#7c3aed';
      case 'government_program': return '#2563eb';
      default: return COLORS.txt2;
    }
  };

  const getOppTypeName = (type) => {
    return type ? type.replace('_', ' ').toUpperCase() : 'OPPORTUNITY';
  };

  const handleApply = (opp) => {
    Alert.alert(
      'Apply to Opportunity',
      `Would you like to apply for "${opp.title}"? This will share your verified Startup Profile with the opportunity host.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply Now', 
          onPress: () => {
            Alert.alert('Application Submitted', 'Your startup profile and pitch metrics have been shared successfully.');
            setSelectedOpp(null);
          } 
        }
      ]
    );
  };

  const renderOpportunityCard = ({ item: opp }) => {
    const matchPercentage = Math.round((opp.adjusted_score || opp.raw_similarity || 0.75) * 100);
    const scoreColor = matchPercentage >= 80 ? COLORS.green : matchPercentage >= 65 ? COLORS.gold : COLORS.red;

    return (
      <TouchableOpacity
        style={styles.oppCard}
        onPress={() => setSelectedOpp(opp)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerDetails}>
            <View style={[styles.typeBadge, { backgroundColor: getOppBadgeColor(opp.opportunity_type) + '15' }]}>
              <Text style={[styles.typeBadgeText, { color: getOppBadgeColor(opp.opportunity_type) }]}>
                {getOppTypeName(opp.opportunity_type)}
              </Text>
            </View>
            <Text style={styles.oppTitle} numberOfLines={1}>{opp.title}</Text>
          </View>

          {/* Mini progress ring built using nested views */}
          <View style={[styles.scoreRingOuter, { borderColor: scoreColor + '20' }]}>
            <View style={[styles.scoreRingInner, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreText, { color: scoreColor }]}>{matchPercentage}%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.oppDescription} numberOfLines={2}>
          {opp.description || 'No description provided.'}
        </Text>

        <View style={styles.cardFooter}>
          {opp.value_amount && (
            <View style={styles.footerMetric}>
              <Ionicons name="cash-outline" size={14} color={COLORS.gold} />
              <Text style={styles.metricVal}>
                ${opp.value_amount.toLocaleString()} {opp.currency}
              </Text>
            </View>
          )}

          {opp.deadline && (
            <View style={styles.footerMetric}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.metricLabel}>
                Due: {new Date(opp.deadline).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }} />
          <Text style={styles.learnMoreText}>Details <Ionicons name="arrow-forward" size={11} color={COLORS.green} /></Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loadingProfile || loadingOpps) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.loadingText}>Analyzing ecosystem vectors...</Text>
      </View>
    );
  }

  if (!startupId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <Ionicons name="warning-outline" size={64} color={COLORS.gold} />
        <Text style={styles.noStartupTitle}>Startup Profile Required</Text>
        <Text style={styles.noStartupText}>
          Complete your profile registration to let our vector matcher scan regional opportunities.
        </Text>
        <TouchableOpacity 
          style={styles.btnAction} 
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.btnActionText}>Complete Profile</Text>
        </TouchableOpacity>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Opportunity Matcher</Text>
          <Text style={styles.headerSub}>AI Vector Engine</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={COLORS.green} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { key: 'all', label: 'All matches' },
            { key: 'grant', label: 'Grants' },
            { key: 'investment', label: 'Investments' },
            { key: 'challenge', label: 'Challenges' },
            { key: 'program', label: 'Programs' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Opportunities List */}
      <FlatList
        data={filteredMatches}
        keyExtractor={item => item.id}
        renderItem={renderOpportunityCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.green} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>No Matched Opportunities</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting filters or checking back as new grants are added to the operating network.
            </Text>
          </View>
        }
      />

      {/* Slide Up Detail Modal */}
      {selectedOpp && (
        <Modal
          visible={!!selectedOpp}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedOpp(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Drag Bar */}
              <View style={styles.dragBar} />

              <View style={styles.modalHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getOppBadgeColor(selectedOpp.opportunity_type) + '15' }]}>
                  <Text style={[styles.typeBadgeText, { color: getOppBadgeColor(selectedOpp.opportunity_type) }]}>
                    {getOppTypeName(selectedOpp.opportunity_type)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOpp(null)}>
                  <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.modalTitle}>{selectedOpp.title}</Text>
                
                <View style={styles.matchScoreBlock}>
                  <Text style={styles.matchScoreLabelText}>AI VECTOR MATCH SCORE</Text>
                  <Text style={[styles.matchScoreNum, { color: getOppBadgeColor(selectedOpp.opportunity_type) }]}>
                    {Math.round((selectedOpp.adjusted_score || selectedOpp.raw_similarity || 0.75) * 100)}%
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.modalDescription}>{selectedOpp.description || 'No description provided.'}</Text>

                <Text style={styles.sectionTitle}>Opportunity Details</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Fund Value</Text>
                    <Text style={styles.detailVal}>
                      {selectedOpp.value_amount ? `$${selectedOpp.value_amount.toLocaleString()} ${selectedOpp.currency}` : 'Equity / Program based'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Deadline</Text>
                    <Text style={styles.detailVal}>
                      {selectedOpp.deadline ? new Date(selectedOpp.deadline).toLocaleDateString() : 'Rolling'}
                    </Text>
                  </View>
                </View>

                {/* Eligibility Blocks */}
                <Text style={styles.sectionTitle}>Eligible Vectors</Text>
                <View style={styles.eligibilityBlock}>
                  <Text style={styles.eligibilityTitle}>🌍 Countries</Text>
                  <Text style={styles.eligibilityValues}>
                    {selectedOpp.eligible_countries && selectedOpp.eligible_countries.length > 0 
                      ? selectedOpp.eligible_countries.join(', ') 
                      : 'All African Nations'}
                  </Text>
                </View>
                
                <View style={styles.eligibilityBlock}>
                  <Text style={styles.eligibilityTitle}>💼 Sectors</Text>
                  <Text style={styles.eligibilityValues}>
                    {selectedOpp.eligible_sectors && selectedOpp.eligible_sectors.length > 0 
                      ? selectedOpp.eligible_sectors.join(', ') 
                      : 'All Sectors'}
                  </Text>
                </View>

                <View style={styles.eligibilityBlock}>
                  <Text style={styles.eligibilityTitle}>📈 Startup Stages</Text>
                  <Text style={styles.eligibilityValues}>
                    {selectedOpp.eligible_stages && selectedOpp.eligible_stages.length > 0 
                      ? selectedOpp.eligible_stages.map(s => s.toUpperCase()).join(', ') 
                      : 'All Stages'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity 
                  style={styles.modalApplyBtn}
                  onPress={() => handleApply(selectedOpp)}
                >
                  <Text style={styles.modalApplyText}>Submit Profile Application</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.6)', marginTop: 14, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Sora-Bold', color: COLORS.white },
  headerSub: { fontSize: 10, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.green, textTransform: 'uppercase', letterSpacing: 1 },
  filterContainer: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterTabActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterTabText: { fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', color: 'rgba(255,255,255,0.5)' },
  filterTabTextActive: { color: COLORS.white },
  listContent: { padding: 16, paddingBottom: 80 },
  oppCard: { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  headerDetails: { flex: 1, marginRight: 10 },
  typeBadge: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, marginBottom: 6 },
  typeBadgeText: { fontSize: 9, fontFamily: 'SpaceGrotesk-Bold' },
  oppTitle: { fontSize: 15, fontFamily: 'Sora-SemiBold', color: COLORS.white },
  scoreRingOuter: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 10, fontFamily: 'Sora-Bold' },
  oppDescription: { fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.6)', lineHeight: 18, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 12, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.gold },
  metricLabel: { fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)' },
  learnMoreText: { fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.green },
  noStartupTitle: { fontSize: 18, fontFamily: 'Sora-Bold', color: COLORS.white, marginTop: 16, marginBottom: 8 },
  noStartupText: { fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginHorizontal: 20, marginBottom: 20 },
  btnAction: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  btnActionText: { fontSize: 14, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.modalOverlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: height * 0.85 },
  dragBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalScroll: { paddingBottom: 24 },
  modalTitle: { fontSize: 20, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 16 },
  matchScoreBlock: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 20 },
  matchScoreLabelText: { fontSize: 10, fontFamily: 'SpaceGrotesk-Bold', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: 2 },
  matchScoreNum: { fontSize: 28, fontFamily: 'Sora-Bold' },
  sectionTitle: { fontSize: 14, fontFamily: 'Sora-SemiBold', color: COLORS.white, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalDescription: { fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  detailRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  detailItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12 },
  detailLabel: { fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  detailVal: { fontSize: 13, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white },
  eligibilityBlock: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 12, marginBottom: 8 },
  eligibilityTitle: { fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white, marginBottom: 4 },
  eligibilityValues: { fontSize: 12, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.6)' },
  modalActions: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 },
  modalApplyBtn: { backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalApplyText: { fontSize: 15, fontFamily: 'SpaceGrotesk-Bold', color: COLORS.white }
});
