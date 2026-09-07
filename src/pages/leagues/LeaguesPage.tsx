import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Trophy, Upload, Zap, Save } from 'lucide-react';
import { leaguesApi, duelsApi } from '../../api/services';
import type { DuelConfig } from '../../api/services';
import { Table, Badge, Button, Modal, EmptyState, LazyImage, Card } from '../../components/ui';
import { getStaticFileUrl } from '../../utils/helpers';
import type { League } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface LeagueFormValues {
  name: string;
  description?: string;
  min_xp: number;
  max_xp: number;
  sort_order: number;
  is_active: boolean;
}

/**
 * XP qoidalari (spec §7 "League settings": win XP / lose XP). duel_settings'da
 * saqlanadi; duel yakunida calculateRewards shu qiymatlarni ishlatadi.
 */
function XpRulesCard() {
  const qc = useQueryClient();
  const [win, setWin] = useState(24);
  const [lose, setLose] = useState(-18);
  const [draw, setDraw] = useState(12);
  const [seeded, setSeeded] = useState<DuelConfig | null>(null);

  const { data: config } = useQuery({
    queryKey: ['duel-config'],
    queryFn: () => duelsApi.getConfig().then(r => r.data.data),
  });

  // Server config kelganda formani to'ldirish — render vaqtida derived state
  if (config && config !== seeded) {
    setSeeded(config);
    setWin(config.xpWin);
    setLose(config.xpLose);
    setDraw(config.xpDraw);
  }

  const save = useMutation({
    mutationFn: () => duelsApi.updateConfig({ xp_win: win, xp_lose: lose, xp_draw: draw }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message || 'Saqlandi');
      qc.invalidateQueries({ queryKey: ['duel-config'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Saqlashda xatolik'),
  });

  const dirty = !!config && (win !== config.xpWin || lose !== config.xpLose || draw !== config.xpDraw);
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            XP qoidalari
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Har duel yakunida o'yinchiga beriladigan XP. Reyting deltasi ham shu qiymatda. Karta effektlari ustiga qo'llanadi.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 md:w-[420px]">
          <div>
            <label className="block text-xs font-medium mb-1 text-green-700 dark:text-green-400">Yutuq (win XP)</label>
            <input type="number" min={0} max={1000} value={win} onChange={e => setWin(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-red-700 dark:text-red-400">Mag'lubiyat (lose XP)</label>
            <input type="number" min={-1000} max={0} value={lose} onChange={e => setLose(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Durang</label>
            <input type="number" min={-1000} max={1000} value={draw} onChange={e => setDraw(Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!config || !dirty} className="whitespace-nowrap">
          <Save className="w-4 h-4 mr-2" />
          Saqlash
        </Button>
      </div>
    </Card>
  );
}

export default function LeaguesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<League | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { data: leaguesData, isLoading } = useQuery({
    queryKey: ['admin-leagues'],
    queryFn: () => leaguesApi.getAll().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeagueFormValues>();

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-leagues'] });

  const createMutation = useMutation({
    mutationFn: (body: LeagueFormValues) => leaguesApi.create(body),
    onSuccess: () => {
      toast.success('Liga yaratildi');
      setEditModal(false);
      reset();
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Liga yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: (body: LeagueFormValues) => leaguesApi.update(selected!.id, body),
    onSuccess: () => {
      toast.success('Liga yangilandi');
      setEditModal(false);
      setSelected(null);
      reset();
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Ligani yangilashda xatolik'),
  });

  const uploadIconMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      leaguesApi.uploadIcon(id, formData),
    onSuccess: () => {
      toast.success('Ikonka yuklandi');
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || 'Ikonka yuklashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leaguesApi.delete(id),
    onSuccess: () => {
      toast.success("Liga o'chirildi");
      setDeleteModal(false);
      setSelected(null);
      invalidate();
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Ligani o'chirishda xatolik"),
  });

  const leagues: League[] = Array.isArray(leaguesData?.data) ? leaguesData.data : [];

  const openEditModal = (league?: League) => {
    setSelected(league || null);
    if (league) {
      reset({
        name: league.name,
        description: league.description || '',
        min_xp: league.min_xp,
        max_xp: league.max_xp,
        sort_order: league.sort_order,
        is_active: league.is_active,
      });
    } else {
      reset({
        name: '',
        description: '',
        min_xp: 0,
        max_xp: 1000,
        sort_order: leagues.length + 1,
        is_active: true,
      });
    }
    setEditModal(true);
  };

  const onSubmit = (data: LeagueFormValues) => {
    const body = {
      ...data,
      min_xp: Number(data.min_xp),
      max_xp: Number(data.max_xp),
      sort_order: Number(data.sort_order),
    };
    if (selected) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  };

  const handleIconUpload = (league: League, event: React.ChangeEvent<HTMLInputElement>) => {
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
    uploadIconMutation.mutate({ id: league.id, formData });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leagues <span className="text-gray-400 font-normal text-base">({leagues.length})</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            XP asosidagi ligalar — mobil ilovadagi profil va ZAKO ligasi sahifasini boshqaradi
          </p>
        </div>

        <Button onClick={() => openEditModal()} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Liga qo'shish
        </Button>
      </div>

      {/* XP qoidalari (win / lose / draw) */}
      <XpRulesCard />

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : leagues.length === 0 ? (
          <EmptyState message="Ligalar topilmadi" />
        ) : (
          <Table headers={['Ikonka', 'Nomi', 'XP oralig\'i', 'Tartib', 'Holat', '']}>
            {leagues.map((league) => (
              <tr key={league.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {league.icon_url ? (
                      <LazyImage
                        src={getStaticFileUrl(league.icon_url)}
                        alt={league.name}
                        className="w-12 h-12 rounded object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <label
                      className="cursor-pointer text-blue-600 hover:text-blue-700"
                      title="Ikonka yuklash"
                    >
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleIconUpload(league, e)}
                      />
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{league.name}</div>
                  {league.description && (
                    <div className="text-xs text-gray-500 max-w-xs truncate" title={league.description}>
                      {league.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                  {league.min_xp.toLocaleString()} – {league.max_xp.toLocaleString()} XP
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">{league.sort_order}</td>
                <td className="px-4 py-3">
                  <Badge color={league.is_active ? 'green' : 'gray'}>
                    {league.is_active ? 'Faol' : 'Nofaol'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(league)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => { setSelected(league); setDeleteModal(true); }}
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
        title={selected ? 'Ligani tahrirlash' : 'Liga qo\'shish'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nomi *</label>
            <input
              {...register('name', { required: 'Liga nomi majburiy' })}
              placeholder="GOLD"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{String(errors.name.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tavsif</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Bu 1 000 dan ko'proq XP to'plagan foydalanuvchilar joylashgan liga."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min XP *</label>
              <input
                type="number"
                {...register('min_xp', { required: 'Min XP majburiy', min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.min_xp && <p className="text-red-500 text-xs mt-1">Min XP 0 dan kichik bo'lmasligi kerak</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max XP *</label>
              <input
                type="number"
                {...register('max_xp', { required: 'Max XP majburiy', min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.max_xp && <p className="text-red-500 text-xs mt-1">Max XP majburiy</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tartib raqami</label>
              <input
                type="number"
                {...register('sort_order')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium">Faol</span>
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ikonka jadvaldagi yuklash tugmasi orqali alohida yuklanadi.
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
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Ligani o'chirish">
        <div className="space-y-4">
          <p>
            <strong>{selected?.name}</strong> ligasini o'chirishni tasdiqlaysizmi?
            Bu amalni qaytarib bo'lmaydi — odatda o'chirish o'rniga «Nofaol» qilish xavfsizroq.
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
