import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { questionsApi, subjectsApi, topicsApi } from '../../api/services';
import { Button, Modal } from '../../components/ui';
import {
  IMPORT_LIMITS,
  buildExample,
  buildRemainingJson,
  findExistingDuplicates,
  parseQuestionImport,
  runImport,
  type ImportContext,
  type ImportIssue,
} from './importQuestions';

const MAX_SHOWN_ISSUES = 50;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Kamida bitta savol qo'shilgach chaqiriladi (ro'yxat/statistikani yangilash uchun). */
  onImported: () => void;
}

/** Fan va mavzularning to'liq ro'yxati (nofaollari ham) — nom bo'yicha aniqlash va ko'rsatma uchun. */
async function loadContext(): Promise<ImportContext> {
  const subjectsRes = await subjectsApi.getAll({ include_inactive: true });
  const rawSubjects = Array.isArray(subjectsRes.data?.data) ? subjectsRes.data.data : [];
  const subjects = rawSubjects.map((s) => ({ id: Number(s.id), name: String(s.name), is_active: s.is_active }));

  const topics: ImportContext['topics'] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await topicsApi.getAll({ page, limit: 500, include_inactive: true });
    const body = res.data?.data;
    const rows = Array.isArray(body?.data) ? body.data : [];
    for (const t of rows) topics.push({ id: Number(t.id), subject_id: Number(t.subject_id), name: String(t.name), is_active: t.is_active });
    if (rows.length === 0 || topics.length >= (body?.total ?? 0)) break;
  }
  return { subjects, topics };
}

/** Mavzudagi mavjud savollar (takrorni aniqlash uchun). */
async function fetchTopicQuestions(topicId: number) {
  const rows: { id: number | string; question_text: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await questionsApi.getAll({ page, limit: 1000, topic_id: topicId });
    const body = res.data?.data;
    const pageRows = Array.isArray(body?.data) ? body.data : [];
    rows.push(...pageRows);
    if (pageRows.length === 0 || rows.length >= (body?.total ?? 0)) break;
  }
  return rows;
}

const messageOf = (e: unknown): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || 'Error';
};

type Phase = 'idle' | 'checking' | 'duplicates' | 'importing';

interface PartialResult {
  created: number;
  left: number;
  firstError?: { index: number; message: string };
  remainingJson: string;
}

export default function ImportQuestionsModal(props: Props) {
  // Dialog har safar ochilganda qayta yaratiladi — holat (matn, xatolar, natija) o'z-o'zidan tozalanadi.
  return props.open ? <ImportDialog {...props} /> : null;
}

