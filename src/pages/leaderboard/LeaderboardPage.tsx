import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trophy, Save, Send, Eye, Clock } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { leaderboardApi } from '../../api/services';
import { getStaticFileUrl } from '../../utils/helpers';

const DAYS = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

/**
 * Haftalik TOP-10 leaderboard — Telegram kanalga avtomatik yuborish jadvali.
 * Kun/soat (Asia/Tashkent) shu yerdan sozlanadi (app_settings). Preview rasmni
 * ko'rsatadi, "Hozir yuborish" kanalga darhol joylaydi.
 */
export default function LeaderboardPage() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState('20:00');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lb-schedule'],
    queryFn: () => leaderboardApi.getSchedule().then((r) => r.data.data),
  });

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setDay(data.day);
      setTime(data.time);
    }
  }, [data]);

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
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Haftalik TOP-10</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            "Xaftaning eng yaxshilari" — Telegram kanalga avtomatik yuborish
          </p>
        </div>
      </div>

      {/* Jadval sozlamasi */}
      <Card className="space-y-5">
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

      {/* Preview */}
      {previewUrl && (
        <Card>
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
    </div>
  );
}
