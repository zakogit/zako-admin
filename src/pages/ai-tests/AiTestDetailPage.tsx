import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft, RefreshCw, Undo2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { aiTestsApi } from '../../api/services';
import type { AiTestQuestion } from '../../types';
import { Card, Badge, Button, Modal, Spinner, Table, EmptyState } from '../../components/ui';
import {
  ACTIVE_STATUSES,
  statusInfo,
  modelInfo,
  difficultyInfo,
  sourceLabel,
  testTypeLabel,
  languageLabel,
  userLabel,
  testDuration,
  formatMs,
  formatDateTime,
} from './shared';

type ConfirmAction = 'retry' | 'refund' | 'delete';

/** Meta panelidagi bitta katak — sahifada 14 marta takrorlanadi. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

function QuestionCard({ question }: { question: AiTestQuestion }) {
  const { t } = useTranslation('aiTests');
  const diff = difficultyInfo(t, question.difficulty);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-gray-900 dark:text-white">
          {question.order_index + 1}. {question.question_text}
        </p>
        <Badge color={diff.color}>{diff.label}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5">
        {question.options.map((opt) => (
          <li
            key={opt.id}
            className={
              opt.is_correct
                ? 'flex items-start gap-2 text-sm text-green-700 dark:text-green-400'
                : 'flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300'
            }
          >
            {opt.is_correct ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 opacity-25" />
            )}
            <span>{opt.text}</span>
          </li>
        ))}
      </ul>
      {question.explanation && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          {question.explanation}
        </p>
      )}
    </Card>
  );
}

export default function AiTestDetailPage() {
  const { t } = useTranslation('aiTests');
  const { id } = useParams();
  const testId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-test', testId],
    queryFn: () => aiTestsApi.getById(testId).then((r) => r.data.data),
    // Yaratilayotgan test bo'lsa jonli yangilanadi
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.includes(query.state.data.test.status) ? 3000 : false,
  });

  const test = data?.test;

  const { data: questions } = useQuery({
    queryKey: ['ai-test-questions', testId],
    queryFn: () => aiTestsApi.getQuestions(testId).then((r) => r.data.data),
    enabled: test?.status === 'completed',
  });

  /** Uch amal bir xil yakunlanadi: xabar, keshni yangilash, modalni yopish. */
  const runAction = (action: ConfirmAction) => {
    if (action === 'retry') return aiTestsApi.retry(testId);
    if (action === 'refund') return aiTestsApi.refund(testId);
    return aiTestsApi.delete(testId);
  };

  const actionMutation = useMutation({
    mutationFn: runAction,
    onSuccess: (res: any, action) => {
      toast.success(res?.data?.message || t('toast.done'));
      setConfirm(null);
      if (action === 'delete') {
        qc.invalidateQueries({ queryKey: ['ai-tests'] });
        navigate('/ai-tests');
        return;
      }
      qc.invalidateQueries({ queryKey: ['ai-test', testId] });
      qc.invalidateQueries({ queryKey: ['ai-tests'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('toast.actionFailed')),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!test) {
    return <EmptyState message={t('empty.notFound')} />;
  }

  const st = statusInfo(t, test.status);
  const md = modelInfo(t, test.model);
  const canRetry = test.status === 'failed';
  const canRefund = !test.refunded && test.diamonds_spent > 0;

  const confirmText: Record<ConfirmAction, { title: string; body: ReactNode; button: string }> = {
    retry: {
      title: t('confirm.retry.title'),
      body: (
        <>
          <Trans i18nKey="aiTests:confirm.retry.body" components={{ b: <b /> }} />
          {test.refunded && (
            <>
              {' '}
              {t('confirm.retry.refundedNote')}
            </>
          )}
        </>
      ),
      button: t('confirm.retry.button'),
    },
    refund: {
      title: t('confirm.refund.title'),
      body: (
        <Trans
          i18nKey="aiTests:confirm.refund.body"
          count={test.diamonds_spent}
          components={{ b: <b /> }}
        />
      ),
      button: t('confirm.refund.button'),
    },
    delete: {
      title: t('confirm.delete.title'),
      body: t('confirm.delete.body'),
      button: t('common:actions.delete'),
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai-tests')}>
            <ArrowLeft className="w-4 h-4" /> {t('actions.backToList')}
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('detail.title', { id: test.id })}
            <Badge color={st.color}>{st.label}</Badge>
            <Badge color={md.color}>{md.label}</Badge>
            {test.refunded && <Badge color="orange">{t('badge.diamondsRefunded')}</Badge>}
          </h1>
        </div>
        <div className="flex gap-2">
          {canRetry && (
            <Button variant="secondary" onClick={() => setConfirm('retry')}>
              <RefreshCw className="w-4 h-4" /> {t('actions.retry')}
            </Button>
          )}
          {canRefund && (
            <Button variant="secondary" onClick={() => setConfirm('refund')}>
              <Undo2 className="w-4 h-4" /> {t('actions.refund')}
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirm('delete')}>
            <Trash2 className="w-4 h-4" /> {t('common:actions.delete')}
          </Button>
        </div>
      </div>

      {test.error && (
        <Card className="border-red-200 dark:border-red-900/50">
          <p className="text-xs uppercase tracking-wider text-red-500 mb-2">{t('detail.errorReason')}</p>
          <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words font-mono">
            {test.error}
          </pre>
        </Card>
      )}

      <Card>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label={t('common:table.user')}>
            {userLabel(test)}
            {test.username && (
              <span className="block text-xs text-gray-400">@{test.username}</span>
            )}
          </Field>
          <Field label={t('common:table.phone')}>{test.phone || '—'}</Field>
          <Field label={t('common:table.subject')}>{test.subject_name || '—'}</Field>
          <Field label={t('common:table.topic')}>{test.topic_name || '—'}</Field>

          <Field label={t('detail.sourceType')}>{sourceLabel(t, test.source_type)}</Field>
          <Field label={t('detail.questionType')}>{testTypeLabel(t, test.test_type)}</Field>
          <Field label={t('common:table.difficulty')}>
            {difficultyInfo(t, test.difficulty).label}
          </Field>
          <Field label={t('detail.language')}>{languageLabel(t, test.language)}</Field>

          <Field label={t('detail.questionCount')}>{test.question_count}</Field>
          <Field label={t('table.diamonds')}>{test.diamonds_spent}</Field>
          <Field label={t('table.tokens')}>
            {test.input_tokens} / {test.output_tokens}
            <span className="block text-xs text-gray-400">{t('detail.tokensHint')}</span>
          </Field>
          <Field label={t('stats.aiCost')}>${test.cost_usd}</Field>

          <Field label={t('common:table.created')}>{formatDateTime(test.created_at)}</Field>
          <Field label={t('detail.started')}>{formatDateTime(test.started_at)}</Field>
          <Field label={t('detail.finished')}>{formatDateTime(test.finished_at)}</Field>
          <Field label={t('table.duration')}>{testDuration(t, test)}</Field>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('source.title')}</h2>
        {test.source_type === 'text' ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {t('source.chars', { count: test.source_text_length ?? 0 })}
              {(test.source_text_length ?? 0) > (test.source_text?.length ?? 0) &&
                ` ${t('source.truncated')}`}
            </p>
            <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {test.source_text || '—'}
            </pre>
          </>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>{test.source_filename || t('source.unnamedFile')}</p>
            <p className="mt-1 text-xs text-gray-400">
              {test.source_file_exists
                ? t('source.fileStored')
                : t('source.fileDeleted')}
            </p>
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('calls.title')}</h2>
        <Table
          headers={[
            t('table.stage'),
            t('table.model'),
            t('table.tokens'),
            t('table.duration'),
            t('table.cost'),
            t('table.result'),
            t('table.time'),
          ]}
        >
          {!data?.call_logs?.length ? (
            <tr>
              <td colSpan={7}>
                <EmptyState message={t('empty.noCalls')} />
              </td>
            </tr>
          ) : (
            data.call_logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{log.stage}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {log.provider}:{log.model}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {log.input_tokens} / {log.output_tokens}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatMs(t, log.duration_ms)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">${log.cost_usd}</td>
                <td className="px-4 py-3">
                  {log.success ? (
                    <Badge color="green">{t('calls.ok')}</Badge>
                  ) : (
                    <Badge color="red">{log.error?.slice(0, 60) || t('common:status.error')}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </td>
              </tr>
            ))
          )}
        </Table>
      </div>

      {!!data?.attempts?.length && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('attempts.title')}</h2>
          <Table
            headers={[
              t('table.correct'),
              t('table.wrong'),
              t('common:table.total'),
              t('table.score'),
              t('table.time'),
              t('common:table.date'),
            ]}
          >
            {data.attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-green-600 dark:text-green-400">{a.correct_answers}</td>
                <td className="px-4 py-3 text-red-600 dark:text-red-400">{a.wrong_answers}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.total_questions}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{a.score}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {t('units.sec', { value: a.spent_time })}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDateTime(a.created_at)}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {test.status === 'completed' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t('questions.title')} {questions ? `(${questions.length})` : ''}
          </h2>
          {questions?.length ? (
            questions.map((q) => <QuestionCard key={q.id} question={q} />)
          ) : (
            <EmptyState message={t('empty.noQuestions')} />
          )}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? confirmText[confirm].title : ''}
      >
        {confirm && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">{confirmText[confirm].body}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                variant={confirm === 'delete' ? 'danger' : 'primary'}
                loading={actionMutation.isPending}
                onClick={() => actionMutation.mutate(confirm)}
              >
                {confirmText[confirm].button}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
