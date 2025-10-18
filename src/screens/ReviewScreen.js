// src/screens/ReviewScreen.js
import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import DefaultCards, { CARDS as NamedCards } from '../data/cards';
import { ensureStudySchema } from '../utils/storage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const pickCards = () => {
  if (Array.isArray(NamedCards) && NamedCards.length) return NamedCards;
  if (Array.isArray(DefaultCards) && DefaultCards.length) return DefaultCards;
  if (DefaultCards && Array.isArray(DefaultCards.CARDS) && DefaultCards.CARDS.length) {
    return DefaultCards.CARDS;
  }
  return [
    { id: 1001, text: '샘플 카드 A', answer: true,  explanation: '샘플 해설 A' },
    { id: 1002, text: '샘플 카드 B', answer: false, explanation: '샘플 해설 B' },
  ];
};

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const onlyIds = Array.isArray(route?.params?.onlyIds) ? route.params.onlyIds : null; // ← 있으면 이번 세션만

  // 헤더: 좌상단 Back 숨김 + 종료(메인으로)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => null,
      gestureEnabled: false,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>종료</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const cards = useMemo(() => pickCards(), []);
  const idSet = useMemo(() => (onlyIds ? new Set(onlyIds) : null), [onlyIds]);

  // 필터링: onlyIds가 있으면 그 카드만, 없으면 전체
  const filtered = useMemo(() => {
    if (!idSet) return cards;
    return cards.filter(c => idSet.has(c.id));
  }, [cards, idSet]);

  const orderedCards = useMemo(
    () => [...filtered].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
    [filtered]
  );

  const [perCard, setPerCard] = useState({});
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpand = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // 저장된 누적 진행 로드
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const study = await ensureStudySchema();
      if (mounted) setPerCard(study.perCard || {});
    })();
    return () => { mounted = false; };
  }, []);

  const renderItem = ({ item, index }) => {
    const entry = perCard[item.id];
    const historyAll = Array.isArray(entry?.history) ? entry.history : [];
    const last10 = historyAll.slice(-10); // ← 화면 표시는 최근 10회만
    const readTotal = entry?.stats?.total ?? historyAll.length;
    const emoji = last10.length ? last10.join(' ') : '—';

    const accuracy = entry?.stats?.accuracy ?? null;
    const accText = accuracy !== null ? ` (${Math.round(accuracy * 100)}%)` : '';

    const open = expanded.has(item.id);

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Text style={styles.number}>#{item.id ?? index + 1}</Text>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.question}>
              {readTotal > 0 ? `[${readTotal}회독] ${emoji}${accText}\n` : ''}
              {item.text}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.lampBtn}>
            <Text style={{ fontSize: 20 }}>{open ? '💡' : '🔅'}</Text>
          </TouchableOpacity>
        </View>

        {open && (
          <View style={styles.explainBox}>
            <Text style={styles.explainText}>{item.explanation || '해설이 없습니다.'}</Text>
          </View>
        )}
      </View>
    );
  };

  const totalReads = Object.values(perCard).reduce(
    (acc, v) => acc + (Array.isArray(v?.history) ? v.history.length : 0),
    0
  );

  // 이번 세션 전용이고, 학습 카드가 0장인 경우 안내
  if (onlyIds && orderedCards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 16, color: '#444' }}>공부한 카드가 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {onlyIds ? `이번 세션 카드 ${orderedCards.length}장` : `카드 ${cards.length}개`} · 누적 학습 {totalReads}회
        </Text>
        <Text style={styles.guide}>#1부터 끝번호까지 아래로 스크롤해 확인하세요. (표시는 최근 10회)</Text>
      </View>

      <FlatList
        data={orderedCards}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  summary: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  summaryText: { fontSize: 15, color: '#111', fontWeight: '600' },
  guide: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  number: { width: 52, fontWeight: '700', color: '#374151', marginTop: 2 },
  question: { fontSize: 15, color: '#111', lineHeight: 22 },

  lampBtn: { paddingHorizontal: 6, paddingVertical: 2 },

  explainBox: {
    marginTop: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
  explainText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
});
