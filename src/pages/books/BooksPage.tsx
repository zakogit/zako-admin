import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trans, useTranslation } from 'react-i18next';
import { Upload, Trash2, Sparkles } from 'lucide-react';
import { booksApi } from '../../api/services';
import { getIntlLocale } from '../../i18n';
import type { Book } from '../../types';
import {
  Table,
  Badge,
  Button,
  Pagination,
  EmptyState,
  Modal,
  StatCard,
} from '../../components/ui';
import { Coins, CalendarDays, FileQuestion, Star } from 'lucide-react';

const PROCESSING_STATUSES = ['uploaded', 'extracting', 'analyzing', 'reanalyze'];

// Badge colour per book status. The visible label is translated at render time
// via `books:status.<status>` (see BooksPage / BookDetailPage).
export const STATUS_COLORS: Record<Book['status'], 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange'> = {
  uploaded: 'gray',
  extracting: 'blue',
  analyzing: 'purple',
  reanalyze: 'purple',
  needs_review: 'yellow',
  ready: 'green',
  needs_ocr: 'orange',
  failed: 'red',
};

export default function BooksPage() {
  const { t } = useTranslation('books');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['books', page],
    queryFn: () => booksApi.getAll({ page, limit }).then((r) => r.data),
    refetchInterval: (query) => {
      const books = query.state.data?.data;
      return books?.some((b) => PROCESSING_STATUSES.includes(b.status)) ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => booksApi.upload(file),
    onSuccess: (res) => {
      toast.success(t('toast.uploaded'));
      qc.invalidateQueries({ queryKey: ['books'] });
      navigate(`/books/${res.data.data.book_id}`);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || t('toast.uploadError')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => booksApi.delete(id),
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || t('toast.deleteError')),
  });

  const { data: aiStats } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: () => booksApi.getAiStats().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const books = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" /> {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={uploadMutation.isPending}
          >
            <Upload className="w-4 h-4" /> {t('uploadPdf')}
          </Button>
        </div>
      </div>

      {aiStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title={t('stats.monthCost')}
            value={`$${aiStats.month.cost_usd}${aiStats.monthly_budget_usd ? ` / $${aiStats.monthly_budget_usd}` : ''}`}
            icon={<CalendarDays className="w-5 h-5" />}
            subtitle={t('stats.calls', { count: Number(aiStats.month.calls) || 0 })}
          />
          <StatCard
            title={t('stats.totalCost')}
            value={`$${aiStats.total.cost_usd}`}
            icon={<Coins className="w-5 h-5" />}
            subtitle={t('stats.tokens', {
              value: Math.round((aiStats.total.input_tokens + aiStats.total.output_tokens) / 1000),
            })}
          />
          <StatCard
            title={t('stats.draftQuestions')}
            value={aiStats.questions.drafts}
            icon={<FileQuestion className="w-5 h-5" />}
            subtitle={t('stats.approved', { value: aiStats.questions.approved })}
          />
          <StatCard
            title={t('stats.avgQuality')}
            value={aiStats.questions.avg_quality != null ? `${aiStats.questions.avg_quality}/10` : '—'}
            icon={<Star className="w-5 h-5" />}
            subtitle={t('stats.judgeScore')}
          />
        </div>
      )}

      <Table
        headers={[
          t('table.book'),
          t('common:table.subject'),
          t('table.grade'),
          t('table.pages'),
          t('common:table.status'),
          t('table.topics'),
          t('table.drafts'),
          t('common:table.date'),
          '',
        ]}
        loading={isLoading}
      >
        {books.length === 0 && !isLoading ? (
          <tr>
            <td colSpan={9}>
              <EmptyState message={t('empty')} />
            </td>
          </tr>
        ) : (
          books.map((book) => {
            const statusColor = STATUS_COLORS[book.status] ?? 'gray';
            const statusLabel = t(`status.${book.status}`, { defaultValue: book.status });
            const processing = PROCESSING_STATUSES.includes(book.status);
            return (
              <tr
                key={book.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => navigate(`/books/${book.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                  {book.title}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.subject_name || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.grade ? t('gradeValue', { grade: book.grade }) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.page_count ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color={statusColor}>{statusLabel}</Badge>
                    {processing && (
                      <span className="text-xs text-gray-400">{book.progress}%</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.topic_count ?? 0}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.draft_count ?? 0}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(book.created_at).toLocaleDateString(getIntlLocale())}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(book);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            );
          })
        )}
      </Table>

      <Pagination page={page} total={data?.total ?? 0} limit={limit} onChange={setPage} />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('deleteModal.title')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {/* The book title is user data: escape it so it can never be parsed as markup. */}
            <Trans
              i18nKey="books:deleteModal.body"
              values={{ title: deleteTarget?.title ?? '' }}
              components={{ b: <b /> }}
              shouldUnescape
              tOptions={{ interpolation: { escapeValue: true } }}
            />
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('common:actions.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
