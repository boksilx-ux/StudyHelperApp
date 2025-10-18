// src/screens/TTSScreen.js
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import Tts from 'react-native-tts';

export default function TTSScreen() {
  const [speaking, setSpeaking] = useState(false);
  const sampleText = '안녕하세요. 플래시카드 학습을 시작합니다.';

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1) TTS 엔진 초기화
        await Tts.getInitStatus();

        // 2) 언어 설정 (실패해도 앱이 죽지 않게 try/catch)
        try {
          await Tts.setDefaultLanguage('ko-KR');
        } catch (e) {
          console.log('[TTS] setDefaultLanguage 실패:', e?.message);
        }

        // 3) 속도/톤 설정
        // - iOS + RN New Architecture 환경에서 setDefaultRate/ setDefaultPitch가
        //   크래시를 낼 수 있어 try/catch로 감싸고, 필요시 건너뜁니다.
        // - 기본값으로도 충분히 사용 가능하니 실패해도 무시.
        try {
          if (Platform.OS === 'android') {
            await Tts.setDefaultRate(0.5);
            await Tts.setDefaultPitch(1.0);
          } else {
            // iOS: 일부 조합에서 BOOL 변환 크래시 → 시도만 하고 실패 시 스킵
            await Tts.setDefaultRate(0.5);
            await Tts.setDefaultPitch(1.0);
          }
        } catch (e) {
          console.log('[TTS] setDefaultRate/setDefaultPitch 스킵:', e?.message);
        }

        // 이벤트 리스너 (상태 동기화)
        Tts.addEventListener('tts-start', () => mounted && setSpeaking(true));
        Tts.addEventListener('tts-finish', () => mounted && setSpeaking(false));
        Tts.addEventListener('tts-cancel', () => mounted && setSpeaking(false));
      } catch (e) {
        console.log('[TTS] 초기화 실패:', e?.message);
        Alert.alert('TTS 초기화 실패', e?.message ?? '알 수 없는 오류');
      }
    };

    init();

    return () => {
      mounted = false;
      Tts.stop();
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
    };
  }, []);

  const startTTS = async () => {
    try {
      // stop() 호출 시 인자 절대 전달하지 않음
      await Tts.stop().catch(() => {}); 
      await Tts.speak(sampleText);
    } catch (e) {
      console.log('[TTS] speak 오류:', e?.message);
      Alert.alert('읽기 실패', e?.message ?? '알 수 없는 오류');
    }
  };

  const stopTTS = async () => {
    try {
      await Tts.stop();   // 현재 실행 중인 음성 정지
      setSpeaking(false);
    } catch (e) {
      console.log('[TTS] stop 오류:', e?.message);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TTS 테스트</Text>
      <Text style={styles.text}>예시 문장: {sampleText}</Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.play]} onPress={startTTS}>
          <Text style={styles.btnText}>{speaking ? '다시 읽기' : '읽기 시작'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.stop]} onPress={stopTTS}>
          <Text style={styles.btnText}>정지</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' && (
        <Text style={styles.hint}>
          iOS 최신 환경에서 속도/톤 설정이 제한될 수 있어요. 기본값으로 읽도록 했습니다.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#F7F7F7' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#111' },
  text: { fontSize: 16, marginBottom: 24, color: '#111' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  play: { backgroundColor: '#16a34a' },
  stop: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { marginTop: 16, color: '#6b7280', fontSize: 12, textAlign: 'center' },
});
