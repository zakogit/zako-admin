import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trophy, Save, Send, Eye, Clock, RotateCcw, UserX, Medal } from 'lucide-react';
import { Button, Card, Spinner, Table, Badge, Modal, EmptyState } from '../../components/ui';
import { leaderboardApi } from '../../api/services';
import type { TopPlayerRow } from '../../api/services';
import { formatDate, formatNumber, getStaticFileUrl } from '../../utils/helpers';

const DAYS = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

const LIMITS = [10, 50, 100] as const;
type Limit = (typeof LIMITS)[number];

const rankColor = (rank: number) =>
  rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-gray-500';

/**
 * Leaderboard (spec §6): umumiy reyting Top 10/50/100 + XP reset / player remove,
 * pastda haftalik TOP-10 Telegram posti jadvali.
 */
export default function LeaderboardPage() {
  const qc = useQueryClient();
  const [limit, setLimit] = useState<Limit>(10);
  const [target, setTarget] = useState<TopPlayerRow | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [removeModal, setRemoveModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');

  const { data: top, isLoading: topLoading } = useQuery({
    queryKey: ['lb-top', limit],
    queryFn: () => leaderboardApi.getTop(limit).then((r) => r.data.data),
  });

  const invalidateTop = () => {
    qc.invalidateQueries({ queryKey: ['lb-top'] });
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const resetXp = useMutation({
    mutationFn: (id: number) => leaderboardApi.resetXp(id).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(`${d.message} (oldingi: ${formatNumber(d.data.previous_xp)} XP)`);
      setResetModal(false);
      setTarget(null);
      invalidateTop();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'XP reset xatolik'),
  });

  const remove = useMutation({
    mutationFn: (v: { id: number; reason: string }) => leaderboardApi.remove(v.id, v.reason).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      setRemoveModal(false);
      setTarget(null);
      setRemoveReason('');
      invalidateTop();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Chiqarishda xatolik'),
  });

  // ── Haftalik TOP-10 Telegram jadvali ───────────────────────────────────
  const [enabled, setEnabled] = useState(true);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState('20:00');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<unknown>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lb-schedule'],
    queryFn: () => leaderboardApi.getSchedule().then((r) => r.data.data),
  });

  // Server jadvali kelganda formani to'ldirish — render vaqtida derived state
  if (data && data !== seeded) {
    setSeeded(data);
    setEnabled(data.enabled);
    setDay(data.day);
    setTime(data.time);
  }

  const save = useMutation({
    mutationFn: () => leaderboardApi.updateSchedule({ enabled, day, time }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Saqlandi');
      qc.invalidateQueries({ queryKey: ['lb-schedule'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Saqlashda xatolik'),
  });

  const preview = useMutation({
    mutationFn: () => leaderboardApi.preview().then((r) => r.data),
    onSuccess: (d) => {
      setPreviewUrl(`${getStaticFileUrl(d.data.image_url)}?t=${Date.now()}`);
      toast.success(`${d.data.entries.length} ta o'yinchi`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  });

  const send = useMutation({
    mutationFn: () => leaderboardApi.sendNow().then((r) => r.data),
    onSuccess: (d) => (d.success ? toast.success(d.message) : toast.error(d.message)),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Yuborishda xatolik'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Umumiy reyting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Medal className="w-6 h-6 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reyting</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Umumiy XP bo'yicha eng yaxshi o'yinchilar · bloklanganlar ko'rsatilmaydi
            </p>
          </div>
        </div>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm self-start">
          {LIMITS.map((l) => (
            <button
              key={l}
              onClick={() => setLimit(l)}
              className={
                limit === l
                  ? 'px-4 py-2 font-medium bg-primary-600 text-white'
                  : 'px-4 py-2 font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            >
              Top {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {topLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !top || top.length === 0 ? (
          <EmptyState message="Reyting bo'sh" />
        ) : (
          <Table headers={['#', "O'yinchi", 'Liga', 'XP', 'Reyting', 'Duellar', 'Viloyat', "Ro'yxatdan", '']}>
            {top.map((p) => (
              <tr key={p.id}>
                <td className={`px-4 py-3 font-bold ${rankColor(p.rank)}`}>
                  {p.rank <= 3 ? <Trophy className="w-4 h-4 inline mr-1" /> : null}
                  {p.rank}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.avatar ? (
                      <img src={getStaticFileUrl(p.avatar)} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-gray-700" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                        {p.name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">@{p.username} · ID {p.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.league ? <Badge color="purple">{p.league}</Badge> : <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{formatNumber(p.xp)}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatNumber(p.rating)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {p.won_duels}/{p.total_duels}
                  {p.win_rate !== null && <span className="text-xs text-gray-400 ml-1">({p.win_rate}%)</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.region ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.created_at).split(',')[0]}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" title="XP reset" onClick={() => { setTarget(p); setResetModal(true); }}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="danger" title="Reytingdan chiqarish" onClick={() => { setTarget(p); setRemoveModal(true); }}>
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Haftalik TOP-10 */}
      <div className="flex items-center gap-2 pt-2">
        <Trophy className="w-6 h-6 text-amber-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Haftalik TOP-10</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            "Xaftaning eng yaxshilari" — Telegram kanalga avtomatik yuborish
          </p>
        </div>
      </div>

      <Card className="space-y-5 p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
              Avtomatik yuborishni yoqish
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Yoqilganda, belgilangan kun va soatda TOP-10 avtomatik kanalga yuboriladi.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kun
            </label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Soat (Toshkent vaqti)
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Joriy: <b>{DAYS[day]}</b> kuni <b>{time}</b> da{' '}
          {enabled ? 'yuboriladi' : '(o‘chirilgan)'}.
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => preview.mutate()}
            loading={preview.isPending}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Ko‘rib chiqish
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm("TOP-10 hozir Telegram kanalga yuborilsinmi?")) send.mutate();
            }}
            loading={send.isPending}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Hozir yuborish
          </Button>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Saqlash
          </Button>
        </div>
      </Card>

      {previewUrl && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Ko‘rinishi (joriy hafta ma’lumoti)
          </h2>
          <img
            src={previewUrl}
            alt="Leaderboard preview"
            className="max-w-sm w-full mx-auto rounded-xl border border-gray-200 dark:border-gray-700"
          />
        </Card>
      )}

      {/* XP reset modal */}
      <Modal open={resetModal} onClose={() => { setResetModal(false); setTarget(null); }} title="XP reset">
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <b>{target.name}</b> (@{target.username}) ning umumiy XP'si <b>{formatNumber(target.xp)}</b> dan <b>0</b> ga tushiriladi.
              Joriy haftaning haftalik XP yozuvi ham o'chiriladi. Reyting (ELO) o'zgarmaydi.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setResetModal(false)}>Bekor qilish</Button>
              <Button variant="danger" className="flex-1" loading={resetXp.isPending} onClick={() => resetXp.mutate(target.id)}>
                <RotateCcw className="w-4 h-4 mr-2" /> XP reset
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove modal */}
      <Modal open={removeModal} onClose={() => { setRemoveModal(false); setTarget(null); }} title="Reytingdan chiqarish">
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <b>{target.name}</b> (@{target.username}) XP'si 0 ga tushiriladi va akkaunt <b>bloklanadi</b> (is_banned).
              Users sahifasida blokdan chiqarish mumkin — u holda o'yinchi 0 XP bilan qaytadi.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Sabab</label>
              <input
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="Masalan: cheating"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRemoveModal(false)}>Bekor qilish</Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={remove.isPending}
                onClick={() => remove.mutate({ id: target.id, reason: removeReason || 'Reytingdan chiqarildi (admin)' })}
              >
                <UserX className="w-4 h-4 mr-2" /> Chiqarish
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
