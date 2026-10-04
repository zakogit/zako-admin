import type { TFunction } from 'i18next';
import { getIntlLocale } from '../../i18n';
import type { AiTest, AiTestStatus } from '../../types';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange';

/**
 * `t` of `useTranslation('aiTests')`. Label helpers below take it as an argument and
 * resolve the text when a component renders, never at module load time.
 */
export type AiTestsT = TFunction<'aiTests'>;

type Label = (t: AiTestsT) => string;
interface BadgeMeta {
  color: BadgeColor;
  label: Label;
}

/** Ro'yxat va detal sahifasi bir xil yorliqlarni ishlatadi. */
const STATUS_META: Record<AiTestStatus, BadgeMeta> = {
  queued: { color: 'gray', label: (t) => t('aiTests:status.queued') },
  running: { color: 'blue', label: (t) => t('aiTests:status.running') },
  completed: { color: 'green', label: (t) => t('aiTests:status.completed') },
  failed: { color: 'red', label: (t) => t('aiTests:status.failed') },
};

/** Ro'yxat shu statuslarda avto-yangilanadi. */
export const ACTIVE_STATUSES: AiTestStatus[] = ['queued', 'running'];

// "Flash" / "Pro" are product tier names — they are not translated.
const MODEL_META: Record<string, BadgeMeta> = {
  flash: { color: 'blue', label: () => 'Flash' },
  pro: { color: 'purple', label: () => 'Pro' },
};

const SOURCE_LABEL: Record<string, Label> = {
  text: (t) => t('aiTests:sourceType.text'),
  image: (t) => t('aiTests:sourceType.image'),
  pdf: () => 'PDF',
};

const TEST_TYPE_LABEL: Record<string, Label> = {
  ai: (t) => t('aiTests:testType.ai'),
  facts: (t) => t('aiTests:testType.facts'),
  logic: (t) => t('aiTests:testType.logic'),
};

const DIFFICULTY_META: Record<string, BadgeMeta> = {
  easy: { color: 'green', label: (t) => t('aiTests:difficulty.easy') },
  medium: { color: 'yellow', label: (t) => t('aiTests:difficulty.medium') },
  hard: { color: 'red', label: (t) => t('aiTests:difficulty.hard') },
};

const LANGUAGE_LABEL: Record<string, Label> = {
  uz: (t) => t('aiTests:language.uz'),
  ru: (t) => t('aiTests:language.ru'),
  en: (t) => t('aiTests:language.en'),
};

/** Filtr ro'yxatlari uchun qiymatlar (yorliqlar render vaqtida tarjima qilinadi). */
export const STATUS_VALUES = Object.keys(STATUS_META) as AiTestStatus[];
export const MODEL_VALUES = Object.keys(MODEL_META);
export const SOURCE_VALUES = Object.keys(SOURCE_LABEL);

/** Noma'lum qiymat kelsa — xom qiymatning o'zi va kulrang nishon. */
function badgeInfo(
  meta: Record<string, BadgeMeta>,
  t: AiTestsT,
  value: string,
): { label: string; color: BadgeColor } {
  const m = meta[value];
  return m ? { label: m.label(t), color: m.color } : { label: value, color: 'gray' };
}

export const statusInfo = (t: AiTestsT, status: string) => badgeInfo(STATUS_META, t, status);
export const modelInfo = (t: AiTestsT, model: string) => badgeInfo(MODEL_META, t, model);
export const difficultyInfo = (t: AiTestsT, difficulty: string) =>
  badgeInfo(DIFFICULTY_META, t, difficulty);

export const sourceLabel = (t: AiTestsT, source: string): string =>
  SOURCE_LABEL[source]?.(t) ?? source;
export const testTypeLabel = (t: AiTestsT, type: string): string =>
  TEST_TYPE_LABEL[type]?.(t) ?? type;
export const languageLabel = (t: AiTestsT, language: string): string =>
  LANGUAGE_LABEL[language]?.(t) ?? language;

/** Foydalanuvchini ko'rsatish: ism bo'lsa ism, bo'lmasa username, u ham bo'lmasa id. */
export function userLabel(row: Pick<AiTest, 'username' | 'first_name' | 'last_name' | 'user_id'>): string {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (row.username) return `@${row.username}`;
  return `#${row.user_id}`;
}

/** Generatsiya davomiyligi: started_at -> finished_at. */
export function testDuration(t: AiTestsT, test: Pick<AiTest, 'started_at' | 'finished_at'>): string {
  if (!test.started_at || !test.finished_at) return '—';
  const ms = new Date(test.finished_at).getTime() - new Date(test.started_at).getTime();
  if (ms < 0) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return t('aiTests:units.sec', { value: sec });
  return t('aiTests:units.minSec', { min: Math.floor(sec / 60), sec: sec % 60 });
}

export function formatMs(t: AiTestsT, ms?: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return t('aiTests:units.ms', { value: ms });
  const seconds = new Intl.NumberFormat(getIntlLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ms / 1000);
  return t('aiTests:units.sec', { value: seconds });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(getIntlLocale());
}
