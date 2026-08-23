import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Undo2, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { aiTestsApi } from '../../api/services';
import type { AiTestQuestion } from '../../types';
import { Card, Badge, Button, Modal, Spinner, Table, EmptyState } from '../../components/ui';
import {
  STATUS_LABELS,
  ACTIVE_STATUSES,
  MODEL_LABELS,
  SOURCE_LABELS,
  TEST_TYPE_LABELS,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
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
  const diff = DIFFICULTY_LABELS[question.difficulty] ?? {
    label: question.difficulty,
    color: 'gray' as const,
  };
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
      toast.success(res?.data?.message || 'Bajarildi');
      setConfirm(null);
      if (action === 'delete') {
        qc.invalidateQueries({ queryKey: ['ai-tests'] });
        navigate('/ai-tests');
        return;
      }
      qc.invalidateQueries({ queryKey: ['ai-test', testId] });
      qc.invalidateQueries({ queryKey: ['ai-tests'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Amalni bajarib bo\'lmadi'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!test) {
    return <EmptyState message="Test topilmadi" />;
  }

  const st = STATUS_LABELS[test.status] ?? { label: test.status, color: 'gray' as const };
  const md = MODEL_LABELS[test.model] ?? { label: test.model, color: 'gray' as const };
  const canRetry = test.status === 'failed';
  const canRefund = !test.refunded && test.diamonds_spent > 0;

  const confirmText: Record<ConfirmAction, { title: string; body: ReactNode; button: string }> = {
    retry: {
      title: 'Testni qayta ishga tushirish',
      body: (
        <>
          Test qayta navbatga qo'yiladi va generatsiya boshidan ishlaydi.{' '}
          <b>Foydalanuvchidan olmos yechilmaydi.</b>
          {test.refunded && (
            <>
              {' '}
              Diqqat: bu test uchun olmos allaqachon qaytarilgan — qayta yaratish foydalanuvchi
              uchun bepul bo'ladi.
            </>
          )}
        </>
      ),
      button: 'Qayta ishga tushirish',
    },
    refund: {
      title: 'Olmosni qaytarish',
      body: (
        <>
          Foydalanuvchi balansiga <b>{test.diamonds_spent} olmos</b> qaytariladi. Bu amal bir marta
          bajariladi va bekor qilinmaydi.
        </>
      ),
      button: 'Qaytarish',
    },
    delete: {
      title: "Testni o'chirish",
      body: (
        <>
          Test, uning barcha savollari va urinishlari o'chiriladi. Manba fayli ham o'chadi. Bu amal
          qaytarilmaydi.
        </>
      ),
      button: "O'chirish",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai-tests')}>
            <ArrowLeft className="w-4 h-4" /> Ro'yxatga
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            AI Test #{test.id}
            <Badge color={st.color}>{st.label}</Badge>
            <Badge color={md.color}>{md.label}</Badge>
            {test.refunded && <Badge color="orange">olmos qaytarilgan</Badge>}
          </h1>
        </div>
        <div className="flex gap-2">
          {canRetry && (
            <Button variant="secondary" onClick={() => setConfirm('retry')}>
              <RefreshCw className="w-4 h-4" /> Qayta ishga tushirish
            </Button>
          )}
          {canRefund && (
            <Button variant="secondary" onClick={() => setConfirm('refund')}>
              <Undo2 className="w-4 h-4" /> Olmosni qaytarish
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirm('delete')}>
            <Trash2 className="w-4 h-4" /> O'chirish
          </Button>
        </div>
      </div>

      {test.error && (
        <Card className="border-red-200 dark:border-red-900/50">
          <p className="text-xs uppercase tracking-wider text-red-500 mb-2">Xato sababi</p>
          <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words font-mono">
            {test.error}
          </pre>
        </Card>
      )}

      <Card>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Foydalanuvchi">
            {userLabel(test)}
            {test.username && (
              <span className="block text-xs text-gray-400">@{test.username}</span>
            )}
          </Field>
          <Field label="Telefon">{test.phone || '—'}</Field>
          <Field label="Fan">{test.subject_name || '—'}</Field>
          <Field label="Mavzu">{test.topic_name || '—'}</Field>

          <Field label="Manba turi">{SOURCE_LABELS[test.source_type] ?? test.source_type}</Field>
          <Field label="Savol turi">{TEST_TYPE_LABELS[test.test_type] ?? test.test_type}</Field>
          <Field label="Qiyinlik">
            {DIFFICULTY_LABELS[test.difficulty]?.label ?? test.difficulty}
          </Field>
          <Field label="Til">{LANGUAGE_LABELS[test.language] ?? test.language}</Field>

          <Field label="Savollar soni">{test.question_count}</Field>
          <Field label="Olmos">{test.diamonds_spent}</Field>
          <Field label="Token">
            {test.input_tokens} / {test.output_tokens}
            <span className="block text-xs text-gray-400">kirish / chiqish</span>
          </Field>
          <Field label="AI xarajati">${test.cost_usd}</Field>

          <Field label="Yaratilgan">{formatDateTime(test.created_at)}</Field>
          <Field label="Boshlangan">{formatDateTime(test.started_at)}</Field>
          <Field label="Tugagan">{formatDateTime(test.finished_at)}</Field>
          <Field label="Davomiylik">{testDuration(test)}</Field>
        </dl>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Manba</h2>
        {test.source_type === 'text' ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              {test.source_text_length ?? 0} belgi
              {(test.source_text_length ?? 0) > (test.source_text?.length ?? 0) &&
                ' (boshidan qismi ko\'rsatilgan)'}
            </p>
            <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {test.source_text || '—'}
            </pre>
          </>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>{test.source_filename || 'Nomsiz fayl'}</p>
            <p className="mt-1 text-xs text-gray-400">
              {test.source_file_exists
                ? 'Fayl serverda saqlangan'
                : "Fayl o'chirilgan — qayta ishga tushirib bo'lmaydi"}
            </p>
          </div>
        )}
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">AI chaqiruvlari</h2>
        <Table
          headers={['Bosqich', 'Model', 'Token', 'Davomiylik', 'Xarajat', 'Natija', 'Vaqt']}
        >
          {!data?.call_logs?.length ? (
            <tr>
              <td colSpan={7}>
                <EmptyState message="AI chaqiruvi qayd etilmagan" />
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
                  {formatMs(log.duration_ms)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">${log.cost_usd}</td>
                <td className="px-4 py-3">
                  {log.success ? (
                    <Badge color="green">OK</Badge>
                  ) : (
                    <Badge color="red">{log.error?.slice(0, 60) || 'Xato'}</Badge>
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
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Yechish urinishlari</h2>
          <Table headers={["To'g'ri", "Noto'g'ri", 'Jami', 'Ball', 'Vaqt', 'Sana']}>
            {data.attempts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-green-600 dark:text-green-400">{a.correct_answers}</td>
                <td className="px-4 py-3 text-red-600 dark:text-red-400">{a.wrong_answers}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.total_questions}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{a.score}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.spent_time}s</td>
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
            Yaratilgan savollar {questions ? `(${questions.length})` : ''}
          </h2>
          {questions?.length ? (
            questions.map((q) => <QuestionCard key={q.id} question={q} />)
          ) : (
            <EmptyState message="Savollar topilmadi" />
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
                Bekor qilish
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
