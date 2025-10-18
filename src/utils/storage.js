// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = {
  STUDY: 'progress:study',
  REVIEW: 'progress:review',
};

const SCHEMA_VERSION = 1;

// ---- STUDY 스키마 보장 ----
// 반환 형태: { schemaVersion: number, perCard: { [id]: { history: ('O'|'X'|'?')[] } } }
export async function ensureStudySchema() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY.STUDY);
    if (!raw) {
      const fresh = { schemaVersion: SCHEMA_VERSION, perCard: {} };
      await AsyncStorage.setItem(STORAGE_KEY.STUDY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const perCard =
      parsed && typeof parsed === 'object' && parsed.perCard && typeof parsed.perCard === 'object'
        ? parsed.perCard
        : {};
    const fixed = { schemaVersion: parsed?.schemaVersion ?? SCHEMA_VERSION, perCard };
    if (!parsed?.perCard) {
      await AsyncStorage.setItem(STORAGE_KEY.STUDY, JSON.stringify(fixed));
    }
    return fixed;
  } catch (e) {
    console.log('[Storage] ensureStudySchema 실패:', e);
    return { schemaVersion: SCHEMA_VERSION, perCard: {} };
  }
}

// ---- 저장 ----
export async function saveProgress(type, data) {
  try {
    const key = STORAGE_KEY[type];
    if (!key) return;

    // STUDY는 스키마 형태 유지
    if (type === 'STUDY') {
      const perCard = (data && data.perCard && typeof data.perCard === 'object') ? data.perCard : {};
      const payload = { schemaVersion: SCHEMA_VERSION, perCard };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
      return;
    }

    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.log('[Storage] save 실패:', e);
  }
}

// ---- 불러오기 ----
export async function loadProgress(type) {
  try {
    const key = STORAGE_KEY[type];
    if (!key) return null;

    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      if (type === 'STUDY') return { schemaVersion: SCHEMA_VERSION, perCard: {} };
      return null;
    }
    const parsed = JSON.parse(raw);
    if (type === 'STUDY') {
      const perCard =
        parsed && typeof parsed === 'object' && parsed.perCard && typeof parsed.perCard === 'object'
          ? parsed.perCard
          : {};
      return { schemaVersion: parsed?.schemaVersion ?? SCHEMA_VERSION, perCard };
    }
    return parsed;
  } catch (e) {
    console.log('[Storage] load 실패:', e);
    return type === 'STUDY' ? { schemaVersion: SCHEMA_VERSION, perCard: {} } : null;
  }
}

// ---- 초기화 ----
export async function clearProgress(type) {
  try {
    const key = STORAGE_KEY[type];
    if (!key) return;
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.log('[Storage] clear 실패:', e);
  }
}
