import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation, Trans } from 'react-i18next';
import { dailyRewardsApi, avatarsApi, cardsApi } from '../../api/services';
import type { DailyRewardSlot, PremiumConfig } from '../../api/services';
import type { Avatar } from '../../types';
import { Button, Card, Input, Select, Modal, Spinner, Badge } from '../../components/ui';
import { cn, getStaticFileUrl } from '../../utils/helpers';
import {
  Gift,
  Crown,
  Coins,
  Image as ImageIcon,
  Layers,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type RewardType = 'coins' | 'avatar' | 'card';
type Tier = 'regular' | 'premium';

interface EditorState {
  open: boolean;
  mode: 'template' | 'override';
  tier: Tier;
  day_number?: number;
  reward_date?: string;
  reward_type: RewardType;
  amount: number;
  ref_id: number | null;
  title: string;
  description: string;
  is_active: boolean;
}

const emptyEditor: EditorState = {
  open: false,
  mode: 'template',
  tier: 'regular',
  reward_type: 'coins',
  amount: 50,
  ref_id: null,
  title: '',
  description: '',
  is_active: true,
};

function TypeIcon({ type }: { type?: RewardType }) {
  if (type === 'avatar') return <ImageIcon className="w-3.5 h-3.5" />;
  if (type === 'card') return <Layers className="w-3.5 h-3.5" />;
  return <Coins className="w-3.5 h-3.5" />;
}

/** Rasmli avatar tanlagich — thumbnaillar gridi (native select ID o'rniga). */
function AvatarPicker({
  label,
  avatars,
  value,
  onChange,
}: {
  label: string;
  avatars: Avatar[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  const { t } = useTranslation('dailyRewards');
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-4 gap-2 bg-gray-50/50 dark:bg-gray-800/30">
        {avatars.length === 0 && (
          <p className="col-span-4 text-xs text-gray-400 py-3 text-center">{t('picker.empty')}</p>
        )}
        {avatars.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            title={a.is_premium ? t('picker.premiumTitle', { id: a.id }) : `#${a.id}`}
            className={cn(
              'relative aspect-square rounded-lg overflow-hidden border-2 transition',
              value === a.id
                ? 'border-primary-500 ring-2 ring-primary-300'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <img src={getStaticFileUrl(a.url)} alt={`#${a.id}`} className="w-full h-full object-cover" />
            {a.is_premium && (
              <span className="absolute top-0.5 right-0.5 text-[8px]">👑</span>
            )}
            {value === a.id && (
              <span className="absolute inset-0 bg-primary-500/20 flex items-center justify-center text-primary-700 dark:text-primary-200 text-xs font-bold">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DailyRewardsPage() {
  const { t } = useTranslation('dailyRewards');
  const qc = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [calStart, setCalStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  const templatesQ = useQuery({
    queryKey: ['dr-templates'],
    queryFn: () => dailyRewardsApi.getTemplates().then((r) => r.data.data),
  });
  const configQ = useQuery({
    queryKey: ['dr-config'],
    queryFn: () => dailyRewardsApi.getConfig().then((r) => r.data.data),
  });
  const premiumQ = useQuery({
    queryKey: ['premium-config'],
    queryFn: () => dailyRewardsApi.getPremiumConfig().then((r) => r.data.data),
  });
  const avatarsQ = useQuery({
    queryKey: ['dr-avatars'],
    queryFn: () => avatarsApi.getAll({ limit: 1000 }).then((r) => r.data.data.data),
  });
  const cardsQ = useQuery({
    queryKey: ['dr-cards'],
    queryFn: () => cardsApi.getAll({ limit: 1000 }).then((r) => r.data.data.data),
  });

  const calRange = useMemo(() => {
    const [y, m] = calStart.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }, [calStart]);

  const calendarQ = useQuery({
    queryKey: ['dr-calendar', calRange.from],
    queryFn: () => dailyRewardsApi.getCalendar(calRange.from, calRange.to).then((r) => r.data.data),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['dr-templates'] });
    qc.invalidateQueries({ queryKey: ['dr-calendar'] });
  };
  const saveTemplate = useMutation({
    mutationFn: (b: Parameters<typeof dailyRewardsApi.upsertTemplate>[0]) =>
      dailyRewardsApi.upsertTemplate(b),
    onSuccess: () => {
      toast.success(t('toast.templateSaved'));
      invalidateAll();
      setEditor(emptyEditor);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });
  const saveOverride = useMutation({
    mutationFn: (b: Parameters<typeof dailyRewardsApi.upsertOverride>[0]) =>
      dailyRewardsApi.upsertOverride(b),
    onSuccess: () => {
      toast.success(t('toast.overrideSaved'));
      invalidateAll();
      setEditor(emptyEditor);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });
  const delOverride = useMutation({
    mutationFn: (v: { date: string; tier: Tier }) => dailyRewardsApi.deleteOverride(v.date, v.tier),
    onSuccess: () => {
      toast.success(t('toast.resetToTemplate'));
      invalidateAll();
      setEditor(emptyEditor);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });
  const delTemplate = useMutation({
    mutationFn: (v: { day: number; tier: Tier }) => dailyRewardsApi.deleteTemplate(v.day, v.tier),
    onSuccess: () => {
      toast.success(t('toast.templateDeleted'));
      invalidateAll();
      setEditor(emptyEditor);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });

  const handleDelete = () => {
    if (editor.mode === 'template') {
      delTemplate.mutate({ day: editor.day_number!, tier: editor.tier });
    } else {
      delOverride.mutate({ date: editor.reward_date!, tier: editor.tier });
    }
  };

  const cycleLength = configQ.data?.cycle_length ?? 30;
  const templates = templatesQ.data || [];
  const byDay = (day: number, premium: boolean) =>
    templates.find((tpl) => tpl.day_number === day && tpl.is_premium === premium) || null;

  const openEditor = (partial: Partial<EditorState>) => {
    const tier: Tier = partial.tier || 'regular';
    const reward_type: RewardType = tier === 'regular' ? 'coins' : partial.reward_type || 'coins';
    setEditor({ ...emptyEditor, open: true, ...partial, tier, reward_type });
  };

  const submitEditor = () => {
    const base = {
      is_premium: editor.tier === 'premium',
      reward_type: editor.reward_type,
      // avatar: ref_id = erkaklar, amount = ayollar avatari; card: amount = soni; coins: amount = tanga
      amount: editor.amount,
      ref_id: editor.reward_type === 'coins' ? null : editor.ref_id,
      title: editor.title.trim() || null,
      description: editor.description.trim() || null,
      is_active: editor.is_active,
    };
    if (editor.reward_type === 'card' && !editor.ref_id) {
      toast.error(t('editor.selectCard'));
      return;
    }
    if (editor.reward_type === 'avatar') {
      if (!editor.ref_id) {
        toast.error(t('toast.selectMaleAvatar'));
        return;
      }
      if (!editor.amount) {
        toast.error(t('toast.selectFemaleAvatar'));
        return;
      }
    }
    if (editor.mode === 'template') {
      saveTemplate.mutate({ ...base, day_number: editor.day_number! });
    } else {
      saveOverride.mutate({ ...base, reward_date: editor.reward_date! });
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = calStart.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setCalStart(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const avatars = avatarsQ.data || [];
  // Kartalarda alohida "premium" belgisi yo'q — barcha aktiv kartalar sovg'a sifatida beriladi.
  const cards = (cardsQ.data || []).filter((c) => c.is_active !== false);
  // Kunlik premium sovg'ada faqat PREMIUM avatarlar beriladi.
  const maleAvatars = avatars.filter((a) => a.is_premium && (a.gender === 'male' || a.gender === 'both'));
  const femaleAvatars = avatars.filter((a) => a.is_premium && (a.gender === 'female' || a.gender === 'both'));
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (mahalliy)

  const slotLabel = (slot: DailyRewardSlot | null | undefined): string => {
    if (!slot) return '—';
    let label: string;
    if (slot.title) label = slot.title;
    else if (slot.reward_type === 'coins') label = t('slot.coins', { count: slot.amount ?? 0 });
    else if (slot.reward_type === 'avatar') label = t('slot.avatar', { male: slot.ref_id, female: slot.amount });
    else label = t('slot.card', { id: slot.ref_id, amount: slot.amount || 1 });
    return slot.is_active ? label : t('slot.inactive', { label });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary-600 text-white">
          <Gift className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('subtitle', { xp: configQ.data?.daily_xp_required ?? 20 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.premium')}</h2>
          </div>
          {premiumQ.isLoading || !premiumQ.data ? (
            <Spinner />
          ) : (
            <PremiumConfigForm initial={premiumQ.data} onSaved={() => premiumQ.refetch()} />
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalIcon className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.calendar')}</h2>
          </div>
          {configQ.isLoading || !configQ.data ? (
            <Spinner />
          ) : (
            <CalendarConfigForm initial={configQ.data} onSaved={() => configQ.refetch()} />
          )}
        </Card>
      </div>

      {/* Spravochnik grid */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {t('template.title', { days: cycleLength })}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('template.description')}
        </p>
        {templatesQ.isLoading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: cycleLength }, (_, i) => i + 1).map((day) => {
              const reg = byDay(day, false);
              const prem = byDay(day, true);
              return (
                <div
                  key={day}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2 bg-gray-50/50 dark:bg-gray-800/30"
                >
                  <div className="text-xs font-bold text-gray-400">{t('template.day', { day })}</div>
                  <button
                    onClick={() =>
                      openEditor({
                        mode: 'template',
                        tier: 'regular',
                        day_number: day,
                        reward_type: 'coins',
                        amount: reg?.amount ?? 50,
                        ref_id: reg?.ref_id ?? null,
                        title: reg?.title || '',
                        description: reg?.description || '',
                        is_active: reg?.is_active ?? true,
                      })
                    }
                    className="w-full text-left rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary-400 transition"
                  >
                    <div className="flex items-center gap-1 text-[10px] uppercase text-gray-400 font-semibold">
                      <TypeIcon type="coins" /> {t('tier.regular')}
                    </div>
                    <div className="text-xs text-gray-800 dark:text-gray-200 truncate">{slotLabel(reg)}</div>
                  </button>
                  <button
                    onClick={() =>
                      openEditor({
                        mode: 'template',
                        tier: 'premium',
                        day_number: day,
                        reward_type: prem?.reward_type || 'coins',
                        amount: prem?.amount ?? 100,
                        ref_id: prem?.ref_id ?? null,
                        title: prem?.title || '',
                        description: prem?.description || '',
                        is_active: prem?.is_active ?? true,
                      })
                    }
                    className="w-full text-left rounded-lg px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:border-amber-400 transition"
                  >
                    <div className="flex items-center gap-1 text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">
                      <Crown className="w-3.5 h-3.5" /> {t('common:status.premium')}
                    </div>
                    <div className="text-xs text-gray-800 dark:text-gray-200 truncate">{slotLabel(prem)}</div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Kalendar (oylik grid + override) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('calendar.title')}</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 text-center">
              {calStart.slice(0, 7)}
            </span>
            <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Trans i18nKey="dailyRewards:calendar.description" components={{ b: <span className="font-medium" /> }} />
        </p>
        {calendarQ.isLoading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {calendarQ.data?.days?.map((d) => {
              const isPast = d.date < todayStr;
              const isToday = d.date === todayStr;
              // Faqat ERTANGI kundan boshlab tahrirlash mumkin (bugun/o'tgan qulflangan).
              const isLocked = d.date <= todayStr;
              return (
                <div
                  key={d.date}
                  className={cn(
                    'rounded-lg border p-2 space-y-1.5',
                    isToday
                      ? 'border-primary-400 ring-1 ring-primary-300 bg-primary-50/50 dark:bg-primary-900/10'
                      : 'border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20',
                    isPast && 'opacity-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {Number(d.date.slice(8, 10))}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {isToday ? t('calendar.todayLocked') : isPast ? t('calendar.past') : t('calendar.dayShort', { day: d.day_number })}
                    </span>
                  </div>
                  {(['regular', 'premium'] as Tier[]).map((tier) => {
                    const slot = tier === 'regular' ? d.regular : d.premium;
                    const isOverride = slot?.source === 'override';

                    // Bugun va o'tgan kunlar qulflangan — tahrirlab bo'lmaydi (faqat ko'rish).
                    if (isLocked) {
                      return (
                        <div
                          key={tier}
                          className={cn(
                            'rounded px-1.5 py-1 border text-[10px] truncate cursor-default',
                            tier === 'premium'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                          )}
                          title={isToday ? t('calendar.lockedToday') : t('calendar.lockedPast')}
                        >
                          <span className="text-gray-500 dark:text-gray-400">{tier === 'premium' ? '★' : '•'}</span>{' '}
                          <span className="text-gray-800 dark:text-gray-200">{slotLabel(slot)}</span>
                        </div>
                      );
                    }

                    const tierName = tier === 'premium' ? t('common:status.premium') : t('tier.regular');
                    return (
                      <div key={tier} className="flex items-stretch gap-1">
                        <button
                          onClick={() =>
                            openEditor({
                              mode: 'override',
                              tier,
                              reward_date: d.date,
                              reward_type: slot?.reward_type || 'coins',
                              amount: slot?.amount ?? (tier === 'premium' ? 100 : 50),
                              ref_id: slot?.ref_id ?? null,
                              title: slot?.title || '',
                              description: slot?.description || '',
                              is_active: slot?.is_active ?? true,
                            })
                          }
                          className={cn(
                            'flex-1 text-left rounded px-1.5 py-1 border text-[10px] transition truncate',
                            tier === 'premium'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
                            isOverride && 'ring-1 ring-purple-400'
                          )}
                          title={`${tierName}: ${slotLabel(slot)}${isOverride ? ` ${t('calendar.overrideMark')}` : ''}`}
                        >
                          <span className="text-gray-500 dark:text-gray-400">{tier === 'premium' ? '★' : '•'}</span>{' '}
                          <span className="text-gray-800 dark:text-gray-200">{slotLabel(slot)}</span>
                        </button>
                        {isOverride && (
                          <button
                            onClick={() => delOverride.mutate({ date: d.date, tier })}
                            className="px-1 rounded text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-[10px]"
                            title={t('calendar.resetToTemplate')}
                          >
                            ↩
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Editor modal */}
      <Modal open={editor.open} onClose={() => setEditor(emptyEditor)} title={t('editor.title')}>
        <div className="space-y-5">
          {/* Kun raqami + Sovg'a turi (tier) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {editor.mode === 'template' ? t('editor.dayNumber') : t('common:table.date')}
              </label>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                {editor.mode === 'template' ? editor.day_number : editor.reward_date}
              </div>
            </div>
            <Select
              label={t('editor.rewardTier')}
              value={editor.tier}
              onChange={(e) => {
                const tier = e.target.value as Tier;
                setEditor({
                  ...editor,
                  tier,
                  reward_type: tier === 'regular' ? 'coins' : editor.reward_type,
                });
              }}
            >
              <option value="regular">{t('tier.regularOption')}</option>
              <option value="premium">{t('common:status.premium')}</option>
            </Select>
          </div>

          {/* Sovg'a kategoriyasi — kartalar */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('editor.category')}</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: 'coins', label: t('editor.categories.coins'), icon: <Coins className="w-6 h-6" />, premiumOnly: false },
                { type: 'card', label: t('editor.categories.card'), icon: <Layers className="w-6 h-6" />, premiumOnly: true },
                { type: 'avatar', label: t('editor.categories.avatar'), icon: <ImageIcon className="w-6 h-6" />, premiumOnly: true },
              ] as { type: RewardType; label: string; icon: React.ReactNode; premiumOnly: boolean }[]).map((c) => {
                const disabled = c.premiumOnly && editor.tier !== 'premium';
                const selected = editor.reward_type === c.type;
                return (
                  <button
                    key={c.type}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setEditor({
                        ...editor,
                        reward_type: c.type,
                        ref_id: null,
                        amount: c.type === 'coins' ? 50 : c.type === 'card' ? 1 : 0,
                      })
                    }
                    className={cn(
                      'rounded-xl border p-4 flex flex-col items-center gap-1.5 text-center transition',
                      selected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300',
                      disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {c.icon}
                    <span className="text-sm font-medium">{c.label}</span>
                    {c.premiumOnly && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{t('editor.premiumOnly')}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kategoriyaga qarab maydonlar */}
          {editor.reward_type === 'coins' && (
            <Input
              type="number"
              label={t('editor.coinAmount')}
              value={editor.amount}
              min={1}
              onChange={(e) => setEditor({ ...editor, amount: Number(e.target.value) })}
            />
          )}

          {editor.reward_type === 'avatar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AvatarPicker
                label={t('editor.maleAvatar')}
                avatars={maleAvatars}
                value={editor.ref_id}
                onChange={(id) => setEditor({ ...editor, ref_id: id })}
              />
              <AvatarPicker
                label={t('editor.femaleAvatar')}
                avatars={femaleAvatars}
                value={editor.amount || null}
                onChange={(id) => setEditor({ ...editor, amount: id })}
              />
            </div>
          )}

          {editor.reward_type === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('editor.selectCard')}
                value={editor.ref_id ?? ''}
                onChange={(e) => setEditor({ ...editor, ref_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">{t('editor.selectPlaceholder')}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                label={t('common:table.count')}
                value={editor.amount}
                min={1}
                onChange={(e) => setEditor({ ...editor, amount: Number(e.target.value) })}
              />
            </div>
          )}

          <Input
            label={t('editor.name')}
            value={editor.title}
            placeholder={t('editor.namePlaceholder')}
            onChange={(e) => setEditor({ ...editor, title: e.target.value })}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('editor.descriptionLabel')}</label>
            <textarea
              rows={2}
              value={editor.description}
              placeholder={t('editor.descriptionPlaceholder')}
              onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={editor.is_active}
              onChange={(e) => setEditor({ ...editor, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            {t('editor.activeHint')}
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={delTemplate.isPending || delOverride.isPending}
            >
              {editor.mode === 'template' ? t('common:actions.delete') : t('calendar.resetToTemplate')}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditor(emptyEditor)}>
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={submitEditor} loading={saveTemplate.isPending || saveOverride.isPending}>
                {t('common:actions.save')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Premium config form ──────────────────────────────────────────────────────
function PremiumConfigForm({ initial, onSaved }: { initial: PremiumConfig; onSaved: () => void }) {
  const { t } = useTranslation('dailyRewards');
  const [price, setPrice] = useState(initial.price_som);
  const [duration, setDuration] = useState(initial.duration_days);
  const [purchasable, setPurchasable] = useState(initial.is_purchasable);
  // Chegirma
  const [discountOn, setDiscountOn] = useState(!!initial.discount_price);
  const [discountPrice, setDiscountPrice] = useState(initial.discount_price ?? 0);
  const [dStart, setDStart] = useState(toLocalInput(initial.discount_starts_at));
  const [dEnd, setDEnd] = useState(toLocalInput(initial.discount_ends_at));

  const save = useMutation({
    mutationFn: () =>
      dailyRewardsApi.updatePremiumConfig({
        price_som: price,
        duration_days: duration,
        is_purchasable: purchasable,
        ...(discountOn
          ? {
              discount_price: discountPrice,
              discount_starts_at: dStart ? new Date(dStart).toISOString() : null,
              discount_ends_at: dEnd ? new Date(dEnd).toISOString() : null,
            }
          : { discount_price: null, discount_starts_at: null, discount_ends_at: null }),
      }),
    onSuccess: () => {
      toast.success(t('toast.premiumSaved'));
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });

  const clearDiscount = useMutation({
    mutationFn: () => dailyRewardsApi.clearPremiumDiscount(),
    onSuccess: () => {
      toast.success(t('toast.discountRemoved'));
      setDiscountOn(false);
      setDiscountPrice(0);
      setDStart('');
      setDEnd('');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });

  const savePct =
    price > 0 && discountPrice > 0 && discountPrice < price
      ? Math.round((1 - discountPrice / price) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" label={t('premiumForm.price', { currency: t('common:units.som') })} value={price} min={0} onChange={(e) => setPrice(Number(e.target.value))} />
        <Input type="number" label={t('premiumForm.duration')} value={duration} min={1} onChange={(e) => setDuration(Number(e.target.value))} />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input type="checkbox" checked={purchasable} onChange={(e) => setPurchasable(e.target.checked)} className="rounded border-gray-300" />
        {t('premiumForm.purchasable')}
      </label>

      {/* Vaqtinchalik chegirma */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <input type="checkbox" checked={discountOn} onChange={(e) => setDiscountOn(e.target.checked)} className="rounded border-gray-300" />
            {t('premiumForm.temporaryDiscount')}
          </label>
          {initial.is_discount_active && (
            <Badge color="green" size="sm">{t('premiumForm.activeNow')}</Badge>
          )}
        </div>

        {discountOn && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label={t('premiumForm.discountPrice', { currency: t('common:units.som') })}
                value={discountPrice}
                min={0}
                onChange={(e) => setDiscountPrice(Number(e.target.value))}
              />
              <div className="flex items-end pb-2">
                {savePct > 0 ? (
                  <Badge color="orange">{t('premiumForm.discountBadge', { percent: savePct })}</Badge>
                ) : (
                  <span className="text-xs text-gray-400">{t('premiumForm.discountHint')}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="datetime-local" label={t('premiumForm.starts')} value={dStart} onChange={(e) => setDStart(e.target.value)} />
              <Input type="datetime-local" label={t('premiumForm.ends')} value={dEnd} onChange={(e) => setDEnd(e.target.value)} />
            </div>
            {initial.discount_price != null && (
              <Button variant="ghost" size="sm" onClick={() => clearDiscount.mutate()} loading={clearDiscount.isPending}>
                {t('premiumForm.removeDiscount')}
              </Button>
            )}
          </div>
        )}
      </div>

      <Button onClick={() => save.mutate()} loading={save.isPending}>
        {t('common:actions.save')}
      </Button>
    </div>
  );
}

/** ISO/backend sanani datetime-local input formatiga (YYYY-MM-DDTHH:mm) o'giradi. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Calendar config form ─────────────────────────────────────────────────────
function CalendarConfigForm({
  initial,
  onSaved,
}: {
  initial: { cycle_anchor: string; cycle_length: number; daily_xp_required: number };
  onSaved: () => void;
}) {
  const { t } = useTranslation('dailyRewards');
  const cycleLengthLabel = t('common:units.days', { count: initial.cycle_length });
  const [anchor, setAnchor] = useState(initial.cycle_anchor);
  const [xp, setXp] = useState(initial.daily_xp_required);
  const save = useMutation({
    mutationFn: () => dailyRewardsApi.updateConfig({ cycle_anchor: anchor, daily_xp_required: xp }),
    onSuccess: () => {
      toast.success(t('toast.calendarSaved'));
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('common:status.error')),
  });
  return (
    <div className="space-y-4">
      <Input type="number" label={t('calendarForm.xpRequired')} value={xp} min={0} onChange={(e) => setXp(Number(e.target.value))} />
      <Input type="date" label={t('calendarForm.cycleAnchor')} value={anchor} onChange={(e) => setAnchor(e.target.value)} />
      <p className="text-xs text-gray-400">{t('calendarForm.cycleHelp', { length: cycleLengthLabel })}</p>
      <div className="flex items-center gap-2">
        <Badge color="gray" size="sm">{t('calendarForm.cycleBadge', { length: cycleLengthLabel })}</Badge>
      </div>
      <Button onClick={() => save.mutate()} loading={save.isPending}>
        {t('common:actions.save')}
      </Button>
    </div>
  );
}
