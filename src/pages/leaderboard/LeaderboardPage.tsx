import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { Trophy, Save, Send, Eye, Clock, RotateCcw, UserX, Medal } from 'lucide-react';
import { Button, Card, Spinner, Table, Badge, Modal, EmptyState } from '../../components/ui';
import { leaderboardApi } from '../../api/services';
import type { TopPlayerRow } from '../../api/services';
import { getIntlLocale } from '../../i18n';
import { formatNumber, getStaticFileUrl } from '../../utils/helpers';

// Indeks = server qiymati: 0 = Yakshanba (Sunday) .. 6 = Shanba (Saturday). Nomlar `days.*` kalitlarida.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const LIMITS = [10, 50, 100] as const;
type Limit = (typeof LIMITS)[number];

const rankColor = (rank: number) =>
  rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-gray-500';

/** Ro'yxatdan o'tgan sana (faqat kun) — joriy til bo'yicha formatlanadi. */
const formatDay = (value: string) =>
  new Date(value).toLocaleDateString(getIntlLocale(), { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Leaderboard (spec §6): umumiy reyting Top 10/50/100 + XP reset / player remove,
 * pastda haftalik TOP-10 Telegram posti jadvali.
 */
export default function LeaderboardPage() {
  const { t } = useTranslation('leaderboard');
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
      toast.success(t('toast.resetDone', { message: d.message, xp: formatNumber(d.data.previous_xp) }));
      setResetModal(false);
      setTarget(null);
      invalidateTop();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.resetError')),
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
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.removeError')),
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
      toast.success(t('common:toast.saved'));
      qc.invalidateQueries({ queryKey: ['lb-schedule'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.saveError')),
  });

  const preview = useMutation({
    mutationFn: () => leaderboardApi.preview().then((r) => r.data),
    onSuccess: (d) => {
      setPreviewUrl(`${getStaticFileUrl(d.data.image_url)}?t=${Date.now()}`);
      toast.success(t('toast.previewReady', { count: d.data.entries.length }));
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });

  const send = useMutation({
    mutationFn: () => leaderboardApi.sendNow().then((r) => r.data),
    onSuccess: (d) => (d.success ? toast.success(d.message) : toast.error(d.message)),
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.sendError')),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const dayName = (d: number) => (DAY_KEYS[d] ? t(`days.${DAY_KEYS[d]}`) : '');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Umumiy reyting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Medal className="w-6 h-6 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('subtitle')}
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
              {t('topN', { limit: l })}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {topLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !top || top.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <Table headers={['#', t('table.player'), t('table.league'), 'XP', t('table.rating'), t('table.duels'), t('common:table.region'), t('table.registered'), '']}>
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
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDay(p.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" title={t('actions.resetXp')} onClick={() => { setTarget(p); setResetModal(true); }}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="danger" title={t('actions.removeFromLeaderboard')} onClick={() => { setTarget(p); setRemoveModal(true); }}>
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('weekly.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('weekly.subtitle')}
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
              {t('weekly.enable')}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {t('weekly.enableHint')}
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('weekly.day')}
            </label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              {DAY_KEYS.map((_, i) => (
                <option key={i} value={i}>
                  {dayName(i)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('weekly.time')}
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
          {enabled ? (
            <Trans
              i18nKey="leaderboard:weekly.summaryOn"
              values={{ day: dayName(day), time }}
              components={{ b: <b /> }}
            />
          ) : (
            <Trans
              i18nKey="leaderboard:weekly.summaryOff"
              values={{ day: dayName(day), time }}
              components={{ b: <b /> }}
            />
          )}
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => preview.mutate()}
            loading={preview.isPending}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {t('actions.preview')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm(t('confirm.sendNow'))) send.mutate();
            }}
            loading={send.isPending}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('actions.sendNow')}
          </Button>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('common:actions.save')}
          </Button>
        </div>
      </Card>

      {previewUrl && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t('weekly.previewTitle')}
          </h2>
          <img
            src={previewUrl}
            alt={t('weekly.previewAlt')}
            className="max-w-sm w-full mx-auto rounded-xl border border-gray-200 dark:border-gray-700"
          />
        </Card>
      )}

      {/* XP reset modal */}
      <Modal open={resetModal} onClose={() => { setResetModal(false); setTarget(null); }} title={t('modal.resetXp.title')}>
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <Trans shouldUnescape tOptions={{ interpolation: { escapeValue: true } }}
                i18nKey="leaderboard:modal.resetXp.body"
                values={{ name: target.name, username: target.username, xp: formatNumber(target.xp) }}
                components={{ b: <b /> }}
              />
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setResetModal(false)}>{t('common:actions.cancel')}</Button>
              <Button variant="danger" className="flex-1" loading={resetXp.isPending} onClick={() => resetXp.mutate(target.id)}>
                <RotateCcw className="w-4 h-4 mr-2" /> {t('actions.resetXp')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove modal */}
      <Modal open={removeModal} onClose={() => { setRemoveModal(false); setTarget(null); }} title={t('modal.remove.title')}>
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <Trans shouldUnescape tOptions={{ interpolation: { escapeValue: true } }}
                i18nKey="leaderboard:modal.remove.body"
                values={{ name: target.name, username: target.username }}
                components={{ b: <b /> }}
              />
            </p>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('modal.remove.reason')}</label>
              <input
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder={t('modal.remove.reasonPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRemoveModal(false)}>{t('common:actions.cancel')}</Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={remove.isPending}
                // i18n-ignore: default ban reason is the API payload (stored in the DB / audit log), not UI text
                onClick={() => remove.mutate({ id: target.id, reason: removeReason || 'Reytingdan chiqarildi (admin)' })}
              >
                <UserX className="w-4 h-4 mr-2" /> {t('actions.remove')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
