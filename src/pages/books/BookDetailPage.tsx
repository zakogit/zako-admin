import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
import { STATUS_LABELS } from './BooksPage';

const PROCESSING = ['uploaded', 'extracting', 'analyzing', 'reanalyze'];
const DIFFICULTY_COLORS: Record<string, 'green' | 'yellow' | 'red'> = {
  easy: 'green',
  medium: 'yellow',
  hard: 'red',
};

export default function BookDetailPage() {
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

  const st = STATUS_LABELS[book.status] ?? { label: book.status, color: 'gray' as const };
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
              <Badge color={st.color}>{st.label}</Badge>
              {book.page_count ? <span>{book.page_count} sahifa</span> : null}
              {book.meta?.extraction_quality && (
                <span
                  title={
                    book.meta.extraction_quality.low_pages?.length
                      ? 'Past sifatli sahifalar: ' +
                        book.meta.extraction_quality.low_pages
                          .map((p) => `${p.page}-bet (${p.score}%)`)
                          .join(', ')
                      : 'Barcha sahifalar toza indekslangan'
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
                    Matn sifati: {book.meta.extraction_quality.avg}%
                  </Badge>
                </span>
              )}
              {book.meta?.vision_indexed && book.meta.vision_indexed.pages > 0 && (
                <span title="Past sifatli/skanerlangan sahifalar Gemini vision orqali qayta o'qildi">
                  <Badge color="purple">Vision: {book.meta.vision_indexed.pages} sahifa</Badge>
                </span>
              )}
              {book.grade ? <span>· {book.grade}-sinf</span> : null}
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
                {st.label}... ({book.progress}%)
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
            {book.status === 'failed' ? 'Xato yuz berdi' : 'Skanerlangan kitob'}
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
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => booksApi.reanalyze(bookId),
    onSuccess: () => {
      toast.success('Qayta tahlil boshlandi');
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['book', bookId] });
      qc.invalidateQueries({ queryKey: ['book-topics', bookId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
        <RefreshCw className="w-4 h-4" /> Qayta tahlil
      </Button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Qayta tahlil">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Mavjud mavzular va draft savollar o'chirilib, AI tahlili qaytadan ishga tushadi
            (tasdiqlangan savollar bazada qoladi). Davom etasizmi?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Bekor qilish
            </Button>
            <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
              Boshlash
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ── Fan tasdiqlash ──────────────────────────────────────────────────────────

function SubjectCard({ book }: { book: Book }) {
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
      toast.success('Fan tasdiqlandi');
      qc.invalidateQueries({ queryKey: ['book', book.id] });
      qc.invalidateQueries({ queryKey: ['subjects-dropdown'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">1. Fanni belgilash</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bu kitobdan chiqadigan barcha savollar mobil ilovada shu fan ostida ko'rinadi
          </p>
        </div>
        {book.subject_id ? (
          <Badge color="green">Belgilangan: {book.subject_name}</Badge>
        ) : (
          <Badge color="yellow">Belgilanmagan</Badge>
        )}
      </div>

      {proposal?.name && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          AI taklifi: <b>{proposal.name}</b>
          {proposal.is_new && ' (yangi fan)'} · ishonch:{' '}
          <Badge
            color={
              proposal.confidence === 'high'
                ? 'green'
                : proposal.confidence === 'medium'
                  ? 'yellow'
                  : 'red'
            }
          >
            {proposal.confidence}
          </Badge>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        {creatingNew ? (
          <Input
            label="Yangi fan nomi"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Masalan: Tarix"
          />
        ) : (
          <Select
            label="Fan"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">— Tanlang —</option>
            {subjects?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          label="Sinf (1-11)"
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
          {creatingNew ? 'Mavjud fandan tanlash' : '+ Yangi fan yaratish'}
        </Button>
        <Button
          loading={mutation.isPending}
          disabled={creatingNew ? !newName.trim() : !subjectId}
          onClick={() => mutation.mutate()}
        >
          <Check className="w-4 h-4" /> Tasdiqlash
        </Button>
      </div>
    </Card>
  );
}

// ── Mavzular ────────────────────────────────────────────────────────────────

function TopicsSection({ book }: { book: Book }) {
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
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const confirmAllMutation = useMutation({
    mutationFn: () => booksApi.confirmAllTopics(book.id),
    onSuccess: () => {
      toast.success('Barcha mavzular tasdiqlandi');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const deleteMutation = useMutation({
    mutationFn: (topicId: number) => booksApi.deleteTopic(book.id, topicId),
    onSuccess: () => {
      toast.success("Mavzu o'chirildi");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      booksApi.createTopic(book.id, {
        title: newTopic.title,
        start_page: Number(newTopic.start_page),
        end_page: Number(newTopic.end_page),
      }),
    onSuccess: () => {
      toast.success("Mavzu qo'shildi");
      setAdding(false);
      setNewTopic({ title: '', start_page: '', end_page: '' });
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            2. Mavzular va sahifa chegaralari{' '}
            <span className="text-sm font-normal text-gray-500">
              ({topics?.filter((t) => t.is_confirmed).length ?? 0}/{topics?.length ?? 0} tasdiqlangan)
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Savollar aynan shu sahifa oralig'idagi matndan tuziladi — 👁 bilan chegarani tekshirib
            tasdiqlang. <b>"Mobil ilova mavzusi"</b>: savol qo'shilganda ilovadagi qaysi mavzu ostiga
            tushishini belgilaydi — tanlamasangiz, kitob mavzusi nomi bilan yangi mavzu avtomatik
            ochiladi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Mavzu qo'shish
          </Button>
          <Button
            size="sm"
            loading={confirmAllMutation.isPending}
            onClick={() => confirmAllMutation.mutate()}
            disabled={!topics?.length}
          >
            <CheckCheck className="w-4 h-4" /> Hammasini tasdiqlash
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : !topics?.length ? (
        <EmptyState message="Mavzular topilmadi — qo'lda qo'shishingiz mumkin" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#', 'Mavzu', 'Sahifalar', 'Mobil ilova mavzusi', 'Savollar', 'Chegara', ''].map((h) => (
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
                        <option value="">Avto: yangi mavzu ochiladi</option>
                        {realTopics?.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {Number(topic.draft_count) || 0} draft / {Number(topic.approved_count) || 0} ✓
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            topicId: topic.id,
                            body: { is_confirmed: !topic.is_confirmed },
                          })
                        }
                        title={topic.is_confirmed ? 'Tasdiqni bekor qilish' : 'Tasdiqlash'}
                      >
                        {topic.is_confirmed ? (
                          <Badge color="green">Chegara OK</Badge>
                        ) : (
                          <Badge color="yellow">Tekshirilmagan</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sahifa matnini ko'rish"
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
      <Modal open={adding} onClose={() => setAdding(false)} title="Mavzu qo'shish">
        <div className="space-y-3">
          <Input
            label="Mavzu nomi"
            value={newTopic.title}
            onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Boshlanish sahifasi"
              type="number"
              value={newTopic.start_page}
              onChange={(e) => setNewTopic({ ...newTopic, start_page: e.target.value })}
            />
            <Input
              label="Tugash sahifasi"
              type="number"
              value={newTopic.end_page}
              onChange={(e) => setNewTopic({ ...newTopic, end_page: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Bekor qilish
            </Button>
            <Button
              loading={createMutation.isPending}
              disabled={!newTopic.title || !newTopic.start_page || !newTopic.end_page}
              onClick={() => createMutation.mutate()}
            >
              Qo'shish
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
      title={topic ? `"${topic.title}" — sahifa tekshiruvi` : ''}
      size="lg"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFrom(Math.max(1, effectiveFrom - 1))}
          >
            ← Oldingi
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {effectiveFrom}-sahifa (mavzu: {topic?.start_page}–{topic?.end_page})
          </span>
          <Button variant="outline" size="sm" onClick={() => setFrom(effectiveFrom + 1)}>
            Keyingi →
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
                <p className="text-xs font-semibold text-gray-400 mb-1">— {p.page_no}-sahifa —</p>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  {p.text || '(bo\'sh sahifa yoki matn qatlami yo\'q)'}
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
      toast.success('Generatsiya boshlandi');
      qc.invalidateQueries({ queryKey: ['book-jobs', book.id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: number) => booksApi.cancelJob(jobId),
    onSuccess: () => {
      toast.success('Job bekor qilindi');
      qc.invalidateQueries({ queryKey: ['book-jobs', book.id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const confirmedTopics = useMemo(() => topics?.filter((t) => t.is_confirmed) ?? [], [topics]);
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
        <Sparkles className="w-4 h-4 text-primary-600" /> 3. Savol generatsiyasi
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
                    allSelected ? new Set() : new Set(confirmedTopics.map((t) => t.id))
                  )
                }
              />
              Hammasini tanlash ({confirmedTopics.length} mavzu)
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg p-2">
            {confirmedTopics.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-0.5"
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(t.id)) next.delete(t.id);
                    else next.add(t.id);
                    setSelected(next);
                  }}
                />
                <span className="truncate">{t.title}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  ({t.start_page}–{t.end_page})
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <Input
              label="Har mavzuga savol"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
            <Input
              label="Oson %"
              type="number"
              value={difficulty.easy}
              onChange={(e) => setDifficulty({ ...difficulty, easy: e.target.value })}
            />
            <Input
              label="O'rta %"
              type="number"
              value={difficulty.medium}
              onChange={(e) => setDifficulty({ ...difficulty, medium: e.target.value })}
            />
            <Input
              label="Qiyin %"
              type="number"
              value={difficulty.hard}
              onChange={(e) => setDifficulty({ ...difficulty, hard: e.target.value })}
            />
            <Button
              loading={generateMutation.isPending}
              disabled={selected.size === 0 || diffSum <= 0}
              onClick={() => generateMutation.mutate()}
            >
              <Play className="w-4 h-4" /> Boshlash
            </Button>
          </div>
          {diffSum <= 0 ? (
            <p className="text-xs text-red-500">
              Kamida bitta qiyinlik darajasiga 0 dan katta qiymat kiriting
            </p>
          ) : (
            diffSum !== 100 && (
              <p className="text-xs text-gray-400">
                Nisbatlar avtomatik 100% ga keltiriladi: oson{' '}
                {Math.round(((Number(difficulty.easy) || 0) / diffSum) * 100)}% · o'rta{' '}
                {Math.round(((Number(difficulty.medium) || 0) / diffSum) * 100)}% · qiyin{' '}
                {Math.round(((Number(difficulty.hard) || 0) / diffSum) * 100)}%
              </p>
            )
          )}
          <p className="text-xs text-gray-400">
            Tanlangan: {selected.size} mavzu × {count} savol = ~{selected.size * (Number(count) || 0)}{' '}
            savol
            {estimate && (
              <>
                {' · '}smeta: ~{Math.round((estimate.input_tokens + estimate.output_tokens) / 1000)}K
                token · <b className="text-gray-600 dark:text-gray-300">~${estimate.est_cost_usd}</b>
                {estimate.batch_mode && ' (batch, 50% chegirma hisobga olingan)'}
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
                Job #{j.id}: <b>{j.status}</b> — {j.questions_created} savol,{' '}
                {j.topics_done}/{j.topics_total} mavzu, {(j.input_tokens / 1000).toFixed(0)}K in /{' '}
                {(j.output_tokens / 1000).toFixed(0)}K out token
                {j.error ? ` · xato: ${j.error}` : ''}
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
  const pct = job.topics_total ? Math.round((job.topics_done / job.topics_total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Spinner size="sm" />
          {job.batch_name
            ? `Batch rejimda ishlanmoqda (50% tejamkor) — natija bir yo'la keladi`
            : `Generatsiya ketmoqda: ${job.topics_done}/${job.topics_total} mavzu · ${job.questions_created} savol yaratildi`}
        </p>
        <Button variant="outline" size="sm" onClick={() => onCancel(job.id)}>
          <StopCircle className="w-4 h-4" /> To'xtatish
        </Button>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-primary-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        Token: {(job.input_tokens / 1000).toFixed(0)}K in / {(job.output_tokens / 1000).toFixed(0)}K
        out
      </p>
    </div>
  );
}

// ── Draft savollar (review) ────────────────────────────────────────────────

function DraftsSection({ book }: { book: Book }) {
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
      toast.success("✓ Savol bazaga qo'shildi — mobil ilovada chiqadi");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const rejectMutation = useMutation({
    mutationFn: (qid: number) => booksApi.rejectDraft(qid),
    onSuccess: () => {
      toast('Savol rad etildi — hech qayerda ishlatilmaydi', { icon: '🗑' });
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (scope: 'book' | 'topic') =>
      booksApi.bulkApprove(
        book.id,
        scope === 'book' ? { all_ready: true } : { book_topic_id: Number(topicFilter) }
      ),
    onSuccess: (res) => {
      toast.success(`${res.data.data.approved_count} ta savol bazaga qo'shildi`);
      setBulkConfirm(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  const drafts = data?.data ?? [];
  const total =
    (summary?.pending ?? 0) +
    (summary?.needs_review ?? 0) +
    (summary?.approved ?? 0) +
    (summary?.rejected ?? 0);
  const reviewed = (summary?.approved ?? 0) + (summary?.rejected ?? 0);

  const statusTabs: Array<{ value: string; label: string; count: number; color: string }> = [
    {
      value: 'pending',
      label: 'Kutilmoqda',
      count: summary?.pending ?? 0,
      color: 'text-yellow-600',
    },
    {
      value: 'needs_review',
      label: 'Diqqat kerak',
      count: summary?.needs_review ?? 0,
      color: 'text-orange-600',
    },
    {
      value: 'approved',
      label: "Bazaga qo'shilgan",
      count: summary?.approved ?? 0,
      color: 'text-green-600',
    },
    {
      value: 'rejected',
      label: 'Rad etilgan',
      count: summary?.rejected ?? 0,
      color: 'text-red-500',
    },
  ];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            4. Savollarni bazaga qo'shish
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            AI yaratgan savollar avval shu yerda "draft" bo'lib turadi va{' '}
            <b>mobil ilovada ko'rinmaydi</b>. Siz "Bazaga qo'shish" bosgan savollargina o'quvchilarga
            chiqadi. "Diqqat kerak" dagilarni tahrirlab qo'shing yoki rad eting.
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
              ? `Shu mavzu tayyorlarini qo'shish (${summary?.ready ?? 0})`
              : `Barcha tayyorlarni qo'shish (${summary?.ready ?? 0})`}
          </Button>
          {total > 0 && (
            <p className="text-xs text-gray-400">
              {total} tadan {reviewed} tasi ko'rib chiqilgan
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
          <option value="">Barcha mavzular</option>
          {topics?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
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
            statusFilter === 'pending'
              ? "Bu bo'limda savol qolmadi — boshqa tabni tekshiring"
              : "Bu bo'limda savol yo'q"
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
        title="Ommaviy bazaga qo'shish"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {bulkConfirm === 'book'
              ? `Kitobdagi barcha tayyor (manbasi tasdiqlangan, "Kutilmoqda" holatidagi) ${summary?.ready ?? 0} ta savol bazaga qo'shiladi va mobil ilovada chiqa boshlaydi.`
              : `Shu mavzudagi ${summary?.ready ?? 0} ta tayyor savol bazaga qo'shiladi.`}{' '}
            "Diqqat kerak" dagilar qo'shilmaydi — ularni alohida ko'rib chiqasiz. Davom etasizmi?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkConfirm(null)}>
              Bekor qilish
            </Button>
            <Button
              loading={bulkApproveMutation.isPending}
              onClick={() => bulkConfirm && bulkApproveMutation.mutate(bulkConfirm)}
            >
              <CheckCheck className="w-4 h-4" /> Qo'shish
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
              Sifat: {draft.quality_score}/10
            </Badge>
          )}
          <Badge color={DIFFICULTY_COLORS[draft.difficulty] ?? 'gray'}>{draft.difficulty}</Badge>
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
        <p className="text-xs text-gray-500 dark:text-gray-400">Izoh: {draft.explanation}</p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-2">
          {draft.grounded ? (
            <span title={draft.source_quote || ''}>
              <Badge color="green">Manba tasdiqlangan · {draft.source_page}-sahifa</Badge>
            </span>
          ) : (
            <span title={draft.flag_reason || ''}>
              <Badge color="orange">Diqqat: {draft.flag_reason || 'manba tasdiqlanmagan'}</Badge>
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
              <Badge color="green">✓ Bazaga qo'shilgan — mobil ilovada chiqadi</Badge>
            ) : (
              <Badge color="red">Rad etilgan — ishlatilmaydi</Badge>
            )}
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={onEdit} title="Savolni tahrirlash">
              <Pencil className="w-4 h-4" /> Tahrirlash
            </Button>
            <Button variant="outline" size="sm" onClick={onReject} title="Savol yaroqsiz — ishlatilmasin">
              <ThumbsDown className="w-4 h-4 text-red-500" /> Rad etish
            </Button>
            <Button size="sm" onClick={onApprove} title="Savol bazaga qo'shiladi va mobil ilovada chiqadi">
              <ThumbsUp className="w-4 h-4" /> Bazaga qo'shish
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
      toast.success('Draft yangilandi');
      onSaved();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Xato'),
  });

  if (!draft || !form) return null;

  return (
    <Modal open={!!draft} onClose={onClose} title="Savolni tahrirlash" size="lg">
      <div className="space-y-3">
        <Input
          label="Savol matni"
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />
        <Select
          label="Qiyinlik"
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="easy">Oson</option>
          <option value="medium">O'rta</option>
          <option value="hard">Qiyin</option>
        </Select>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Variantlar (to'g'ri javobni belgilang)
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
          label="Izoh"
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Saqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
