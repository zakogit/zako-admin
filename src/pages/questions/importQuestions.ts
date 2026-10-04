import type { QuestionCreateInput } from '../../types';

/**
 * Savollarni JSON orqali import qilish — sof (pure) mantiq: parse + to'liq tekshiruv + bajaruvchi.
 * UI (ImportQuestionsModal) faqat shu modulni chaqiradi; React/axios'ga bog'liq emas.
 *
 * Yozish yo'li: POST /admin/questions (questions + question_options). Mobil ilova variantlarni
 * question_options'dan o'qiydi, shuning uchun eski /admin/admin-questions JSON-options yo'li ishlatilmaydi.
 *
 * Kontent standarti (AI generatsiya promptidagi bilan bir xil): question_type = 'single',
 * aynan 4 ta variant, aynan bittasi to'g'ri.
 */

export const IMPORT_LIMITS = {
  maxQuestions: 500,
  maxChars: 2_000_000,
  questionTextMin: 5,
  questionTextMax: 1000,
  optionsCount: 4,
  optionTextMax: 300,
  explanationMax: 1000,
} as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const ROOT_KEYS = ['subject', 'subject_id', 'topic', 'topic_id', 'difficulty', 'questions'] as const;
const QUESTION_KEYS = ['question_text', 'difficulty', 'options', 'explanation', 'subject', 'subject_id', 'topic', 'topic_id'] as const;
const OPTION_KEYS = ['option_text', 'is_correct'] as const;

export type IssueCode =
  | 'json_syntax'
  | 'too_large'
  | 'example_untouched'
  | 'root_invalid'
  | 'questions_missing'
  | 'questions_not_array'
  | 'questions_empty'
  | 'too_many_questions'
  | 'question_not_object'
  | 'unknown_field'
  | 'text_invalid'
  | 'text_length'
  | 'difficulty_required'
  | 'difficulty_invalid'
  | 'options_not_array'
  | 'options_count'
  | 'option_not_object'
  | 'option_text_invalid'
  | 'option_text_length'
  | 'option_correct_invalid'
  | 'options_correct_count'
  | 'options_duplicate'
  | 'explanation_invalid'
  | 'explanation_too_long'
  | 'name_invalid'
  | 'id_invalid'
  | 'subject_required'
  | 'subject_not_found'
  | 'subject_ambiguous'
  | 'subject_id_not_found'
  | 'subject_inactive'
  | 'subject_mismatch'
  | 'topic_required'
  | 'topic_not_found'
  | 'topic_ambiguous'
  | 'topic_id_not_found'
  | 'topic_inactive'
  | 'topic_mismatch'
  | 'topic_wrong_subject'
  | 'duplicate_in_file'
  | 'already_exists';

export interface ImportIssue {
  /** 1-based savol raqami; null — butun fayl / umumiy (root) qiymat. */
  index: number | null;
  /** JSON ichidagi joy, masalan `options[2].is_correct` (savol ichida nisbiy). */
  path: string;
  code: IssueCode;
  params?: Record<string, string | number>;
}

export interface RefSubject {
  id: number;
  name: string;
  is_active?: boolean;
}
export interface RefTopic {
  id: number;
  subject_id: number;
  name: string;
  is_active?: boolean;
}
export interface ImportContext {
  subjects: RefSubject[];
  topics: RefTopic[];
}

export interface ParsedQuestion {
  /** 1-based tartib raqami (fayldagi o'rni). */
  index: number;
  payload: QuestionCreateInput;
  /** Foydalanuvchi yozgan asl element — qisman xatoda "qolganlarini" qayta yig'ish uchun. */
  raw: unknown;
}

export type ParseResult =
  | { ok: true; questions: ParsedQuestion[]; defaults: Record<string, unknown> }
  | { ok: false; issues: ImportIssue[] };

// ───────────────────────── yordamchilar ─────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const has = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;
const short = (v: unknown, n = 40) => String(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, n);

