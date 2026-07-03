import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Newspaper, Upload } from 'lucide-react';
import { articlesApi } from '../../api/services';
import { Table, Badge, Button, Modal, EmptyState, LazyImage } from '../../components/ui';
import { getStaticFileUrl, formatDate } from '../../utils/helpers';
import type { Article } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface ArticleFormValues {
  title: string;
  excerpt?: string;
  body: string;
  is_published: boolean;
}

export default function ArticlesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Article | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['admin-articles'],
    queryFn: () => articlesApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ArticleFormValues>();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-articles'] });

  const createMutation = useMutation({
    mutationFn: (body: ArticleFormValues) => articlesApi.create(body),
    onSuccess: () => {
      toast.success('Maqola yaratildi');
      setEditModal(false);
      reset();
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Maqola yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: ArticleFormValues) => articlesApi.update(selected!.id, body),
    onSuccess: () => {
      toast.success('Maqola yangilandi');
      setEditModal(false);
      setSelected(null);
      reset();
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Maqolani yangilashda xatolik'),
  });

  const uploadCoverMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      articlesApi.uploadCover(id, formData),
    onSuccess: () => {
      toast.success('Muqova yuklandi');
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Muqova yuklashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => articlesApi.delete(id),
    onSuccess: () => {
      toast.success("Maqola o'chirildi");
      setDeleteModal(false);
      setSelected(null);
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Maqolani o'chirishda xatolik"),
  });

  const articles: Article[] = Array.isArray(articlesData?.data) ? articlesData.data : [];

  const openEditModal = (article?: Article) => {
    setSelected(article || null);
    if (article) {
      reset({
        title: article.title,
        excerpt: article.excerpt || '',
        body: article.body,
        is_published: article.is_published,
      });
    } else {
      reset({ title: '', excerpt: '', body: '', is_published: true });
    }
    setEditModal(true);
  };

  const onSubmit = (data: ArticleFormValues) => {
    if (selected) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCoverUpload = (article: Article, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari qabul qilinadi');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fayl hajmi 5MB dan oshmasligi kerak');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    uploadCoverMutation.mutate({ id: article.id, formData });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-primary-500" />
            Maqolalar <span className="text-gray-400 font-normal text-base">({articles.length})</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Landing saytining «Maqolalar» bo'limi — bu yerda qo'shilgan maqolalar zakoapp.uz da chiqadi
          </p>
        </div>

        <Button onClick={() => openEditModal()} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Maqola qo'shish
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : articles.length === 0 ? (
          <EmptyState message="Maqolalar topilmadi" />
        ) : (
          <Table headers={['Muqova', 'Sarlavha', 'Holat', 'Sana', '']}>
            {articles.map((article) => (
              <tr key={article.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {article.cover_image_url ? (
                      <LazyImage
                        src={getStaticFileUrl(article.cover_image_url)}
                        alt={article.title}
                        className="w-16 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <label className="cursor-pointer text-blue-600 hover:text-blue-700" title="Muqova yuklash">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoverUpload(article, e)}
                      />
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white max-w-md truncate" title={article.title}>
                    {article.title}
                  </div>
                  <div className="text-xs text-gray-400">/{article.slug}</div>
                  {article.excerpt && (
                    <div className="text-xs text-gray-500 max-w-md truncate" title={article.excerpt}>
                      {article.excerpt}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge color={article.is_published ? 'green' : 'gray'}>
                    {article.is_published ? 'Chop etilgan' : 'Qoralama'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm whitespace-nowrap">
                  {article.created_at ? formatDate(article.created_at) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(article)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => { setSelected(article); setDeleteModal(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={editModal}
        onClose={() => { setEditModal(false); setSelected(null); }}
        title={selected ? 'Maqolani tahrirlash' : 'Maqola qo\'shish'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sarlavha *</label>
            <input
              {...register('title', { required: 'Sarlavha majburiy' })}
              placeholder="ZAKO nima? Bilim jang maydoni haqida batafsil"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{String(errors.title.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Qisqa tavsif (excerpt)</label>
            <textarea
              {...register('excerpt')}
              rows={2}
              placeholder="Ro'yxatda ko'rinadigan qisqa matn"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Matn (Markdown) *</label>
            <textarea
              {...register('body', { required: 'Matn majburiy' })}
              rows={12}
              placeholder={"## Sarlavha\n\nParagraf matni. **Qalin**, *kursiv* va ro'yxatlar:\n\n- birinchi band\n- ikkinchi band"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
            {errors.body && <p className="text-red-500 text-xs mt-1">{String(errors.body.message)}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Markdown qo'llab-quvvatlanadi: # sarlavha, **qalin**, *kursiv*, - ro'yxat, [havola](url).
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_published')}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium">Chop etilgan (saytda ko'rinadi)</span>
            </label>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Muqova rasm jadvaldagi yuklash tugmasi orqali alohida yuklanadi (avval maqolani saqlang).
          </p>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? 'Saqlash' : 'Qo\'shish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Maqolani o'chirish">
        <div className="space-y-4">
          <p>
            <strong>{selected?.title}</strong> maqolasini o'chirishni tasdiqlaysizmi?
            Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              loading={deleteMutation.isPending}
            >
              O'chirish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