function ImportDialog({ onClose, onImported }: Props) {
  const { t } = useTranslation('questions');
  const example = useMemo(() => buildExample(), []);
  const [text, setText] = useState(example);
  const [phase, setPhase] = useState<Phase>('idle');
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [partial, setPartial] = useState<PartialResult | null>(null);
  const [catalog, setCatalog] = useState<ImportContext | null>(null);
  const stopRef = useRef(false);
  const busy = phase !== 'idle';

  useEffect(() => {
    let cancelled = false;
    loadContext()
      .then((ctx) => {
        if (!cancelled) setCatalog(ctx);
      })
      .catch(() => {
        if (!cancelled) toast.error(t('import.toast.loadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleClose = () => {
    stopRef.current = true; // davom etayotgan import bo'lsa, yangi so'rov yuborilmaydi
    onClose();
  };

  const issueMessage = (issue: ImportIssue): string => {
    const p = issue.params ?? {};
    const key = issue.code === 'topic_not_found' && !p.subject ? 'topic_not_found_any' : issue.code;
    let msg = t(`import.errors.${key}`, p);
    if (typeof p.also === 'number') msg += ' ' + t('import.issues.also', { count: p.also });
    if (typeof p.affected === 'number' && p.affected > 1) msg += ' ' + t('import.issues.affected', { count: p.affected });
    return msg;
  };

  const handleImport = async () => {
    setIssues([]);
    setPartial(null);
    stopRef.current = false;

    // 1) fan/mavzular (yangi nusxa) + butun JSON'ni tekshirish
    setPhase('checking');
    let ctx: ImportContext;
    try {
      ctx = await loadContext();
      setCatalog(ctx);
    } catch {
      toast.error(t('import.toast.loadFailed'));
      setPhase('idle');
      return;
    }
    const parsed = parseQuestionImport(text, ctx, example);
    if (!parsed.ok) {
      setIssues(parsed.issues);
      setPhase('idle');
      return;
    }

    // 2) bazadagi savollar bilan takrorni tekshirish
    setPhase('duplicates');
    let duplicates: ImportIssue[];
    try {
      duplicates = await findExistingDuplicates(parsed.questions, fetchTopicQuestions);
    } catch {
      toast.error(t('import.toast.duplicatesFailed'));
      setPhase('idle');
      return;
    }
    if (duplicates.length) {
      setIssues(duplicates);
      setPhase('idle');
      return;
    }

    // 3) hammasi to'g'ri — tizimga qo'shamiz
    setPhase('importing');
    setProgress({ done: 0, total: parsed.questions.length });
    const outcome = await runImport(parsed.questions, (payload) => questionsApi.createWithOptions(payload), {
      onProgress: (done, total) => setProgress({ done, total }),
      shouldStop: () => stopRef.current,
      messageOf,
    });
    setPhase('idle');
    if (outcome.created.length) onImported();

    if (outcome.failed.length === 0 && outcome.notStarted.length === 0) {
      toast.success(t('import.result.success', { count: outcome.created.length }));
      onClose();
      return;
    }
    const remaining = parsed.questions.filter((q) => !outcome.created.includes(q.index));
    setPartial({
      created: outcome.created.length,
      left: remaining.length,
      firstError: outcome.failed[0],
      remainingJson: buildRemainingJson(
        parsed.defaults,
        remaining.map((q) => q.raw)
      ),
    });
  };

  const codeCls = 'rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-700';
  const rule = (key: string, count?: number) => (
    <li>
      <Trans
        i18nKey={`questions:import.rules.${key}`}
        count={count}
        values={{ max: IMPORT_LIMITS.maxQuestions }}
        components={{ c: <code className={codeCls} /> }}
      />
    </li>
  );

  const shown = issues.slice(0, MAX_SHOWN_ISSUES);
  const phaseLabel =
    phase === 'checking'
      ? t('import.checking')
      : phase === 'duplicates'
        ? t('import.checkingDuplicates')
        : phase === 'importing'
          ? t('import.importing', { done: progress.done, total: progress.total })
          : '';

  return (
    <Modal open onClose={handleClose} title={t('import.title')} size="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('import.description')}</p>

        <details className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">{t('import.formatTitle')}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-400">
            {rule('root')}
            {rule('question', IMPORT_LIMITS.optionsCount)}
            {rule('explanation')}
            {rule('overrides')}
            {rule('names')}
            {rule('limits')}
          </ul>
        </details>

        <details className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">{t('import.catalog.title')}</summary>
          {!catalog ? (
            <p className="mt-2 text-gray-500">{t('common:state.loading')}</p>
          ) : catalog.subjects.length === 0 ? (
            <p className="mt-2 text-gray-500">{t('import.catalog.empty')}</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-gray-600 dark:text-gray-400">
              {catalog.subjects.map((s) => (
                <li key={s.id} className={s.is_active === false ? 'opacity-60' : ''}>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span> <span className="text-xs text-gray-400">#{s.id}</span>
                  {': '}
                  {catalog.topics
                    .filter((tp) => tp.subject_id === s.id)
                    .map((tp) => `${tp.name} (#${tp.id})`)
                    .join(', ') || '—'}
                </li>
              ))}
            </ul>
          )}
        </details>

        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            // namuna o'zgartirilmagan bo'lsa, fokusda hammasi tanlanadi — shunchaki o'z JSON'ingizni joylashtirasiz
            onFocus={(e) => {
              if (text === example) e.currentTarget.select();
            }}
            disabled={busy}
            spellCheck={false}
            wrap="off"
            rows={16}
            aria-label={t('import.textLabel')}
            className="w-full resize-y overflow-x-auto rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <button type="button" disabled={busy} onClick={() => setText(example)} className="text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400">
              {t('import.useExample')}
            </button>
          </div>
        </div>

        {issues.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" /> {t('import.issues.title', { count: issues.length })}
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm text-red-800 dark:text-red-300">
              {shown.map((issue, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 h-fit shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium dark:bg-red-900/40">
                    {issue.index === null ? t('import.issues.general') : t('import.issues.question', { number: issue.index })}
                  </span>
                  <span>
                    {issue.path && <code className="mr-1 font-mono text-xs opacity-80">{issue.path}</code>}
                    {issueMessage(issue)}
                  </span>
                </li>
              ))}
            </ul>
            {issues.length > shown.length && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-400">{t('import.issues.more', { count: issues.length - shown.length, shown: shown.length })}</p>
            )}
          </div>
        )}

        {phase !== 'idle' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">{phaseLabel}</p>
            {phase === 'importing' && (
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div className="h-full bg-primary-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            )}
          </div>
        )}

        {partial && (
          <div role="alert" className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> {t('import.result.partialTitle')}
            </div>
            <p>{t('import.result.partialBody', { done: partial.created, left: partial.left })}</p>
            <p>
              {partial.firstError
                ? t('import.result.firstError', { number: partial.firstError.index, message: partial.firstError.message })
                : t('import.result.stopped')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setText(partial.remainingJson);
                setPartial(null);
              }}
            >
              {t('import.result.useRemaining')}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          {phase === 'importing' ? (
            <Button type="button" variant="outline" onClick={() => (stopRef.current = true)}>
              {t('import.stop')}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
              {t('common:actions.cancel')}
            </Button>
          )}
          <Button type="button" onClick={handleImport} loading={busy} disabled={text.trim() === ''}>
            {t('import.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
