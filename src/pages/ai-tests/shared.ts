import type { AiTest, AiTestStatus } from '../../types';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange';

/** Ro'yxat va detal sahifasi bir xil yorliqlarni ishlatadi. */
export const STATUS_LABELS: Record<AiTestStatus, { label: string; color: BadgeColor }> = {
  queued: { label: 'Navbatda', color: 'gray' },
  running: { label: 'Yaratilmoqda', color: 'blue' },
  completed: { label: 'Tayyor', color: 'green' },
  failed: { label: 'Xato', color: 'red' },
};

/** Ro'yxat shu statuslarda avto-yangilanadi. */
export const ACTIVE_STATUSES: AiTestStatus[] = ['queued', 'running'];

export const MODEL_LABELS: Record<string, { label: string; color: BadgeColor }> = {
  flash: { label: 'Flash', color: 'blue' },
  pro: { label: 'Pro', color: 'purple' },
};

export const SOURCE_LABELS: Record<string, string> = {
  text: 'Matn',
  image: 'Rasm',
  pdf: 'PDF',
};

export const TEST_TYPE_LABELS: Record<string, string> = {
  ai: 'AI tanlaydi',
  facts: 'Faktlar',
  logic: 'Mantiq',
};

export const DIFFICULTY_LABELS: Record<string, { label: string; color: BadgeColor }> = {
  easy: { label: 'Oson', color: 'green' },
  medium: { label: "O'rta", color: 'yellow' },
  hard: { label: 'Qiyin', color: 'red' },
};

export const LANGUAGE_LABELS: Record<string, string> = {
  uz: "O'zbek",
  ru: 'Rus',
  en: 'Ingliz',
};

/** Foydalanuvchini ko'rsatish: ism bo'lsa ism, bo'lmasa username, u ham bo'lmasa id. */
export function userLabel(row: Pick<AiTest, 'username' | 'first_name' | 'last_name' | 'user_id'>): string {
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (row.username) return `@${row.username}`;
  return `#${row.user_id}`;
}

/** Generatsiya davomiyligi: started_at -> finished_at. */
export function testDuration(test: Pick<AiTest, 'started_at' | 'finished_at'>): string {
  if (!test.started_at || !test.finished_at) return '—';
  const ms = new Date(test.finished_at).getTime() - new Date(test.started_at).getTime();
  if (ms < 0) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export function formatMs(ms?: number | null): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}
