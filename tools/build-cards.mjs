// tools/build-cards.mjs
import { parse } from 'csv-parse/sync';
import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';

const SRC_DIR = path.resolve('src/data/csv');                 
const OUT_DIR = path.resolve('src/data/generated');       
const OUT_ALL = path.join(OUT_DIR, 'cards.json');         
const OUT_IDX = path.join(OUT_DIR, 'index.json');         

await fs.ensureDir(SRC_DIR);
await fs.ensureDir(OUT_DIR);

// data/csv 안의 모든 .csv 파일 수집
const csvFiles = await glob('*.csv', { cwd: SRC_DIR, absolute: true });
if (csvFiles.length === 0) {
  console.log('⚠️ data/csv 폴더에 CSV가 없습니다.');
  process.exit(0);
}

// CSV → 행(row) 누적
let rows = [];
for (const file of csvFiles) {
  const raw = await fs.readFile(file, 'utf8');
  const recs = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  rows.push(...recs);
}

// answer 정규화
const toBool = (v) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (['true','t','1','o','○','ㅇ','정답','맞다','참','y','yes'].includes(s)) return true;
  if (['false','f','0','x','✗','오답','틀림','거짓','n','no'].includes(s)) return false;
  if (s === 'true') return true;
  if (s === 'false') return false;
  return null;
};

// 정리/검증/중복 처리
const errors = [];
const cards = [];
const seenRowKey = new Set();     // (source|id) or (source|text:...) 로 CSV 행 중복 방지
const usedIds = new Set();        // 최종 cards의 id가 전역 유일하도록 관리
let autoId = 1;

const makeKey = (rec) => {
  const source = (rec.source ?? '').toString().trim();
  const id = (rec.id ?? '').toString().trim();
  if (id) return `${source}|${id}`;
  const text = (rec.text ?? '').toString().trim();
  return `${source}|text:${text}`;
};

for (const [i, rec] of rows.entries()) {
  const rowNo = i + 2; // 헤더 다음줄 기준
  const text = (rec.text ?? '').toString().trim();
  const ans = toBool(rec.answer);

  if (!text || ans === null) {
    errors.push({ row: rowNo, reason: '필수값 누락(text 또는 answer 불명확)', rec });
    continue;
  }

  const rowKey = makeKey(rec);
  if (seenRowKey.has(rowKey)) continue;
  seenRowKey.add(rowKey);

  // 원본 id 파싱
  let id = null;
  if (rec.id !== undefined && rec.id !== null && String(rec.id).trim() !== '') {
    const n = Number(rec.id);
    id = Number.isFinite(n) && n > 0 ? n : null;
  }
  // 전역 유일성 보장: 이미 사용된 id면 새 id 부여
  if (id == null || usedIds.has(id)) {
    while (usedIds.has(autoId)) autoId++;
    id = autoId++;
  }
  usedIds.add(id);

  const card = {
    id,
    text,
    answer: ans,
    explanation: (rec.explanation ?? '').toString().trim() || '',
    // 메타
    source: (rec.source ?? '').toString().trim() || '',
    year: rec.year ? Number(rec.year) : null,
    topic: (rec.topic ?? '').toString().trim() || '',
    subtopic: (rec.subtopic ?? '').toString().trim() || '',
    index1: (rec.index1 ?? '').toString().trim() || '',
    index2: (rec.index2 ?? '').toString().trim() || '',
    // 참고용으로 원본 id도 남기고 싶다면 아래 주석 해제
    // originalId: (rec.id ?? null),
  };

  cards.push(card);
}

// id 기준 정렬
cards.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

// JSON 출력
await fs.writeJson(OUT_ALL, cards, { spaces: 2 });

// 통계/오류 리포트
const stats = {
  files: csvFiles.map(f => path.basename(f)),
  total: cards.length,
  bySource: Object.fromEntries(
    Object.entries(cards.reduce((acc, c) => {
      const k = c.source || '(빈값)';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])
  ),
  byTopic: Object.fromEntries(
    Object.entries(cards.reduce((acc, c) => {
      const k = c.topic || '(빈값)';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])
  ),
  errors,
};

await fs.writeJson(OUT_IDX, stats, { spaces: 2 });

console.log(`✅ 카드 ${cards.length}건 → ${OUT_ALL}`);
if (errors.length) {
  console.log(`⚠️ 변환 경고 ${errors.length}건 → ${OUT_IDX}에서 상세 확인`);
}
