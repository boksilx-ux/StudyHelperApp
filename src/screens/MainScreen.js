// src/screens/MainScreen.js
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DefaultCards, { CARDS as NamedCards } from '../data/cards';
import { loadProgress, ensureStudySchema, summarizeStudy } from '../utils/storage';

const pickCards = () => {
  if (Array.isArray(NamedCards) && NamedCards.length) return NamedCards;
  if (Array.isArray(DefaultCards) && DefaultCards.length) return DefaultCards;
  if (DefaultCards && Array.isArray(DefaultCards.CARDS) && DefaultCards.CARDS.length) {
    return DefaultCards.CARDS;
  }
  return [];
};

export default function MainScreen({ navigation }) {
  const [metrics, setMetrics] = useState({ accuracy: 0, seen: 0, total: 0, wrong: 0, ambiguous: 0 });

  const refresh = async () => {
    const allCards = pickCards();
    const total = allCards.length;

    // 저장된 진행 스키마 보정
    const study = await ensureStudySchema(); // 없으면 null
    if (!study) {
      setMetrics({ accuracy: 0, seen: 0, total, wrong: 0, ambiguous: 0 });
      return;
    }

    const sum = summarizeStudy(study.perCard ?? {}, total);
    setMetrics({
      accuracy: sum.accuracy,
      seen: sum.seen,
      total: sum.total,
      wrong: sum.wrong,
      ambiguous: sum.ambiguous,
    });
  };

  useEffect(() => { refresh(); }, []);
  useFocusEffect(React.useCallback(() => { refresh(); }, []));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Text style={styles.settingsText}>설정</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerBox}>
        <Text style={styles.metric}>정답률: {metrics.accuracy}%</Text>
        <Text style={styles.metric}>진도: {metrics.seen} / {metrics.total}</Text>
        <Text style={styles.metric}>복습량(오답·애매): {metrics.wrong + metrics.ambiguous}</Text>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Study')}>
          <Text style={styles.actionText}>공부</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Review')}>
          <Text style={styles.actionText}>복습</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TTS')}>
          <Text style={styles.actionText}>TTS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  topRow: { padding: 16, alignItems: 'flex-start' },
  settingsBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e5e7eb', borderRadius: 8 },
  settingsText: { fontWeight: '700', color: '#111' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  metric: { fontSize: 18, color: '#111' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-evenly', padding: 16, paddingBottom: 28 },
  actionBtn: { backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
