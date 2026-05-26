import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { green:'#2DB562', gold:'#E8A020', red:'#E02020', black:'#1A1A1A', white:'#fff', bg:'#F4F5F7', text:'#3D3D3D', txt2:'#6b6b6b' };

export default function MatchesScreen({ navigation }) {
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(70);
  const [filter,   setFilter]   = useState('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches', minScore, filter],
    queryFn:  () => api.get(`/matches/my?min_score=${minScore}&limit=50`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/matches/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['matches']),
  });

  const renderMatch = ({ item: match }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MatchDetail', { match })}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={[styles.logo, { backgroundColor: scoreColor(match.ai_score) }]}>
          <Text style={styles.logoText}>{(match.investor_detail?.first_name?.[0] || 'I')}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {match.investor_detail?.first_name} {match.investor_detail?.last_name}
          </Text>
          <Text style={styles.cardSub}>{match.investor_detail?.firm_name || 'Impact Investor'}</Text>
          <View style={styles.tagRow}>
            {match.investor_detail?.sectors?.slice(0,2).map((s,i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
            ))}
          </View>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={[styles.score, { color: scoreColor(match.ai_score) }]}>{match.ai_score}%</Text>
          <Text style={styles.scoreLbl}>match</Text>
        </View>
      </View>

      {match.ai_reasons?.[0] && (
        <View style={styles.reasonBox}>
          <Ionicons name="sparkles" size={13} color={COLORS.green} />
          <Text style={styles.reasonText} numberOfLines={2}>{match.ai_reasons[0]}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'contacted' })}
        >
          <Text style={styles.actionBtnTextWhite}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'saved' })}
        >
          <Ionicons name="bookmark-outline" size={16} color={COLORS.txt2} />
          <Text style={styles.actionBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => updateStatus.mutate({ id: match.id, status: 'declined' })}
        >
          <Text style={styles.actionBtnText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  function scoreColor(s) {
    if (s >= 90) return COLORS.green;
    if (s >= 75) return COLORS.gold;
    return COLORS.red;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Matches</Text>
        <Text style={styles.sub}>{data?.count || 0} investors matched to your startup</Text>
      </View>

      <View style={styles.filters}>
        {['all','90+','saved','contacted'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter===f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); if (f==='90+') setMinScore(90); else setMinScore(70); }}
          >
            <Text style={[styles.filterText, filter===f && styles.filterTextActive]}>
              {f==='all'?'All':f==='90+'?'90%+ match':f.charAt(0).toUpperCase()+f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.green} /></View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={i => i.id}
          renderItem={renderMatch}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.green} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flash-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Complete your startup profile to get AI-matched with investors.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: COLORS.bg },
  header:              { backgroundColor: COLORS.black, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  title:               { fontSize: 24, fontFamily: 'Sora-Bold', color: COLORS.white, marginBottom: 4 },
  sub:                 { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'SpaceGrotesk-Regular' },
  filters:             { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn:           { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: '#e4e4e4' },
  filterBtnActive:     { backgroundColor: COLORS.green, borderColor: COLORS.green },
  filterText:          { fontSize: 12.5, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.txt2 },
  filterTextActive:    { color: COLORS.white },
  loading:             { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:                { backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 14, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardTop:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  logo:                { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoText:            { fontSize: 18, fontFamily: 'Sora-Bold', color: COLORS.white },
  cardInfo:            { flex: 1 },
  cardName:            { fontSize: 15, fontFamily: 'Sora-SemiBold', color: '#111', marginBottom: 3 },
  cardSub:             { fontSize: 12, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular', marginBottom: 6 },
  tagRow:              { flexDirection: 'row', gap: 6 },
  tag:                 { backgroundColor: '#E9F9EF', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  tagText:             { fontSize: 11, color: '#0f5233', fontFamily: 'SpaceGrotesk-Medium' },
  scoreWrap:           { alignItems: 'center' },
  score:               { fontSize: 22, fontFamily: 'Sora-Bold' },
  scoreLbl:            { fontSize: 10, color: COLORS.txt2, fontFamily: 'SpaceGrotesk-Regular' },
  reasonBox:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E9F9EF', borderRadius: 8, padding: 10, marginBottom: 14 },
  reasonText:          { flex: 1, fontSize: 12.5, color: '#0f5233', fontFamily: 'SpaceGrotesk-Regular', lineHeight: 18 },
  actions:             { flexDirection: 'row', gap: 10 },
  actionBtn:           { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  actionBtnPrimary:    { backgroundColor: COLORS.green },
  actionBtnOutline:    { borderWidth: 1.5, borderColor: '#e4e4e4', backgroundColor: COLORS.white },
  actionBtnTextWhite:  { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.white },
  actionBtnText:       { fontSize: 13, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.txt2 },
  empty:               { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle:          { fontSize: 18, fontFamily: 'Sora-SemiBold', color: '#111', marginTop: 16, marginBottom: 8 },
  emptySub:            { fontSize: 14, color: COLORS.txt2, textAlign: 'center', lineHeight: 20, fontFamily: 'SpaceGrotesk-Regular' },
});
