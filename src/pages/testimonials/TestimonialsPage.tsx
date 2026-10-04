import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, MessageSquareQuote, Upload } from 'lucide-react';
import { testimonialsApi } from '../../api/services';
import { Table, Badge, Button, Modal, EmptyState, LazyImage } from '../../components/ui';
import { getStaticFileUrl } from '../../utils/helpers';
import type { Testimonial } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import type { AxiosError } from 'axios';

interface TestimonialFormValues {
  author_name: string;
  title: string;
  body: string;
  sort_order: number;
  is_published: boolean;
}

const errorMessage = (error: unknown, fallback: string) =>
  (error as AxiosError<{ message?: string }>).response?.data?.message || fallback;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export default function TestimonialsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Testimonial | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: testimonialsData, isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: () => testimonialsApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TestimonialFormValues>();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-testimonials'] });

  const createMutation = useMutation({
    mutationFn: (body: TestimonialFormValues) => testimonialsApi.create(body),
    onSuccess: () => {
      toast.success("Fikr qo'shildi");
      setEditModal(false);
      reset();
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Fikr qo'shishda xatolik")),
  });

  const updateMutation = useMutation({
    mutationFn: (body: TestimonialFormValues) => testimonialsApi.update(selected!.id, body),
    onSuccess: () => {
      toast.success('Fikr yangilandi');
      setEditModal(false);
      setSelected(null);
      reset();
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Fikrni yangilashda xatolik')),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      testimonialsApi.uploadAvatar(id, formData),
    onSuccess: () => {
      toast.success('Rasm yuklandi');
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, 'Rasm yuklashda xatolik')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => testimonialsApi.delete(id),
    onSuccess: () => {
      toast.success("Fikr o'chirildi");
      setDeleteModal(false);
      setSelected(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Fikrni o'chirishda xatolik")),
  });

  const testimonials: Testimonial[] = Array.isArray(testimonialsData?.data) ? testimonialsData.data : [];

  const openEditModal = (testimonial?: Testimonial) => {
    setSelected(testimonial || null);
    if (testimonial) {
      reset({
        author_name: testimonial.author_name,
        title: testimonial.title,
        body: testimonial.body,
        sort_order: testimonial.sort_order,
        is_published: testimonial.is_published,
      });
    } else {
      const nextOrder = testimonials.reduce((max, t) => Math.max(max, t.sort_order), 0) + 1;
      reset({ author_name: '', title: '', body: '', sort_order: nextOrder, is_published: true });
    }
    setEditModal(true);
  };

  const onSubmit = (data: TestimonialFormValues) => {
    if (selected) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAvatarUpload = (testimonial: Testimonial, event: React.ChangeEvent<HTMLInputElement>) => {
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
    uploadAvatarMutation.mutate({ id: testimonial.id, formData });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-primary-500" />
            Fikrlar <span className="text-gray-400 font-normal text-base">({testimonials.length})</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Landing saytining «Fikrlar» bo'limi — ko'rinadigan fikrlar zakoapp.uz da tartib bo'yicha navbat bilan almashadi
          </p>
        </div>

        <Button onClick={() => openEditModal()} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Fikr qo'shish
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : testimonials.length === 0 ? (
          <EmptyState message="Fikrlar topilmadi" />
        ) : (
          <Table headers={['Rasm', 'Muallif', 'Fikr', 'Tartib', 'Holat', '']}>
            {testimonials.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {t.avatar_url ? (
                      <LazyImage
                        src={getStaticFileUrl(t.avatar_url)}
                        alt={t.author_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 text-sm font-semibold flex items-center justify-center">
                        {initials(t.author_name)}
                      </div>
                    )}
                    <label className="cursor-pointer text-blue-600 hover:text-blue-700" title="Rasm yuklash">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarUpload(t, e)}
                      />
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {t.author_name}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white max-w-md truncate" title={t.title}>
                    {t.title}
                  </div>
                  <div className="text-xs text-gray-500 max-w-md truncate" title={t.body}>
                    {t.body}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-sm">{t.sort_order}</td>
                <td className="px-4 py-3">
                  <Badge color={t.is_published ? 'green' : 'gray'}>
                    {t.is_published ? "Ko'rinadi" : 'Yashirin'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(t)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => { setSelected(t); setDeleteModal(true); }}
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
        title={selected ? 'Fikrni tahrirlash' : "Fikr qo'shish"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Muallif ismi *</label>
            <input
              {...register('author_name', { required: 'Ism majburiy' })}
              placeholder="Asliddin Muminov"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.author_name && <p className="text-red-500 text-xs mt-1">{String(errors.author_name.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sarlavha *</label>
            <input
              {...register('title', { required: 'Sarlavha majburiy' })}
              placeholder="Oddiy test ishlashdan ko'ra duel qilish ancha qiziqroq."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{String(errors.title.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fikr matni *</label>
            <textarea
              {...register('body', { required: 'Fikr matni majburiy' })}
              rows={5}
              placeholder="Foydalanuvchining to'liq fikri (qo'shtirnoqsiz — saytda o'zi qo'yiladi)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.body && <p className="text-red-500 text-xs mt-1">{String(errors.body.message)}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tartib raqami</label>
              <input
                type="number"
                {...register('sort_order', { valueAsNumber: true })}
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                {...register('is_published')}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium">Ko'rinadi (saytda chiqadi)</span>
            </label>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kichik tartib raqami birinchi chiqadi. Muallif rasmi jadvaldagi yuklash tugmasi orqali alohida yuklanadi
            (avval fikrni saqlang); rasm bo'lmasa saytda ism bosh harflari ko'rsatiladi.
          </p>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? 'Saqlash' : "Qo'shish"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Fikrni o'chirish">
        <div className="space-y-4">
          <p>
            <strong>{selected?.author_name}</strong> fikrini o'chirishni tasdiqlaysizmi?
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
