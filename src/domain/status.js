// src/domain/status.js

// 상태 키(필요 시 자유롭게 확장)
export const STATUSES = {
  CORRECT: 'correct',
  WRONG: 'wrong',
  AMBIGUOUS: 'ambiguous',
  SAVED: 'saved',   // 저장카드 등 확장 가능
  BASE: 'base',     // 미분류/미학습
};

// 라벨/색상 메타데이터(화면은 이것만 참조)
export const STATUS_META = {
  [STATUSES.CORRECT]:   { label: '정답',   bg: '#dcfce7', fg: '#166534' },
  [STATUSES.WRONG]:     { label: '오답',   bg: '#fee2e2', fg: '#991b1b' },
  [STATUSES.AMBIGUOUS]: { label: '애매',   bg: '#fef3c7', fg: '#92400e' },
  [STATUSES.SAVED]:     { label: '저장',   bg: '#e0e7ff', fg: '#3730a3' },
  [STATUSES.BASE]:      { label: '미분류', bg: '#e5e7eb', fg: '#374151' },
};

export const getStatusMeta = (key) => STATUS_META[key] ?? STATUS_META[STATUSES.BASE];
