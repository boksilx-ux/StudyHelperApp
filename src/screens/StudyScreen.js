// src/screens/StudyScreen.js
import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Dimensions, Animated, Alert, TouchableOpacity } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { useFocusEffect } from '@react-navigation/native';

import DefaultCards, { CARDS as NamedCards } from '../data/cards';
import { ensureStudySchema, saveProgress, loadProgress } from '../utils/storage';

const { width } = Dimensions.get('window');
const PER_CARD_SECONDS = 20;

export default function StudyScreen({ navigation }) {
  // ---- 종료 중 여부 / 타이머 id ----
  const exitingRef = useRef(false);
  const timerIdRef = useRef(null);

  // ---- 이번 세션에서 실제로 학습(분류)된 카드 id 모음 ----
  const sessionTouchedRef = useRef(new Set());

  // ---- 헤더 우측 "종료" 버튼 ----
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              '공부 종료',
              '현재까지 공부한 내용이 저장되고 복습 화면으로 전환됩니다. 계속하시겠습니까?',
              [
                { text: '아니오', style: 'cancel' },
                {
                  text: '네',
                  onPress: () => {
                    // 종료 플래그 + 타이머 정리
                    exitingRef.current = true;
                    if (timerIdRef.current) {
                      clearInterval(timerIdRef.current);
                      timerIdRef.current = null;
                    }
                    // 이번 세션에 학습된 카드 목록만 전달
                    const onlyIds = Array.from(sessionTouchedRef.current);
                    navigation.replace('Review', { onlyIds });
                  },
                },
              ]
            );
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>종료</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ---- 카드 데이터 확보 ----
  const cards = useMemo(() => {
    if (Array.isArray(NamedCards) && NamedCards.length) return NamedCards;
    if (Array.isArray(DefaultCards) && DefaultCards.length) return DefaultCards;
    if (DefaultCards && Array.isArray(DefaultCards.CARDS) && DefaultCards.CARDS.length) {
      return DefaultCards.CARDS;
    }
    console.log('[Study] CARDS 비어있음');
    return [
      { id: 1001, text: '샘플 카드 A', answer: true,  explanation: '샘플 해설 A' },
      { id: 1002, text: '샘플 카드 B', answer: false, explanation: '샘플 해설 B' },
    ];
  }, []);
  const total = cards?.length ?? 0;

  // ---- 진행/화면 상태 ----
  const swiperRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [remain, setRemain] = useState(PER_CARD_SECONDS);
  const [flashColor, setFlashColor] = useState('transparent');
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // 누적 진행 저장 맵: { [cardId]: { history: ('O'|'X'|'?')[], stats: { correct, total, accuracy } } }
  const [studyMap, setStudyMap] = useState({});

  // 세션 카운터
  const [sessionCounts, setSessionCounts] = useState({ O: 0, X: 0, Q: 0 });

  const busyRef = useRef(false);

  // ---- 기존 저장 불러오기(이어하기) ----
  useEffect(() => {
    (async () => {
      const saved = await loadProgress('STUDY');
      if (saved && saved.perCard) setStudyMap(saved.perCard);
      else {
        const fixed = await ensureStudySchema();
        setStudyMap(fixed.perCard || {});
      }
    })();
  }, []);

  // ---- 화면 들어올 때 초기화 ----
  useFocusEffect(
    React.useCallback(() => {
      exitingRef.current = false;
      busyRef.current = false;
      setIndex(0);
      setRemain(PER_CARD_SECONDS);
      setSessionCounts({ O: 0, X: 0, Q: 0 });
      sessionTouchedRef.current = new Set(); // 세션 학습 목록 초기화
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      return () => {
        if (timerIdRef.current) {
          clearInterval(timerIdRef.current);
          timerIdRef.current = null;
        }
        busyRef.current = false;
      };
    }, [])
  );

  // ---- 타이머 ----
  useEffect(() => {
    if (exitingRef.current) return;
    if (index >= total || PER_CARD_SECONDS <= 0) return;

    setRemain(PER_CARD_SECONDS);
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    const t = setInterval(() => {
      if (exitingRef.current) return;
      setRemain((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          timerIdRef.current = null;
          handleTimeout(index);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerIdRef.current = t;

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [index, total]);

  // ---- 시각 피드백 ----
  const markAndFlash = (type) => {
    let color = 'transparent';
    if (type === 'correct') color = '#22c55e88';
    if (type === 'wrong') color = '#ef444488';
    if (type === 'ambiguous') color = '#f59e0b88';
    setFlashColor(color);
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.6, duration: 160, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  // ---- 헬퍼 ----
  const safeCardAt = (i) => (Array.isArray(cards) && i >= 0 && i < total ? cards[i] : undefined);

  const onSwiped = (i) => {
    if (exitingRef.current) return;
    const nextIndex = i + 1;
    setIndex(nextIndex);
    busyRef.current = false;
    if (nextIndex >= total) {
      const onlyIds = Array.from(sessionTouchedRef.current);
      navigation.replace('Review', { onlyIds });
    }
  };

  // ✅ 누적 기록 유틸: 'O' | 'X' | '?'
  // 저장은 "누적 전체"로, 화면 표시는 나중에 최근 10회만
  const pushCardHistory = (cardId, mark /* 'O'|'X'|'?' */) => {
    if (!cardId || exitingRef.current) return;

    // 세션 학습 set에 추가
    sessionTouchedRef.current.add(cardId);

    setStudyMap((prev0) => {
      const prev = (prev0 && typeof prev0 === 'object') ? prev0 : {};
      const prevEntry = prev[cardId] ?? { history: [], stats: { correct: 0, total: 0, accuracy: 0 } };

      // ---- 새 히스토리 (누적, 자르지 않음) ----
      const nextHistory = [...(Array.isArray(prevEntry.history) ? prevEntry.history : []), mark];

      // ---- 누적 통계 ----
      const nextTotal = (prevEntry.stats?.total ?? nextHistory.length - 1) + 1;
      const prevCorrect = prevEntry.stats?.correct ?? prevEntry.history?.filter?.(m => m === 'O')?.length ?? 0;
      const nextCorrect = prevCorrect + (mark === 'O' ? 1 : 0);
      const accuracy = nextTotal > 0 ? nextCorrect / nextTotal : 0;

      const nextPerCard = {
        ...prev,
        [cardId]: {
          history: nextHistory,
          stats: { correct: nextCorrect, total: nextTotal, accuracy },
        },
      };

      saveProgress('STUDY', { perCard: nextPerCard });
      return nextPerCard;
    });

    setSessionCounts((c) => ({
      O: c.O + (mark === 'O' ? 1 : 0),
      X: c.X + (mark === 'X' ? 1 : 0),
      Q: c.Q + (mark === '?' ? 1 : 0),
    }));
  };

  // ---- 처리 로직 ----
  const handleTimeout = (i) => {
    if (exitingRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;

    const card = safeCardAt(i);
    if (!card) { onSwiped(i); return; }

    pushCardHistory(card.id, 'X'); // 시간초과 = 오답
    markAndFlash('wrong');

    setTimeout(() => swiperRef.current?.swipeRight?.(), 30);
  };

  const onSwipedLeft = (i) => {
    if (exitingRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;

    const card = safeCardAt(i);
    if (!card) { onSwiped(i); return; }

    const isCorrect = card.answer === true; // 왼쪽=참
    pushCardHistory(card.id, isCorrect ? 'O' : 'X');
    markAndFlash(isCorrect ? 'correct' : 'wrong');
    onSwiped(i);
  };

  const onSwipedRight = (i) => {
    if (exitingRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;

    const card = safeCardAt(i);
    if (!card) { onSwiped(i); return; }

    const isCorrect = card.answer === false; // 오른쪽=거짓
    pushCardHistory(card.id, isCorrect ? 'O' : 'X');
    markAndFlash(isCorrect ? 'correct' : 'wrong');
    onSwiped(i);
  };

  const onSwipedTop = (i) => {
    if (exitingRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;

    const card = safeCardAt(i);
    if (!card) { onSwiped(i); return; }

    pushCardHistory(card.id, '?'); // 애매
    markAndFlash('ambiguous');
    onSwiped(i);
  };

  // ---- 카드 렌더 ----
  const renderCard = (card) => {
    if (!card) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardText}>{card.text}</Text>
        <View style={styles.hintRow}>
          <Text style={styles.hint}>왼쪽: 참</Text>
          <Text style={styles.hint}>위: 애매</Text>
          <Text style={styles.hint}>오른쪽: 거짓</Text>
        </View>
      </View>
    );
  };

  // ---- 비어있을 때 ----
  if (!Array.isArray(cards) || total === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.center, { padding: 24 }]}>
          <Text style={{ fontSize: 16, color: '#444', textAlign: 'center' }}>
            표시할 플래시 카드가 없습니다.{'\n'}카드 데이터를 추가해 주세요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const safeIndex = Math.min(Math.max(index, 0), total - 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 타이머 */}
      <View style={styles.timerWrap}>
        {index < total ? (
          <Text style={styles.timer}>⏱ {remain}s   (idx {index}/{total - 1})</Text>
        ) : (
          <Text style={styles.timer}>끝!</Text>
        )}
      </View>

      {/* 카드 스와이퍼 */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: width * 0.9, maxWidth: 520, aspectRatio: 3 / 4 }}>
          <Swiper
            key={`swiper-${total}-${safeIndex}`}
            ref={swiperRef}
            cards={cards}
            cardIndex={safeIndex}
            renderCard={renderCard}
            stackSize={3}
            stackSeparation={12}
            backgroundColor="transparent"
            disableBottomSwipe
            onSwipedLeft={onSwipedLeft}
            onSwipedRight={onSwipedRight}
            onSwipedTop={onSwipedTop}
            onSwipedAll={() => {
              const onlyIds = Array.from(sessionTouchedRef.current);
              navigation.replace('Review', { onlyIds });
            }}
            animateCardOpacity
            overlayLabels={{
              left:  { title: '참',   style: { label: styles.overlayLeft,  wrapper: styles.overlayWrap } },
              right: { title: '거짓', style: { label: styles.overlayRight, wrapper: styles.overlayWrap } },
              top:   { title: '애매', style: { label: styles.overlayTop,   wrapper: styles.overlayWrap } },
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: flashColor, opacity: flashOpacity, borderRadius: 16 }]}
          />
        </View>
      </View>

      {/* 하단 진행 요약 */}
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ textAlign: 'center', color: '#555' }}>
          진행: {Math.min(index + 1, total)} / {total}  {'  '}
          O:{sessionCounts.O}  X:{sessionCounts.X}  ?:{sessionCounts.Q}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timerWrap: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  timer: { fontSize: 16, fontWeight: '700', color: '#333' },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardText: { fontSize: 20, textAlign: 'center', lineHeight: 28, color: '#222' },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  hint: { fontSize: 12, color: '#888' },

  overlayWrap: { alignItems: 'center', justifyContent: 'center' },
  overlayLeft:  { borderColor: '#22c55e', color: '#22c55e', borderWidth: 4, fontSize: 28, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  overlayRight: { borderColor: '#ef4444', color: '#ef4444', borderWidth: 4, fontSize: 28, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  overlayTop:   { borderColor: '#f59e0b', color: '#f59e0b', borderWidth: 4, fontSize: 28, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});
