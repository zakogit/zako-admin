import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, Trash2, Sparkles } from 'lucide-react';
import { booksApi } from '../../api/services';
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

export const STATUS_LABELS: Record<Book['status'], { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange' }> = {
  uploaded: { label: 'Navbatda', color: 'gray' },
  extracting: { label: 'Matn ajratilmoqda', color: 'blue' },
  analyzing: { label: 'AI tahlil qilmoqda', color: 'purple' },
  reanalyze: { label: 'Qayta tahlil', color: 'purple' },
  needs_review: { label: 'Tekshirish kerak', color: 'yellow' },
  ready: { label: 'Tayyor', color: 'green' },
  needs_ocr: { label: 'OCR kerak', color: 'orange' },
  failed: { label: 'Xato', color: 'red' },
};

export default function BooksPage() {
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
      toast.success('Kitob yuklandi — tahlil boshlandi');
      qc.invalidateQueries({ queryKey: ['books'] });
      navigate(`/books/${res.data.data.book_id}`);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || 'Yuklashda xato'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => booksApi.delete(id),
    onSuccess: () => {
      toast.success("Kitob o'chirildi");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "O'chirishda xato"),
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
            <Sparkles className="w-6 h-6 text-primary-600" /> AI Kitoblar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            PDF darslik yuklang — AI mavzularga bo'lib, test savollari yaratadi
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
            <Upload className="w-4 h-4" /> PDF yuklash
          </Button>
        </div>
      </div>

      {aiStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Shu oy AI sarfi"
            value={`$${aiStats.month.cost_usd}${aiStats.monthly_budget_usd ? ` / $${aiStats.monthly_budget_usd}` : ''}`}
            icon={<CalendarDays className="w-5 h-5" />}
            subtitle={`${aiStats.month.calls} chaqiruv`}
          />
          <StatCard
            title="Jami AI sarfi"
            value={`$${aiStats.total.cost_usd}`}
            icon={<Coins className="w-5 h-5" />}
            subtitle={`${Math.round((aiStats.total.input_tokens + aiStats.total.output_tokens) / 1000)}K token`}
          />
          <StatCard
            title="Draft savollar"
            value={aiStats.questions.drafts}
            icon={<FileQuestion className="w-5 h-5" />}
            subtitle={`${aiStats.questions.approved} tasdiqlangan`}
          />
          <StatCard
            title="O'rtacha sifat"
            value={aiStats.questions.avg_quality != null ? `${aiStats.questions.avg_quality}/10` : '—'}
            icon={<Star className="w-5 h-5" />}
            subtitle="AI hakam bahosi"
          />
        </div>
      )}

      <Table
        headers={['Kitob', 'Fan', 'Sinf', 'Sahifa', 'Status', 'Mavzular', 'Draftlar', 'Sana', '']}
        loading={isLoading}
      >
        {books.length === 0 && !isLoading ? (
          <tr>
            <td colSpan={9}>
              <EmptyState message="Hali kitob yuklanmagan" />
            </td>
          </tr>
        ) : (
          books.map((book) => {
            const st = STATUS_LABELS[book.status] ?? { label: book.status, color: 'gray' as const };
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
                  {book.grade ? `${book.grade}-sinf` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {book.page_count ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color={st.color}>{st.label}</Badge>
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
                  {new Date(book.created_at).toLocaleDateString()}
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
        title="Kitobni o'chirish"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <b>{deleteTarget?.title}</b> kitobi, uning mavzulari va draft savollari
            o'chiriladi. Bazaga tasdiqlangan savollar saqlanib qoladi. Davom etasizmi?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              O'chirish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
