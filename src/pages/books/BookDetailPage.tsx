import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Eye,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  StopCircle,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { booksApi, subjectsApi, topicsApi } from '../../api/services';
import type { Book, BookTopic, GeneratedQuestion, GenerationJob } from '../../types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Select,
  Spinner,
} from '../../components/ui';
import { STATUS_COLORS } from './BooksPage';

const PROCESSING = ['uploaded', 'extracting', 'analyzing', 'reanalyze'];
const DIFFICULTY_COLORS: Record<string, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

export default function BookDetailPage() {
  const { t } = useTranslation('bookDetail');
  const { id } = useParams();
  const bookId = Number(id);
  const navigate = useNavigate();

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => booksApi.getById(bookId).then((r) => r.data.data),
    refetchInterval: (query) =>
      query.state.data && PROCESSING.includes(query.state.data.status) ? 3000 : false,
  });

  if (isLoading || !book) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusColor = STATUS_COLORS[book.status] ?? 'gray';
  const statusLabel = t(`books:status.${book.status}`, { defaultValue: book.status });
  const processing = PROCESSING.includes(book.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/books')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{book.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <Badge color={statusColor}>{statusLabel}</Badge>
              {book.page_count ? (
                <span>{t('pageCount', { count: Number(book.page_count) })}</span>
              ) : null}
              {book.meta?.extraction_quality && (
                <span
                  title={
                    book.meta.extraction_quality.low_pages?.length
                      ? t('quality.lowPages', {
                          pages: book.meta.extraction_quality.low_pages
                            .map((p) => t('quality.lowPageItem', { page: p.page, score: p.score }))
                            .join(', '),
                        })
                      : t('quality.allClean')
                  }
                >
                  <Badge
                    color={
                      book.meta.extraction_quality.avg >= 90
                        ? 'green'
                        : book.meta.extraction_quality.avg >= 75
                          ? 'yellow'
                          : 'red'
                    }
                  >
                    {t('quality.badge', { avg: book.meta.extraction_quality.avg })}
                  </Badge>
                </span>
              )}
              {book.meta?.vision_indexed && book.meta.vision_indexed.pages > 0 && (
                <span title={t('vision.title')}>
                  <Badge color="purple">
                    {t('vision.badge', { count: Number(book.meta.vision_indexed.pages) })}
                  </Badge>
                </span>
              )}
              {book.grade ? <span>· {t('books:gradeValue', { grade: book.grade })}</span> : null}
              {book.subject_name ? <span>· {book.subject_name}</span> : null}
            </div>
          </div>
        </div>
        {['needs_review', 'ready', 'failed', 'needs_ocr'].includes(book.status) && (
          <ReanalyzeButton bookId={bookId} />
        )}
      </div>

      {processing && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {statusLabel}... ({book.progress}%)
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-primary-600 transition-all"
                  style={{ width: `${book.progress}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {(book.status === 'failed' || book.status === 'needs_ocr') && (
        <Card className="p-4 border-l-4 border-red-500">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {book.status === 'failed' ? t('errorCard.failed') : t('errorCard.needsOcr')}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{book.status_error}</p>
        </Card>
      )}

      {['needs_review', 'ready'].includes(book.status) && (
        <>
          <SubjectCard book={book} />
          <TopicsSection book={book} />
          {book.status === 'ready' && <GenerationSection book={book} />}
          <DraftsSection book={book} />
        </>
      )}
    </div>
  );
}

// ── Qayta tahlil ────────────────────────────────────────────────────────────

function ReanalyzeButton({ bookId }: { bookId: number }) {
  const { t } = useTranslation('bookDetail');
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => booksApi.reanalyze(bookId),
    onSuccess: () => {
      toast.success(t('reanalyze.started'));
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['book', bookId] });
      qc.invalidateQueries({ queryKey: ['book-topics', bookId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <RefreshCw className="w-4 h-4" /> {t('reanalyze.button')}
      </Button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('reanalyze.modalTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('reanalyze.body')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {t('actions.start')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Fan tasdiqlash ──────────────────────────────────────────────────────────

function SubjectCard({ book }: { book: Book }) {
  const { t } = useTranslation('bookDetail');
  const qc = useQueryClient();
  const proposal = book.meta?.proposed_subject;
  const [subjectId, setSubjectId] = useState<string>(
    book.subject_id ? String(book.subject_id) : proposal?.id ? String(proposal.id) : ''
  );
  const [newName, setNewName] = useState(proposal && proposal.is_new ? proposal.name || '' : '');
  const [creatingNew, setCreatingNew] = useState(!!proposal?.is_new && !book.subject_id);
  const [grade, setGrade] = useState<string>(
    book.grade ? String(book.grade) : book.meta?.proposed_grade ? String(book.meta.proposed_grade) : ''
  );

  const { data: subjects } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsApi.getAllForDropdown().then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      booksApi.confirmSubject(book.id, {
        subject_id: creatingNew ? undefined : Number(subjectId) || undefined,
        new_subject: creatingNew && newName ? { name: newName } : undefined,
        grade: grade ? Number(grade) : null,
      }),
    onSuccess: () => {
      toast.success(t('subject.confirmed'));
      qc.invalidateQueries({ queryKey: ['book', book.id] });
      qc.invalidateQueries({ queryKey: ['subjects-dropdown'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{t('subject.title')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('subject.hint')}
          </p>
        </div>
        {book.subject_id ? (
          <Badge color="green">{t('subject.assigned', { name: book.subject_name ?? '' })}</Badge>
        ) : (
          <Badge color="yellow">{t('common:state.notSet')}</Badge>
        )}
      </div>

      {proposal?.name && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {/* The proposed name comes from the AI: escape it so it is never parsed as markup. */}
          {proposal.is_new ? (
            <Trans
              i18nKey="bookDetail:subject.proposalNew"
              values={{ name: proposal.name }}
              components={{ b: <b /> }}
              shouldUnescape
              tOptions={{ interpolation: { escapeValue: true } }}
            />
          ) : (
            <Trans
              i18nKey="bookDetail:subject.proposal"
              values={{ name: proposal.name }}
              components={{ b: <b /> }}
              shouldUnescape
              tOptions={{ interpolation: { escapeValue: true } }}
            />
          )}{' '}
          <Badge
            color={
              proposal.confidence === 'high'
                ? 'green'
                : proposal.confidence === 'medium'
                  ? 'yellow'
                  : 'red'
            }
          >
            {t(`subject.confidenceLevel.${proposal.confidence}`, { defaultValue: proposal.confidence })}
          </Badge>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        {creatingNew ? (
          <Input
            label={t('subject.newName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('subject.newNamePlaceholder')}
          />
        ) : (
          <Select
            label={t('common:table.subject')}
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">{`— ${t('common:state.select')} —`}</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          label={t('subject.gradeLabel')}
          type="number"
          min={1}
          max={11}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => setCreatingNew(!creatingNew)}
          className="whitespace-nowrap"
        >
          {creatingNew ? t('subject.pickExisting') : t('subject.createNew')}
        </Button>
        <Button
          loading={mutation.isPending}
          disabled={creatingNew ? !newName.trim() : !subjectId}
          onClick={() => mutation.mutate()}
        >
          <Check className="w-4 h-4" /> {t('common:actions.confirm')}
        </Button>
      </div>
    </Card>
  );
}

// ── Mavzular ────────────────────────────────────────────────────────────────

function TopicsSection({ book }: { book: Book }) {
  const { t } = useTranslation('bookDetail');
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<{ title: string; start_page: string; end_page: string }>({
    title: '',
    start_page: '',
    end_page: '',
  });
  const [preview, setPreview] = useState<{ topic: BookTopic } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', start_page: '', end_page: '' });

  const { data: topics, isLoading } = useQuery({
    queryKey: ['book-topics', book.id],
    queryFn: () => booksApi.getTopics(book.id).then((r) => r.data.data),
  });

  const { data: realTopics } = useQuery({
    queryKey: ['subject-topics', book.subject_id],
    queryFn: () => topicsApi.getBySubject(book.subject_id!).then((r) => r.data.data.data ?? []),
    enabled: !!book.subject_id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['book-topics', book.id] });
    qc.invalidateQueries({ queryKey: ['book', book.id] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ topicId, body }: { topicId: number; body: Partial<BookTopic> }) =>
      booksApi.updateTopic(book.id, topicId, body),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const confirmAllMutation = useMutation({
    mutationFn: () => booksApi.confirmAllTopics(book.id),
    onSuccess: () => {
      toast.success(t('topics.toast.allConfirmed'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (topicId: number) => booksApi.deleteTopic(book.id, topicId),
    onSuccess: () => {
      toast.success(t('topics.toast.deleted'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      booksApi.createTopic(book.id, {
        title: newTopic.title,
        start_page: Number(newTopic.start_page),
        end_page: Number(newTopic.end_page),
      }),
    onSuccess: () => {
      toast.success(t('topics.toast.added'));
      setAdding(false);
      setNewTopic({ title: '', start_page: '', end_page: '' });
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t('topics.title')}{' '}
            <span className="text-sm font-normal text-gray-500">
              {t('topics.confirmedCount', {
                done: topics?.filter((topic) => topic.is_confirmed).length ?? 0,
                total: topics?.length ?? 0,
              })}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            <Trans
              i18nKey="bookDetail:topics.hint"
              values={{ appTopic: t('topics.table.appTopic') }}
              components={{ b: <b /> }}
            />
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            {t('topics.add')}
          </Button>
          <Button
            size="sm"
            loading={confirmAllMutation.isPending}
            onClick={() => confirmAllMutation.mutate()}
            disabled={!topics?.length}
          >
            <CheckCheck className="w-4 h-4" /> {t('topics.confirmAll')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !topics?.length ? (
        <EmptyState message={t('topics.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {[
                  '#',
                  t('common:table.topic'),
                  t('topics.table.pages'),
                  t('topics.table.appTopic'),
                  t('topics.table.questions'),
                  t('topics.table.boundary'),
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {topics.map((topic, idx) => {
                const isEditing = editingId === topic.id;
                return (
                  <tr key={topic.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 max-w-md">
                      {isEditing ? (
                        <Input
                          value={editRow.title}
                          onChange={(e) => setEditRow({ ...editRow, title: e.target.value })}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{topic.title}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="w-20"
                            value={editRow.start_page}
                            onChange={(e) => setEditRow({ ...editRow, start_page: e.target.value })}
                          />
                          <span>—</span>
                          <Input
                            type="number"
                            className="w-20"
                            value={editRow.end_page}
                            onChange={(e) => setEditRow({ ...editRow, end_page: e.target.value })}
                          />
                        </div>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300">
                          {topic.start_page}–{topic.end_page}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100"
                        value={topic.linked_topic_id ?? ''}
                        onChange={(e) =>
                          updateMutation.mutate({
                            topicId: topic.id,
                            body: {
                              linked_topic_id: e.target.value ? Number(e.target.value) : null,
                            },
                          })
                        }
                        disabled={!book.subject_id}
                      >
                        <option value="">{t('topics.autoOption')}</option>
                        {realTopics?.map((rt: any) => (
                          <option key={rt.id} value={rt.id}>
                            {rt.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {t('topics.draftApproved', {
                        count: Number(topic.draft_count) || 0,
                        approved: Number(topic.approved_count) || 0,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            topicId: topic.id,
                            body: { is_confirmed: !topic.is_confirmed },
                          })
                        }
                        title={topic.is_confirmed ? t('topics.unconfirm') : t('common:actions.confirm')}
                      >
                        {topic.is_confirmed ? (
                          <Badge color="green">{t('topics.boundaryOk')}</Badge>
                        ) : (
                          <Badge color="yellow">{t('topics.unchecked')}</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={t('topics.viewPage')}
                          onClick={() => setPreview({ topic })}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({
                                  topicId: topic.id,
                                  body: {
                                    title: editRow.title,
                                    start_page: Number(editRow.start_page),
                                    end_page: Number(editRow.end_page),
                                  },
                                })
                              }
                            >
                              <Save className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(topic.id);
                                setEditRow({
                                  title: topic.title,
                                  start_page: String(topic.start_page),
                                  end_page: String(topic.end_page),
                                });
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(topic.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Sahifa preview modali */}
      <PagePreviewModal
        bookId={book.id}
        topic={preview?.topic ?? null}
        onClose={() => setPreview(null)}
      />

      {/* Qo'lda mavzu qo'shish */}
      <Modal open={adding} onClose={() => setAdding(false)} title={t('topics.addModal.title')}>
        <div className="space-y-3">
          <Input
            label={t('topics.addModal.name')}
            value={newTopic.title}
            onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('topics.addModal.startPage')}
              type="number"
              value={newTopic.start_page}
              onChange={(e) => setNewTopic({ ...newTopic, start_page: e.target.value })}
            />
            <Input
              label={t('topics.addModal.endPage')}
              type="number"
              value={newTopic.end_page}
              onChange={(e) => setNewTopic({ ...newTopic, end_page: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              loading={createMutation.isPending}
              disabled={!newTopic.title || !newTopic.start_page || !newTopic.end_page}
              onClick={() => createMutation.mutate()}
            >
              {t('common:actions.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function PagePreviewModal({
  bookId,
  topic,
  onClose,
}: {
  bookId: number;
  topic: BookTopic | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('bookDetail');
  const [from, setFrom] = useState<number | null>(null);
  const effectiveFrom = from ?? topic?.start_page ?? 1;

  const { data: pages, isLoading } = useQuery({
    queryKey: ['book-pages', bookId, effectiveFrom],
    queryFn: () =>
      booksApi.getPages(bookId, effectiveFrom, effectiveFrom + 1).then((r) => r.data.data),
    enabled: !!topic,
  });

  return (
    <Modal
      open={!!topic}
      onClose={() => {
        setFrom(null);
        onClose();
      }}
      title={topic ? t('preview.title', { title: topic.title }) : ''}
      size="lg"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrom(Math.max(1, effectiveFrom - 1))}
          >
            ← {t('common:actions.previous')}
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {t('preview.pageInfo', {
              page: effectiveFrom,
              start: topic?.start_page ?? '',
              end: topic?.end_page ?? '',
            })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setFrom(effectiveFrom + 1)}>
            {t('common:actions.next')} →
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-4">
            {pages?.map((p) => (
              <div key={p.page_no}>
                <p className="text-xs font-semibold text-gray-400 mb-1">
                  {t('preview.pageHeading', { page: p.page_no })}
                </p>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  {p.text || t('preview.emptyPage')}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Generatsiya ─────────────────────────────────────────────────────────────

function GenerationSection({ book }: { book: Book }) {
  const { t } = useTranslation('bookDetail');
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [count, setCount] = useState('20');
  const [difficulty, setDifficulty] = useState({ easy: '30', medium: '50', hard: '20' });

  const { data: topics } = useQuery({
    queryKey: ['book-topics', book.id],
    queryFn: () => booksApi.getTopics(book.id).then((r) => r.data.data),
  });

  const { data: jobs } = useQuery({
    queryKey: ['book-jobs', book.id],
    queryFn: () => booksApi.getJobs(book.id).then((r) => r.data.data),
    refetchInterval: (query) =>
      query.state.data?.some((j) => ['queued', 'running'].includes(j.status)) ? 2500 : false,
  });

  const activeJob = jobs?.find((j) => ['queued', 'running'].includes(j.status));

  const generateMutation = useMutation({
    mutationFn: () =>
      booksApi.generate(book.id, {
        book_topic_ids: Array.from(selected),
        per_topic_count: Number(count) || 20,
        difficulty: {
          easy: Number(difficulty.easy) || 0,
          medium: Number(difficulty.medium) || 0,
          hard: Number(difficulty.hard) || 0,
        },
      }),
    onSuccess: () => {
      toast.success(t('generation.toast.started'));
      qc.invalidateQueries({ queryKey: ['book-jobs', book.id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: number) => booksApi.cancelJob(jobId),
    onSuccess: () => {
      toast.success(t('generation.toast.cancelled'));
      qc.invalidateQueries({ queryKey: ['book-jobs', book.id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const confirmedTopics = useMemo(() => topics?.filter((topic) => topic.is_confirmed) ?? [], [topics]);
  const allSelected = confirmedTopics.length > 0 && selected.size === confirmedTopics.length;
  const diffSum =
    (Number(difficulty.easy) || 0) + (Number(difficulty.medium) || 0) + (Number(difficulty.hard) || 0);

  const selectedKey = useMemo(() => Array.from(selected).sort((a, b) => a - b).join(','), [selected]);
  const { data: estimate } = useQuery({
    queryKey: ['gen-estimate', book.id, selectedKey, count],
    queryFn: () =>
      booksApi
        .getEstimate(book.id, {
          book_topic_ids: Array.from(selected),
          per_topic_count: Number(count) || 20,
        })
        .then((r) => r.data.data),
    enabled: selected.size > 0 && !activeJob,
    staleTime: 30_000,
  });

  return (
    <Card className="p-4 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary-600" /> {t('generation.title')}
      </h2>

      {activeJob ? (
        <JobProgress job={activeJob} onCancel={(id) => cancelMutation.mutate(id)} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(
                    allSelected ? new Set() : new Set(confirmedTopics.map((topic) => topic.id))
                  )
                }
              />
              {t('generation.selectAll', {
                topics: t('generation.topicsCount', { count: confirmedTopics.length }),
              })}
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg p-2">
            {confirmedTopics.map((topic) => (
              <label
                key={topic.id}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(topic.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(topic.id)) next.delete(topic.id);
                    else next.add(topic.id);
                    setSelected(next);
                  }}
                />
                <span className="truncate">{topic.title}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  ({topic.start_page}–{topic.end_page})
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <Input
              label={t('generation.perTopic')}
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <Input
              label={`${t('difficulty.easy')} %`}
              type="number"
              value={difficulty.easy}
              onChange={(e) => setDifficulty({ ...difficulty, easy: e.target.value })}
            />
            <Input
              label={`${t('difficulty.medium')} %`}
              type="number"
              value={difficulty.medium}
              onChange={(e) => setDifficulty({ ...difficulty, medium: e.target.value })}
            />
            <Input
              label={`${t('difficulty.hard')} %`}
              type="number"
              value={difficulty.hard}
              onChange={(e) => setDifficulty({ ...difficulty, hard: e.target.value })}
            />
            <Button
              loading={generateMutation.isPending}
              disabled={selected.size === 0 || diffSum <= 0}
              onClick={() => generateMutation.mutate()}
            >
              <Play className="w-4 h-4" /> {t('actions.start')}
            </Button>
          </div>
          {diffSum <= 0 ? (
            <p className="text-xs text-red-500">
              {t('generation.diffError')}
            </p>
          ) : (
            diffSum !== 100 && (
              <p className="text-xs text-gray-400">
                {t('generation.diffNormalized', {
                  easy: Math.round(((Number(difficulty.easy) || 0) / diffSum) * 100),
                  medium: Math.round(((Number(difficulty.medium) || 0) / diffSum) * 100),
                  hard: Math.round(((Number(difficulty.hard) || 0) / diffSum) * 100),
                })}
              </p>
            )
          )}
          <p className="text-xs text-gray-400">
            {t('generation.selectedSummary', {
              topics: t('generation.topicsCount', { count: selected.size }),
              perTopic: t('generation.questionsCount', { count: Number(count) || 0 }),
              total: t('generation.questionsCount', { count: selected.size * (Number(count) || 0) }),
            })}
            {estimate && (
              <>
                {' · '}
                <Trans
                  i18nKey="bookDetail:generation.estimate"
                  values={{
                    tokens: Math.round((estimate.input_tokens + estimate.output_tokens) / 1000),
                    cost: estimate.est_cost_usd,
                  }}
                  components={{ b: <b className="text-gray-600 dark:text-gray-300" /> }}
                />
                {estimate.batch_mode && ` ${t('generation.batchNote')}`}
              </>
            )}
          </p>
        </>
      )}

      {jobs && jobs.filter((j) => !['queued', 'running'].includes(j.status)).length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          {jobs
            .filter((j) => !['queued', 'running'].includes(j.status))
            .slice(0, 3)
            .map((j) => (
              <p key={j.id}>
                <Trans
                  i18nKey="bookDetail:generation.jobLine"
                  values={{
                    id: j.id,
                    status: t(`common:status.${j.status}`, { defaultValue: j.status }),
                    questions: t('generation.questionsCount', {
                      count: Number(j.questions_created) || 0,
                    }),
                    done: j.topics_done,
                    total: j.topics_total,
                    inTokens: (j.input_tokens / 1000).toFixed(0),
                    outTokens: (j.output_tokens / 1000).toFixed(0),
                  }}
                  components={{ b: <b /> }}
                />
                {j.error ? ` · ${t('generation.jobError', { error: j.error })}` : ''}
              </p>
            ))}
        </div>
      )}
    </Card>
  );
}

function JobProgress({
  job,
  onCancel,
}: {
  job: GenerationJob;
  onCancel: (id: number) => void;
}) {
  const { t } = useTranslation('bookDetail');
  const pct = job.topics_total ? Math.round((job.topics_done / job.topics_total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Spinner size="sm" />
          {job.batch_name
            ? t('job.batchRunning')
            : t('job.running', {
                count: Number(job.questions_created) || 0,
                done: job.topics_done,
                total: job.topics_total,
              })}
        </p>
        <Button variant="outline" size="sm" onClick={() => onCancel(job.id)}>
          <StopCircle className="w-4 h-4" /> {t('job.stop')}
        </Button>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-primary-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {t('job.tokens', {
          inTokens: (job.input_tokens / 1000).toFixed(0),
          outTokens: (job.output_tokens / 1000).toFixed(0),
        })}
      </p>
    </div>
  );
}

// ── Draft savollar (review) ────────────────────────────────────────────────

function DraftsSection({ book }: { book: Book }) {
  const { t } = useTranslation('bookDetail');
  const qc = useQueryClient();
  const [topicFilter, setTopicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<GeneratedQuestion | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<'book' | 'topic' | null>(null);
  const limit = 10;

  const { data: topics } = useQuery({
    queryKey: ['book-topics', book.id],
    queryFn: () => booksApi.getTopics(book.id).then((r) => r.data.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['book-drafts-summary', book.id, topicFilter],
    queryFn: () =>
      booksApi
        .getDraftsSummary(book.id, topicFilter ? Number(topicFilter) : undefined)
        .then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['book-drafts', book.id, topicFilter, statusFilter, page],
    queryFn: () =>
      booksApi
        .getDrafts(book.id, {
          book_topic_id: topicFilter ? Number(topicFilter) : undefined,
          review_status: statusFilter || undefined,
          page,
          limit,
        })
        .then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['book-drafts', book.id] });
    qc.invalidateQueries({ queryKey: ['book-drafts-summary', book.id] });
    qc.invalidateQueries({ queryKey: ['book-topics', book.id] });
    qc.invalidateQueries({ queryKey: ['book', book.id] });
  };

  const approveMutation = useMutation({
    mutationFn: (qid: number) => booksApi.approveDraft(qid),
    onSuccess: () => {
      toast.success(t('drafts.toast.approved'));
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const rejectMutation = useMutation({
    mutationFn: (qid: number) => booksApi.rejectDraft(qid),
    onSuccess: () => {
      toast(t('drafts.toast.rejected'), { icon: '🗑' });
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (scope: 'book' | 'topic') =>
      booksApi.bulkApprove(
        book.id,
        scope === 'book' ? { all_ready: true } : { book_topic_id: Number(topicFilter) }
      ),
    onSuccess: (res) => {
      toast.success(
        t('drafts.toast.bulkApproved', { count: Number(res.data.data.approved_count) || 0 })
      );
      setBulkConfirm(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  const drafts = data?.data ?? [];
  const total =
    (summary?.pending ?? 0) +
    (summary?.needs_review ?? 0) +
    (summary?.approved ?? 0) +
    (summary?.rejected ?? 0);
  const reviewed = (summary?.approved ?? 0) + (summary?.rejected ?? 0);
  const readyCount = Number(summary?.ready ?? 0) || 0;

  const statusTabs: Array<{ value: string; label: string; count: number; color: string }> = [
    {
      value: 'pending',
      label: t('common:status.pending'),
      count: summary?.pending ?? 0,
      color: 'text-yellow-600',
    },
    {
      value: 'needs_review',
      label: t('drafts.tabs.needsReview'),
      count: summary?.needs_review ?? 0,
      color: 'text-orange-600',
    },
    {
      value: 'approved',
      label: t('drafts.tabs.approved'),
      count: summary?.approved ?? 0,
      color: 'text-green-600',
    },
    {
      value: 'rejected',
      label: t('common:status.rejected'),
      count: summary?.rejected ?? 0,
      color: 'text-red-500',
    },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t('drafts.title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            <Trans
              i18nKey="bookDetail:drafts.hint"
              values={{ approve: t('card.approve'), review: t('drafts.tabs.needsReview') }}
              components={{ b: <b /> }}
            />
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            loading={bulkApproveMutation.isPending && bulkConfirm === null}
            disabled={!summary?.ready}
            onClick={() => setBulkConfirm(topicFilter ? 'topic' : 'book')}
          >
            <CheckCheck className="w-4 h-4" />
            {topicFilter
              ? t('drafts.bulkAddTopic', { ready: summary?.ready ?? 0 })
              : t('drafts.bulkAddBook', { ready: summary?.ready ?? 0 })}
          </Button>
          {total > 0 && (
            <p className="text-xs text-gray-400">
              {t('drafts.reviewedOf', { total, reviewed })}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Select
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setPage(1);
          }}
          className="w-64"
        >
          <option value="">{t('drafts.allTopics')}</option>
          {topics?.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </Select>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={
                'px-3 py-1.5 text-xs font-medium transition ' +
                (statusFilter === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')
              }
            >
              {tab.label}{' '}
              <span className={statusFilter === tab.value ? 'text-white/80' : tab.color}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          message={
            statusFilter === 'pending' ? t('drafts.empty.pending') : t('drafts.empty.other')
          }
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              showTopic={!topicFilter}
              onEdit={() => setEditing(d)}
              onApprove={() => approveMutation.mutate(d.id)}
              onReject={() => rejectMutation.mutate(d.id)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} total={data?.total ?? 0} limit={limit} onChange={setPage} />

      <DraftEditModal
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          invalidate();
        }}
      />

      {/* Ommaviy qo'shish tasdiqlash modali */}
      <Modal
        open={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        title={t('drafts.bulk.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {bulkConfirm === 'book'
              ? t('drafts.bulk.bodyBook', { count: readyCount, pending: t('common:status.pending') })
              : t('drafts.bulk.bodyTopic', { count: readyCount })}{' '}
            {t('drafts.bulk.bodyTail', { review: t('drafts.tabs.needsReview') })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkConfirm(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              loading={bulkApproveMutation.isPending}
              onClick={() => bulkConfirm && bulkApproveMutation.mutate(bulkConfirm)}
            >
              <CheckCheck className="w-4 h-4" /> {t('common:actions.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function DraftCard({
  draft,
  showTopic,
  onEdit,
  onApprove,
  onReject,
}: {
  draft: GeneratedQuestion;
  showTopic?: boolean;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation('bookDetail');
  const options =
    typeof draft.options === 'string' ? JSON.parse(draft.options as any) : draft.options;
  const reviewed = ['approved', 'rejected'].includes(draft.review_status);

  return (
    <div
      className={
        'rounded-xl border p-4 space-y-2 ' +
        (draft.review_status === 'approved'
          ? 'border-green-300 dark:border-green-800 bg-green-50/40 dark:bg-green-900/10'
          : draft.review_status === 'rejected'
            ? 'border-red-200 dark:border-red-900 opacity-60'
            : 'border-gray-200 dark:border-gray-800')
      }
    >
      {showTopic && draft.book_topic_title && (
        <p className="text-xs text-gray-400 uppercase tracking-wide">{draft.book_topic_title}</p>
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-gray-900 dark:text-white">{draft.question_text}</p>
        <div className="flex items-center gap-1 shrink-0">
          {draft.quality_score != null && (
            <Badge
              color={
                draft.quality_score >= 8 ? 'green' : draft.quality_score >= 7 ? 'blue' : 'orange'
              }
            >
              {t('card.quality', { score: draft.quality_score })}
            </Badge>
          )}
          <Badge color={DIFFICULTY_COLORS[draft.difficulty] ?? 'gray'}>
            {t(`difficulty.${draft.difficulty}`, { defaultValue: draft.difficulty })}
          </Badge>
        </div>
      </div>

      <ul className="space-y-1">
        {options.map((o: any, i: number) => (
          <li
            key={i}
            className={
              o.is_correct
                ? 'text-sm text-green-700 dark:text-green-400 font-medium'
                : 'text-sm text-gray-600 dark:text-gray-300'
            }
          >
            {String.fromCharCode(65 + i)}) {o.option_text} {o.is_correct && '✓'}
          </li>
        ))}
      </ul>

      {draft.explanation && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('card.explanation', { text: draft.explanation })}
        </p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-2">
          {draft.grounded ? (
            <span title={draft.source_quote || ''}>
              <Badge color="green">
                {t('card.sourceVerified', { page: draft.source_page ?? '' })}
              </Badge>
            </span>
          ) : (
            <span title={draft.flag_reason || ''}>
              <Badge color="orange">
                {t('card.attention', { reason: draft.flag_reason || t('card.sourceUnverified') })}
              </Badge>
            </span>
          )}
          {draft.source_quote && (
            <span className="text-xs text-gray-400 italic max-w-md truncate">
              "{draft.source_quote}"
            </span>
          )}
        </div>
        {reviewed ? (
          <div className="flex items-center gap-2">
            {draft.review_status === 'approved' ? (
              <Badge color="green">{t('card.approvedBadge')}</Badge>
            ) : (
              <Badge color="red">{t('card.rejectedBadge')}</Badge>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={onEdit} title={t('card.editTitle')}>
              <Pencil className="w-4 h-4" /> {t('common:actions.edit')}
            </Button>
            <Button variant="outline" size="sm" onClick={onReject} title={t('card.rejectTitle')}>
              <ThumbsDown className="w-4 h-4 text-red-500" /> {t('card.reject')}
            </Button>
            <Button size="sm" onClick={onApprove} title={t('card.approveTitle')}>
              <ThumbsUp className="w-4 h-4" /> {t('card.approve')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftEditModal({
  draft,
  onClose,
  onSaved,
}: {
  draft: GeneratedQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('bookDetail');
  const [form, setForm] = useState<{
    question_text: string;
    difficulty: string;
    explanation: string;
    options: { option_text: string; is_correct: boolean }[];
  } | null>(null);

  // Draft o'zgarganda formani qayta to'ldirish
  const draftId = draft?.id;
  useMemo(() => {
    if (draft) {
      const options =
        typeof draft.options === 'string' ? JSON.parse(draft.options as any) : draft.options;
      setForm({
        question_text: draft.question_text,
        difficulty: draft.difficulty,
        explanation: draft.explanation || '',
        options: options.map((o: any) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const mutation = useMutation({
    mutationFn: () =>
      booksApi.updateDraft(draft!.id, {
        question_text: form!.question_text,
        difficulty: form!.difficulty as any,
        explanation: form!.explanation,
        options: form!.options.map((o, i) => ({ ...o, order_index: i })),
      }),
    onSuccess: () => {
      toast.success(t('edit.toast.updated'));
      onSaved();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('common:state.error')),
  });

  if (!draft || !form) return null;

  return (
    <Modal open={!!draft} onClose={onClose} title={t('edit.title')} size="lg">
      <div className="space-y-3">
        <Input
          label={t('edit.questionText')}
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />
        <Select
          label={t('common:table.difficulty')}
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="easy">{t('difficulty.easy')}</option>
          <option value="medium">{t('difficulty.medium')}</option>
          <option value="hard">{t('difficulty.hard')}</option>
        </Select>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('edit.options')}
          </label>
          {form.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct-option"
                checked={o.is_correct}
                onChange={() =>
                  setForm({
                    ...form,
                    options: form.options.map((opt, j) => ({ ...opt, is_correct: j === i })),
                  })
                }
              />
              <Input
                className="flex-1"
                value={o.option_text}
                onChange={(e) =>
                  setForm({
                    ...form,
                    options: form.options.map((opt, j) =>
                      j === i ? { ...opt, option_text: e.target.value } : opt
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
        <Input
          label={t('edit.explanation')}
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {t('common:actions.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