/** Taqqoslash kaliti: NFC, kichik harf, apostrof variantlari birlashtirilgan, bo'shliqlar siqilgan. */
export function normKey(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function listNames(names: string[], max = 12): string {
  const shown = names.slice(0, max).join(', ');
  return names.length > max ? `${shown}, …` : shown;
}

/** BOM va ```json … ``` o'rovini olib tashlaydi (AI chat javoblari ko'pincha shunday keladi). */
function cleanInput(raw: string): { text: string; lineOffset: number } {
  let s = raw.replace(/^\uFEFF/, '');
  const lead = s.length - s.trimStart().length;
  let lineOffset = s.slice(0, lead).split('\n').length - 1;
  s = s.trim();
  const fence = s.match(/^```[A-Za-z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/);
  if (fence) {
    s = fence[1];
    lineOffset += 1;
  }
  return { text: s, lineOffset };
}

class JsonStop {
  pos: number;
  message: string;
  constructor(pos: number, message: string) {
    this.pos = pos;
    this.message = message;
  }
}

/**
 * JSON.parse xabarlarida o'rin (position) har doim ham bo'lmaydi (brauzer/Node versiyasiga bog'liq),
 * shuning uchun xato joyini o'zimiz topamiz: qat'iy (RFC 8259) rekursiv tahlilchi, birinchi xatoda to'xtaydi.
 */
function locateJsonError(s: string): { pos: number; message: string } | null {
  let i = 0;
  const n = s.length;
  const fail = (message: string, at = i): never => {
    throw new JsonStop(at, message);
  };
  const eof = () => i >= n;
  const ws = () => {
    while (i < n && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++;
  };
  const str = () => {
    i++; // opening quote
    for (;;) {
      if (eof()) fail('Unterminated string');
      const c = s[i];
      if (c === '"') {
        i++;
        return;
      }
      if (c < ' ') fail('Bad control character in string (write a line break inside a string as \\n)');
      if (c === '\\') {
        const e = s[i + 1];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) fail('Bad Unicode escape', i);
          i += 6;
        } else if (e !== undefined && '"\\/bfnrt'.includes(e)) i += 2;
        else fail('Bad escaped character', i);
      } else i++;
    }
  };
  const num = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i, i + 64));
    if (!m) fail('Bad number');
    else i += m[0].length;
  };
  const value = (): void => {
    ws();
    if (eof()) fail('Unexpected end of JSON input');
    const c = s[i];
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (c === '"') return str();
    if (c === '-' || (c >= '0' && c <= '9')) return num();
    for (const lit of ['true', 'false', 'null']) {
      if (s.startsWith(lit, i)) {
        i += lit.length;
        return;
      }
    }
    fail(`Unexpected token ${JSON.stringify(c)}`);
  };
  const obj = () => {
    i++; // {
    ws();
    if (s[i] === '}') {
      i++;
      return;
    }
    for (;;) {
      ws();
      if (eof()) fail('Unexpected end of JSON input');
      if (s[i] !== '"') fail(`Expected a property name in double quotes, found ${JSON.stringify(s[i])}`);
      str();
      ws();
      if (eof()) fail('Unexpected end of JSON input');
      if (s[i] !== ':') fail("Expected ':' after the property name");
      i++;
      value();
      ws();
      if (eof()) fail('Unexpected end of JSON input');
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === '}') {
        i++;
        return;
      }
      fail("Expected ',' or '}' after the property value");
    }
  };
  const arr = () => {
    i++; // [
    ws();
    if (s[i] === ']') {
      i++;
      return;
    }
    for (;;) {
      value();
      ws();
      if (eof()) fail('Unexpected end of JSON input');
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === ']') {
        i++;
        return;
      }
      fail("Expected ',' or ']' after the array element");
    }
  };
  try {
    value();
    ws();
    if (!eof()) fail('Unexpected data after the end of the JSON value');
    return null;
  } catch (e) {
    if (e instanceof JsonStop) return { pos: e.pos, message: e.message };
    throw e;
  }
}

function syntaxIssue(text: string, lineOffset: number, err: unknown): ImportIssue {
  let message = err instanceof Error ? err.message : String(err);
  let line = 1;
  let column = 1;
  const found = locateJsonError(text);
  if (found) {
    const before = text.slice(0, found.pos).split('\n');
    line = before.length;
    column = before[before.length - 1].length + 1;
    message = found.message;
  } else {
    const lc = message.match(/line (\d+) column (\d+)/);
    if (lc) {
      line = Number(lc[1]);
      column = Number(lc[2]);
    }
  }
  return {
    index: null,
    path: '',
    code: 'json_syntax',
    params: { message: message.replace(/\s*\(line \d+ column \d+\)/, '').slice(0, 160), line: line + lineOffset, column },
  };
}

// ───────────────────────── fan / mavzu aniqlash ─────────────────────────

type Origin = 'question' | 'root';
interface FieldSpec {
  name: unknown;
  id: unknown;
  from: Origin;
}
interface TargetIssue {
  from: Origin;
  path: string;
  code: IssueCode;
  params?: Record<string, string | number>;
}
interface Resolved {
  subject?: RefSubject;
  topic?: RefTopic;
  issues: TargetIssue[];
}

function resolveTarget(subj: FieldSpec, top: FieldSpec, ctx: ImportContext): Resolved {
  const issues: TargetIssue[] = [];
  const push = (from: Origin, path: string, code: IssueCode, params?: Record<string, string | number>) =>
    issues.push({ from, path, code, params });
  const subjectGiven = subj.name !== undefined || subj.id !== undefined;
  const topicGiven = top.name !== undefined || top.id !== undefined;
  const anyQuestion: Origin = subj.from === 'question' || top.from === 'question' ? 'question' : 'root';
  const activeSubjects = ctx.subjects.filter((s) => s.is_active !== false);

  // ── fan
  let subject: RefSubject | undefined;
  let subjectFailed = false;
  if (subjectGiven) {
    let byName: RefSubject | undefined;
    let byId: RefSubject | undefined;
    if (subj.name !== undefined) {
      if (typeof subj.name !== 'string' || subj.name.trim() === '') {
        push(subj.from, 'subject', 'name_invalid');
        subjectFailed = true;
      } else {
        const wanted = normKey(subj.name);
        const matches = ctx.subjects.filter((s) => normKey(s.name) === wanted);
        if (matches.length === 0) {
          push(subj.from, 'subject', 'subject_not_found', {
            value: subj.name.trim().slice(0, 60),
            available: listNames(activeSubjects.map((s) => s.name)) || '—',
          });
          subjectFailed = true;
        } else if (matches.length > 1) {
          push(subj.from, 'subject', 'subject_ambiguous', { value: subj.name.trim().slice(0, 60) });
          subjectFailed = true;
        } else byName = matches[0];
      }
    }
    if (subj.id !== undefined) {
      if (!isId(subj.id)) {
        push(subj.from, 'subject_id', 'id_invalid', { value: short(subj.id) });
        subjectFailed = true;
      } else {
        byId = ctx.subjects.find((s) => s.id === subj.id);
        if (!byId) {
          push(subj.from, 'subject_id', 'subject_id_not_found', { value: subj.id });
          subjectFailed = true;
        }
      }
    }
    if (!subjectFailed && byName && byId && byName.id !== byId.id) {
      push(subj.from, 'subject', 'subject_mismatch', { name: byName.name, id: byId.id });
      subjectFailed = true;
    }
    if (!subjectFailed) subject = byName ?? byId;
  }

  // ── mavzu
  let topic: RefTopic | undefined;
  let topicFailed = false;
  if (topicGiven) {
    let byName: RefTopic | undefined;
    let byId: RefTopic | undefined;
    if (top.name !== undefined) {
      if (typeof top.name !== 'string' || top.name.trim() === '') {
        push(top.from, 'topic', 'name_invalid');
        topicFailed = true;
      } else if (subjectFailed) {
        topicFailed = true; // fan noaniq — mavzu nomini ishonchli aniqlab bo'lmaydi, ortiqcha xabar chiqarmaymiz
      } else {
        const wanted = normKey(top.name);
        const subjectId = subject?.id;
        const pool = subjectId !== undefined ? ctx.topics.filter((t) => t.subject_id === subjectId) : ctx.topics;
        const matches = pool.filter((t) => normKey(t.name) === wanted);
        if (matches.length === 0) {
          push(top.from, 'topic', 'topic_not_found', {
            value: top.name.trim().slice(0, 60),
            subject: subject?.name ?? '',
            available: subject ? listNames(pool.filter((t) => t.is_active !== false).map((t) => t.name)) || '—' : '',
          });
          topicFailed = true;
        } else if (matches.length > 1) {
          push(top.from, 'topic', 'topic_ambiguous', { value: top.name.trim().slice(0, 60) });
          topicFailed = true;
        } else byName = matches[0];
      }
    }
    if (top.id !== undefined) {
      if (!isId(top.id)) {
        push(top.from, 'topic_id', 'id_invalid', { value: short(top.id) });
        topicFailed = true;
      } else {
        byId = ctx.topics.find((t) => t.id === top.id);
        if (!byId) {
          push(top.from, 'topic_id', 'topic_id_not_found', { value: top.id });
          topicFailed = true;
        }
      }
    }
    if (!topicFailed && byName && byId && byName.id !== byId.id) {
      push(top.from, 'topic', 'topic_mismatch', { name: byName.name, id: byId.id });
      topicFailed = true;
    }
    if (!topicFailed) topic = byName ?? byId;
    if (topic && subject && topic.subject_id !== subject.id) {
      push(anyQuestion, 'topic', 'topic_wrong_subject', { topic: topic.name, subject: subject.name });
      topic = undefined;
    }
  }

  // ── fan berilmagan bo'lsa, mavzudan olinadi
  if (!subjectGiven && topic) subject = ctx.subjects.find((s) => s.id === topic.subject_id);

  // ── majburiylik
  if (!subjectGiven && !topicGiven) push('question', 'subject', 'subject_required');
  else if (!subjectGiven && topic && !subject) push('question', 'subject', 'subject_required');
  if (!topicGiven) push('question', 'topic', 'topic_required');

  // ── faollik
  if (subject && subject.is_active === false) push(subj.from, 'subject', 'subject_inactive', { name: subject.name });
  if (topic && topic.is_active === false) push(top.from, 'topic', 'topic_inactive', { name: topic.name });

  return issues.length ? { issues } : { subject, topic, issues };
}

// ───────────────────────── asosiy parse + tekshiruv ─────────────────────────

export function parseQuestionImport(raw: string, ctx: ImportContext, exampleText?: string): ParseResult {
  const fail = (issues: ImportIssue[]): ParseResult => ({ ok: false, issues });

  if (exampleText !== undefined && raw.trim() === exampleText.trim()) {
    return fail([{ index: null, path: '', code: 'example_untouched' }]);
  }
  if (raw.length > IMPORT_LIMITS.maxChars) {
    return fail([{ index: null, path: '', code: 'too_large', params: { max: Math.round(IMPORT_LIMITS.maxChars / 1000) } }]);
  }

  const { text, lineOffset } = cleanInput(raw);
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (e) {
    return fail([syntaxIssue(text, lineOffset, e)]);
  }

  const issues: ImportIssue[] = [];
  let defaults: Record<string, unknown> = {};
  let items: unknown[];

  if (Array.isArray(root)) {
    items = root;
  } else if (isObj(root)) {
    for (const key of Object.keys(root)) {
      if (!(ROOT_KEYS as readonly string[]).includes(key)) {
        issues.push({ index: null, path: key, code: 'unknown_field', params: { field: key, allowed: ROOT_KEYS.join(', ') } });
      }
    }
    if (!has(root, 'questions')) return fail([...issues, { index: null, path: 'questions', code: 'questions_missing' }]);
    if (!Array.isArray(root.questions)) return fail([...issues, { index: null, path: 'questions', code: 'questions_not_array' }]);
    items = root.questions;
    defaults = { ...root };
    delete defaults.questions;
  } else {
    return fail([{ index: null, path: '', code: 'root_invalid' }]);
  }

  if (items.length === 0) return fail([...issues, { index: null, path: 'questions', code: 'questions_empty' }]);
  if (items.length > IMPORT_LIMITS.maxQuestions) {
    return fail([
      ...issues,
      { index: null, path: 'questions', code: 'too_many_questions', params: { max: IMPORT_LIMITS.maxQuestions, actual: items.length } },
    ]);
  }

  // umumiy (root) difficulty — bir marta tekshiriladi
  let rootDifficulty: Difficulty | undefined;
  let rootDifficultyBad = false;
  if (has(defaults, 'difficulty')) {
    const d = defaults.difficulty;
    const norm = typeof d === 'string' ? d.trim().toLowerCase() : '';
    if ((DIFFICULTIES as readonly string[]).includes(norm)) rootDifficulty = norm as Difficulty;
    else {
      rootDifficultyBad = true;
      issues.push({ index: null, path: 'difficulty', code: 'difficulty_invalid', params: { value: short(d), allowed: DIFFICULTIES.join(' | ') } });
    }
  }

  const resolveCache = new Map<string, { resolved: Resolved; users: number[] }>();
  const parsed: ParsedQuestion[] = [];
  const goodForDup: { index: number; key: string }[] = [];

  items.forEach((item, i) => {
    const index = i + 1;
    if (!isObj(item)) {
      issues.push({ index, path: '', code: 'question_not_object' });
      return;
    }
    let bad = false;
    const add = (path: string, code: IssueCode, params?: Record<string, string | number>) => {
      issues.push({ index, path, code, params });
      bad = true;
    };

    for (const key of Object.keys(item)) {
      if (!(QUESTION_KEYS as readonly string[]).includes(key)) add(key, 'unknown_field', { field: key, allowed: QUESTION_KEYS.join(', ') });
    }

    // question_text
    let questionText = '';
    if (typeof item.question_text !== 'string' || item.question_text.trim() === '') add('question_text', 'text_invalid');
    else {
      questionText = item.question_text.trim();
      if (questionText.length < IMPORT_LIMITS.questionTextMin || questionText.length > IMPORT_LIMITS.questionTextMax) {
        add('question_text', 'text_length', { min: IMPORT_LIMITS.questionTextMin, max: IMPORT_LIMITS.questionTextMax, actual: questionText.length });
      }
    }

    // difficulty
    let difficulty: Difficulty | undefined;
    if (has(item, 'difficulty')) {
      const norm = typeof item.difficulty === 'string' ? item.difficulty.trim().toLowerCase() : '';
      if ((DIFFICULTIES as readonly string[]).includes(norm)) difficulty = norm as Difficulty;
      else add('difficulty', 'difficulty_invalid', { value: short(item.difficulty), allowed: DIFFICULTIES.join(' | ') });
    } else if (rootDifficulty) difficulty = rootDifficulty;
    else if (rootDifficultyBad) bad = true; // xato allaqachon root darajasida xabar qilingan
    else add('difficulty', 'difficulty_required');

    // options
    const options: QuestionCreateInput['options'] = [];
    if (!Array.isArray(item.options)) add('options', 'options_not_array');
    else {
      if (item.options.length !== IMPORT_LIMITS.optionsCount) {
        add('options', 'options_count', { expected: IMPORT_LIMITS.optionsCount, actual: item.options.length });
      }
      let correct = 0;
      let allBoolean = true;
      const seen = new Map<string, number>();
      item.options.forEach((opt: unknown, j: number) => {
        const p = `options[${j}]`;
        if (!isObj(opt)) {
          add(p, 'option_not_object');
          allBoolean = false;
          return;
        }
        for (const key of Object.keys(opt)) {
          if (!(OPTION_KEYS as readonly string[]).includes(key)) add(`${p}.${key}`, 'unknown_field', { field: key, allowed: OPTION_KEYS.join(', ') });
        }
        let optionText = '';
        if (typeof opt.option_text !== 'string' || opt.option_text.trim() === '') add(`${p}.option_text`, 'option_text_invalid');
        else {
          optionText = opt.option_text.trim();
          if (optionText.length > IMPORT_LIMITS.optionTextMax) {
            add(`${p}.option_text`, 'option_text_length', { max: IMPORT_LIMITS.optionTextMax, actual: optionText.length });
          }
          const key = normKey(optionText);
          const first = seen.get(key);
          if (first !== undefined) add(`${p}.option_text`, 'options_duplicate', { a: first + 1, b: j + 1 });
          else seen.set(key, j);
        }
        if (typeof opt.is_correct !== 'boolean') {
          add(`${p}.is_correct`, 'option_correct_invalid', { value: opt.is_correct === undefined ? '—' : short(opt.is_correct) });
          allBoolean = false;
        } else if (opt.is_correct) correct++;
        options.push({ option_text: optionText, is_correct: opt.is_correct === true, order_index: j });
      });
      if (allBoolean && correct !== 1) add('options', 'options_correct_count', { actual: correct });
    }

    // explanation (ixtiyoriy)
    let explanation: string | undefined;
    if (has(item, 'explanation') && item.explanation !== null && item.explanation !== '') {
      if (typeof item.explanation !== 'string') add('explanation', 'explanation_invalid');
      else {
        const e = item.explanation.trim();
        if (e.length > IMPORT_LIMITS.explanationMax) add('explanation', 'explanation_too_long', { max: IMPORT_LIMITS.explanationMax, actual: e.length });
        else if (e) explanation = e;
      }
    }

    // fan / mavzu (savolda berilgani umumiyni almashtiradi)
    const pick = (nameKey: string, idKey: string): FieldSpec => {
      const own = has(item, nameKey) || has(item, idKey);
      const src = own ? item : defaults;
      return { name: src[nameKey], id: src[idKey], from: own ? 'question' : 'root' };
    };
    const subj = pick('subject', 'subject_id');
    const top = pick('topic', 'topic_id');
    const specKey = JSON.stringify([subj.name ?? null, subj.id ?? null, subj.from, top.name ?? null, top.id ?? null, top.from]);
    let entry = resolveCache.get(specKey);
    if (!entry) {
      entry = { resolved: resolveTarget(subj, top, ctx), users: [] };
      resolveCache.set(specKey, entry);
    }
    entry.users.push(index);
    const { resolved } = entry;
    if (resolved.issues.length) bad = true; // xabarlar sikl oxirida (bir marta) qo'shiladi

    if (bad || !difficulty || !resolved.subject || !resolved.topic) return;

    const payload: QuestionCreateInput = {
      topic_id: resolved.topic.id,
      subject_id: resolved.subject.id,
      question_text: questionText,
      question_type: 'single',
      difficulty,
      ...(explanation ? { explanation } : {}),
      options,
    };
    parsed.push({ index, payload, raw: item });
    goodForDup.push({ index, key: `${payload.topic_id}|${normKey(questionText)}` });
  });

  // fan/mavzu xabarlari: har bir noyob holat uchun bir marta
  const rootReported = new Set<string>();
  for (const { resolved, users } of resolveCache.values()) {
    for (const it of resolved.issues) {
      if (it.from === 'root') {
        const sig = `${it.path}|${it.code}|${JSON.stringify(it.params ?? {})}`;
        if (rootReported.has(sig)) continue;
        rootReported.add(sig);
        issues.push({ index: null, path: it.path, code: it.code, params: { ...it.params, affected: users.length } });
      } else {
        const extra = users.length - 1;
        issues.push({ index: users[0], path: it.path, code: it.code, params: { ...it.params, ...(extra > 0 ? { also: extra } : {}) } });
      }
    }
  }

  // fayl ichidagi takrorlar
  const firstSeen = new Map<string, number>();
  for (const { index, key } of goodForDup) {
    const first = firstSeen.get(key);
    if (first !== undefined) issues.push({ index, path: 'question_text', code: 'duplicate_in_file', params: { first } });
    else firstSeen.set(key, index);
  }

  if (issues.length) {
    issues.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return fail(issues);
  }
  return { ok: true, questions: parsed, defaults };
}

// ───────────────────────── bazadagi takrorlar ─────────────────────────

/**
 * Har bir mavzu uchun mavjud savol matnlarini olib, import qilinadiganlar bilan solishtiradi.
 * `fetchTopicQuestions` tashqaridan beriladi (API) — shu sabab funksiya sof va test qilinadi.
 */
export async function findExistingDuplicates(
  questions: ParsedQuestion[],
  fetchTopicQuestions: (topicId: number) => Promise<{ id: number | string; question_text: string }[]>
): Promise<ImportIssue[]> {
  const topicIds = [...new Set(questions.map((q) => q.payload.topic_id))];
  const existing = new Map<string, number | string>();
  for (const topicId of topicIds) {
    for (const row of await fetchTopicQuestions(topicId)) {
      if (typeof row.question_text === 'string') existing.set(`${topicId}|${normKey(row.question_text)}`, row.id);
    }
  }
  const issues: ImportIssue[] = [];
  for (const q of questions) {
    const id = existing.get(`${q.payload.topic_id}|${normKey(q.payload.question_text)}`);
    if (id !== undefined) issues.push({ index: q.index, path: 'question_text', code: 'already_exists', params: { id: String(id) } });
  }
  return issues;
}

// ───────────────────────── bajarish ─────────────────────────

export interface ImportOutcome {
  /** Muvaffaqiyatli yaratilgan savollar (1-based indekslar). */
  created: number[];
  failed: { index: number; message: string }[];
  /** Boshlanmagan savollar (to'xtatilgani yoki oldingi xato sababli). */
  notStarted: number[];
}

/**
 * Savollarni parallel (concurrency) yaratadi. Birinchi xatoda yangi so'rov yuborilmaydi;
 * yo'ldagi so'rovlar tugaydi. Natijada nima yaratilgani va nima qolgani aniq qaytariladi.
 */
export async function runImport(
  items: ParsedQuestion[],
  create: (payload: QuestionCreateInput) => Promise<unknown>,
  opts: {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
    shouldStop?: () => boolean;
    messageOf?: (e: unknown) => string;
  } = {}
): Promise<ImportOutcome> {
  const { concurrency = 4, onProgress, shouldStop, messageOf = (e) => (e instanceof Error ? e.message : String(e)) } = opts;
  const created: number[] = [];
  const failed: ImportOutcome['failed'] = [];
  const attempted = new Set<number>();
  let next = 0;

  const worker = async () => {
    while (!shouldStop?.() && failed.length === 0 && next < items.length) {
      const item = items[next++];
      attempted.add(item.index);
      try {
        await create(item.payload);
        created.push(item.index);
      } catch (e) {
        failed.push({ index: item.index, message: messageOf(e) });
      }
      onProgress?.(created.length, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, worker));

  created.sort((a, b) => a - b);
  return { created, failed, notStarted: items.map((q) => q.index).filter((idx) => !attempted.has(idx)) };
}

/** Import qilinmagan elementlardan yangi JSON matni (umumiy fan/mavzu/difficulty saqlanadi). */
export function buildRemainingJson(defaults: Record<string, unknown>, rawItems: unknown[]): string {
  return JSON.stringify({ ...defaults, questions: rawItems }, null, 2);
}

// ───────────────────────── namuna ─────────────────────────

/**
 * Namunadagi fan/mavzu nomlari ATAYIN mavjud emas: o'zgartirilmagan matn tasodifan import qilinib
 * ketmasin (tekshiruv "fan topilmadi" yoki "namuna o'zgartirilmagan" deydi).
 */
export function buildExample(): string {
  return JSON.stringify(
    {
      subject: 'Fan nomi',
      topic: 'Mavzu nomi',
      questions: [
        {
          question_text: '2x + 6 = 14 tenglamada x nechaga teng?',
          difficulty: 'easy',
          options: [
            { option_text: '2', is_correct: false },
            { option_text: '4', is_correct: true },
            { option_text: '6', is_correct: false },
            { option_text: '8', is_correct: false },
          ],
          explanation: '2x = 14 - 6 = 8, demak x = 4.',
        },
        {
          question_text: 'Quyidagi sonlardan qaysi biri tub son hisoblanadi?',
          difficulty: 'medium',
          options: [
            { option_text: '9', is_correct: false },
            { option_text: '15', is_correct: false },
            { option_text: '17', is_correct: true },
            { option_text: '21', is_correct: false },
          ],
        },
      ],
    },
    null,
    2
  );
}
