import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, Swords, Layers, Activity, RefreshCw, HelpCircle, Crown, Repeat, Target, Trophy, Flame,
} from 'lucide-react';
import { dashboardApi } from '../../api/services';
import type { RetentionPoint, TrendPoint } from '../../api/services';
import type { ActivityItem } from '../../types';
import { StatCard, Card, Badge, Table, EmptyState } from '../../components/ui';
import { cn, formatNumber, getStaticFileUrl } from '../../utils/helpers';
import { getIntlLocale } from '../../i18n';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange';
// `level` is a key under `dashboard:health.*` — translated at render time (never at module scope)
type HealthLevel = 'noData' | 'good' | 'ok' | 'low' | 'veryGood' | 'watch' | 'critical' | 'balanced' | 'unbalanced';
interface Health { color: BadgeColor; level: HealthLevel }

// Locale-aware (decimal comma in uz/ru); evaluated at call time, so it follows the active language
const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined
    ? '—'
    : `${new Intl.NumberFormat(getIntlLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v))}%`;

// `formatDate(...).split(',')[1]` breaks for locales with extra commas (uz-UZ gives "04-okt, 2026, 19:30"), so format the time directly
const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString(getIntlLocale(), { hour: '2-digit', minute: '2-digit' });

// Postgres sends English weekday abbreviations ("Mon"); derive the label from the date in the UI language instead
function weekdayLabel(p: TrendPoint, locale: string): string {
  const d = new Date(`${p.date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? p.weekday : d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
}

// Thresholds from the "ZAKO - Dashboard" product spec
function retentionHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', level: 'noData' };
  if (r >= 30) return { color: 'green', level: 'good' };
  if (r >= 20) return { color: 'yellow', level: 'ok' };
  return { color: 'red', level: 'low' };
}
function stickinessHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', level: 'noData' };
  if (r >= 30) return { color: 'green', level: 'veryGood' };
  if (r >= 20) return { color: 'green', level: 'good' };
  if (r >= 10) return { color: 'yellow', level: 'ok' };
  return { color: 'red', level: 'low' };
}
function completionHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', level: 'noData' };
  if (r >= 90) return { color: 'green', level: 'veryGood' };
  if (r >= 85) return { color: 'green', level: 'good' };
  if (r >= 70) return { color: 'yellow', level: 'watch' };
  return { color: 'red', level: 'critical' };
}
function winRateHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', level: 'noData' };
  if (r >= 45 && r <= 55) return { color: 'green', level: 'balanced' };
  if (r >= 40 && r <= 60) return { color: 'yellow', level: 'ok' };
  return { color: 'red', level: 'unbalanced' };
}

const retLine = (p: RetentionPoint) => `${fmtPct(p.rate)} (${p.returned}/${p.cohort_size})`;
const DIFF_COLOR: Record<string, BadgeColor> = { easy: 'green', medium: 'yellow', hard: 'red' };
const LEAGUE_COLORS = ['#cd7f32', '#9ca3af', '#eab308', '#38bdf8', '#a855f7', '#6366f1'];
const WIN_BUCKET_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#f59e0b', '#ef4444'];

function MetricCard({ title, value, icon, color, health, lines }: {
  title: string; value: string; icon: ReactNode; color: string; health: Health; lines: string[];
}) {
  const { t } = useTranslation('dashboard');
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl text-white', color)}>{icon}</div>
        <Badge color={health.color}>{t(`health.${health.level}`)}</Badge>
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      <div className="mt-2 space-y-0.5">
        {lines.map((l, i) => <p key={i} className="text-xs text-gray-500 dark:text-gray-400">{l}</p>)}
      </div>
    </Card>
  );
}

function RateBar({ label, sub, rate, color }: { label: string; sub: string; rate: number | null; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-900 dark:text-white font-semibold">{fmtPct(rate)}</span>
      </div>
      <p className="text-xs text-gray-400 mb-1.5">{sub}</p>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(rate ?? 0, 100)}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const qc = useQueryClient();
  const [days, setDays] = useState<7 | 30>(7);
  // Re-read on every render so a language switch refreshes the memoised weekday labels below
  const intlLocale = getIntlLocale();

  const { data: a, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => dashboardApi.getAnalytics().then(r => r.data.data),
    refetchInterval: 60000,
  });
  const { data: trends } = useQuery({
    queryKey: ['dashboard-trends', days],
    queryFn: () => dashboardApi.getTrends(days).then(r => r.data.data),
    refetchInterval: 120000,
  });
  const { data: xp } = useQuery({
    queryKey: ['dashboard-xp'],
    queryFn: () => dashboardApi.getXpDistribution().then(r => r.data.data),
    refetchInterval: 300000,
  });
  const { data: qstats } = useQuery({
    queryKey: ['dashboard-question-stats'],
    queryFn: () => dashboardApi.getQuestionStats({ limit: 10, min: 5 }).then(r => r.data.data),
    refetchInterval: 300000,
  });
  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getActivity().then(r => r.data.data),
    refetchInterval: 60000,
  });
  const { data: health } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => dashboardApi.getHealth().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const refreshAll = () =>
    qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('dashboard') });

  const trendData = useMemo(
    () => (trends ?? []).map((p: TrendPoint) => ({
      ...p,
      label: days === 7 ? weekdayLabel(p, intlLocale) : `${p.date.slice(8, 10)}.${p.date.slice(5, 7)}`,
    })),
    [trends, days, intlLocale],
  );

  const n = (v: number | undefined) => (isLoading || v === undefined ? '—' : formatNumber(v));
  const growth = a?.users.growth_7d_pct;
  const growthText = growth === null || growth === undefined
    ? t('kpi.newLast7d', { count: a?.users.new_7d ?? 0 })
    : t('kpi.growthVsPrev', {
      added: a?.users.new_7d ?? 0,
      growth: `${growth >= 0 ? '+' : ''}${formatNumber(growth)}%`,
    });
  const dauDelta = a ? a.active.dau - a.active.dau_yesterday : 0;
  const top = a?.top_player ?? null;
  const topName = top ? ([top.first_name, top.last_name].filter(Boolean).join(' ') || top.username) : '';

  // Duel mode / difficulty come from the API as stable ids — translate for display, fall back to the raw id
  const modeLabel = (mode: string) => t(`modes.${mode}`, { defaultValue: mode });
  const difficultyLabel = (d: string) => t(`difficulty.${d}`, { defaultValue: d });

  // The activity feed text is composed by the backend in English ("Duel Completed", "vs Bot in Math").
  // Map the known shapes to translations; anything unrecognised is shown as received.
  const activityType = (type: string | undefined) => {
    const raw = (type ?? '').replace(/_/g, ' ');
    switch (raw.toLowerCase()) {
      case 'duel completed': return t('activity.types.duelCompleted');
      case 'user registration': return t('activity.types.userRegistration');
      default: return raw;
    }
  };
  const activityDetails = (details: string) => {
    if (details === 'New user registered') return t('activity.details.newUser');
    const duel = /^vs (\S+) in (.+)$/.exec(details);
    if (duel) {
      return t('activity.details.duel', {
        opponent: duel[1] === 'Bot' ? t('activity.botOpponent') : duel[1],
        subject: duel[2],
      });
    }
    return details;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('subtitle')}
            {a?.generated_at ? ` · ${t('updatedAt', { time: formatTime(a.generated_at) })}` : ''}
          </p>
        </div>
        <button onClick={refreshAll} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
          {t('common:actions.refresh')}
        </button>
      </div>

      {/* KPI Cards — today */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title={t('kpi.totalUsers')} value={n(a?.users.total)} icon={<Users className="w-6 h-6" />} color="bg-primary-600" subtitle={growthText} />
        <StatCard title={t('kpi.onlineNow')} value={n(a?.users.online)} icon={<Activity className="w-6 h-6" />} color="bg-green-600" subtitle={t('kpi.registeredToday', { value: a?.users.new_today ?? 0 })} />
        <StatCard title={t('kpi.duelsToday')} value={n(a?.duels.today)} icon={<Swords className="w-6 h-6" />} color="bg-orange-600" subtitle={t('kpi.liveNow', { value: a?.duels.active_now ?? 0 })} />
        <StatCard title={t('kpi.questionsToday')} value={n(a?.questions.answered_today)} icon={<HelpCircle className="w-6 h-6" />} color="bg-sky-600" subtitle={t('kpi.answeredCorrectly', { value: fmtPct(a?.questions.correct_rate, 0) })} />
        <StatCard title={t('kpi.cardsSold')} value={n(a?.cards_sold)} icon={<Layers className="w-6 h-6" />} color="bg-purple-600" subtitle={t('kpi.totalInventory')} />
      </div>

      {/* Product metrics — D1 Retention, DAU, Duel Completion, Avg Win Rate */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('metrics.heading')}</h3>
          <p className="text-xs text-gray-400">{t('metrics.caption')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title={t('metrics.retention.title')}
            value={isLoading || !a ? '—' : fmtPct(a.retention.d1.rate)}
            icon={<Repeat className="w-5 h-5" />}
            color="bg-indigo-600"
            health={retentionHealth(a?.retention.d1.rate ?? null)}
            lines={a ? [
              t('metrics.retention.cohort', { count: a.retention.d1.cohort_size, returned: a.retention.d1.returned }),
              `D7 ${retLine(a.retention.d7)} · D30 ${retLine(a.retention.d30)}`,
              t('metrics.retention.target'),
            ] : []}
          />
          <MetricCard
            title={t('metrics.dau.title')}
            value={n(a?.active.dau)}
            icon={<Flame className="w-5 h-5" />}
            color="bg-rose-600"
            health={stickinessHealth(a?.active.stickiness ?? null)}
            lines={a ? [
              t('metrics.dau.wauMau', { wau: formatNumber(a.active.wau), mau: formatNumber(a.active.mau) }),
              t('metrics.dau.stickiness', { value: fmtPct(a.active.stickiness) }),
              t('metrics.dau.vsYesterday', { delta: `${dauDelta >= 0 ? '+' : ''}${dauDelta}`, yesterday: a.active.dau_yesterday }),
            ] : []}
          />
          <MetricCard
            title={t('metrics.completion.title')}
            value={isLoading || !a ? '—' : fmtPct(a.duels.completion_rate)}
            icon={<Target className="w-5 h-5" />}
            color="bg-orange-600"
            health={completionHealth(a?.duels.completion_rate ?? null)}
            lines={a ? [
              t('metrics.completion.finishedStarted', { finished: formatNumber(a.duels.finished_30d), started: formatNumber(a.duels.started_30d) }),
              a.duels.by_mode.map(m => `${modeLabel(m.mode)} ${fmtPct(m.rate, 0)}`).join(' · ') || t('metrics.completion.noDuels'),
              t('metrics.completion.target'),
            ] : []}
          />
          <MetricCard
            title={t('metrics.winRate.title')}
            value={isLoading || !a ? '—' : fmtPct(a.win_rate.avg_win_rate)}
            icon={<Trophy className="w-5 h-5" />}
            color="bg-emerald-600"
            health={winRateHealth(a?.win_rate.avg_win_rate ?? null)}
            lines={a ? [
              a.win_rate.players > 0
                ? t('metrics.winRate.players', { count: a.win_rate.players })
                : t('metrics.winRate.notEnough'),
              t('metrics.winRate.band', { count: a.win_rate.buckets[2]?.users ?? 0 }),
              t('metrics.winRate.healthy'),
            ] : []}
          />
        </div>
      </div>

      {/* Trend chart + Top player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('trend.title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('trend.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-primary-500 inline-block rounded"></span>{t('trend.series.dau')}</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-green-500 inline-block rounded"></span>{t('trend.series.newUsers')}</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded"></span>{t('trend.series.duels')}</span>
              </div>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                {([7, 30] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={cn(
                      'px-3 py-1.5 font-medium transition',
                      days === d ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                    )}
                  >
                    {t('common:units.days', { count: d })}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gDau" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDuels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} interval={days === 30 ? 4 : 0} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} labelFormatter={(_, payload) => (payload?.[0]?.payload as TrendPoint | undefined)?.date ?? ''} />
              <Area type="monotone" dataKey="dau" name={t('trend.series.dau')} stroke="#6366f1" strokeWidth={2} fill="url(#gDau)" />
              <Area type="monotone" dataKey="new_users" name={t('trend.series.newUsers')} stroke="#22c55e" strokeWidth={2} fill="url(#gNew)" />
              <Area type="monotone" dataKey="duels" name={t('trend.series.duels')} stroke="#f97316" strokeWidth={2} fill="url(#gDuels)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('topPlayer.title')}</h3>
          </div>
          {top ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {top.avatar ? (
                  <img src={getStaticFileUrl(top.avatar)} alt={topName} className="w-16 h-16 rounded-2xl object-cover bg-gray-100 dark:bg-gray-800" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-bold">
                    {topName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{topName}</p>
                  <p className="text-xs text-gray-400 truncate">@{top.username} · ID {top.id}</p>
                  {top.league && <div className="mt-1"><Badge color="purple">{top.league}</Badge></div>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">XP</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(top.xp)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">{t('topPlayer.rating')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(top.rating)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">{t('topPlayer.winRate')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPct(top.win_rate, 0)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">{t('topPlayer.record', { won: top.won_duels, count: top.total_duels })}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{isLoading ? t('common:state.loading') : t('topPlayer.empty')}</p>
          )}
        </Card>
      </div>

      {/* XP distribution · Completion by mode · Win-rate distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('xp.title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('xp.subtitle')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={xp ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
              <XAxis dataKey="league" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} formatter={(v) => [formatNumber(Number(v)), t('players')]} />
              <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                {(xp ?? []).map((_, i) => <Cell key={i} fill={LEAGUE_COLORS[i % LEAGUE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('byMode.title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('byMode.subtitle')}</p>
          <div className="space-y-4">
            {(a?.duels.by_mode ?? []).map(m => (
              <RateBar
                key={m.mode}
                label={modeLabel(m.mode)}
                sub={t('byMode.sub', { finished: formatNumber(m.finished), started: formatNumber(m.started) })}
                rate={m.rate}
                color={m.rate === null ? 'bg-gray-300' : m.rate >= 85 ? 'bg-green-500' : m.rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
              />
            ))}
            {a && a.duels.by_mode.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">{t('byMode.empty')}</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('winDist.title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('winDist.subtitle')}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={a?.win_rate.buckets ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} formatter={(v) => [formatNumber(Number(v)), t('players')]} />
              <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                {(a?.win_rate.buckets ?? []).map((_, i) => <Cell key={i} fill={WIN_BUCKET_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Question statistics + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('questionStats.title')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('questionStats.subtitle', { count: qstats?.total_attempts ?? 0 })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(qstats?.by_difficulty ?? []).map(d => (
                <span key={d.difficulty} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs">
                  <Badge color={DIFF_COLOR[d.difficulty] ?? 'gray'} size="sm">{difficultyLabel(d.difficulty)}</Badge>
                  <span className="text-gray-600 dark:text-gray-300">{t('questionStats.correctPct', { value: fmtPct(d.correct_rate, 0) })}</span>
                  <span className="text-gray-400">· {formatNumber(d.attempts)}</span>
                </span>
              ))}
            </div>
          </div>
          {qstats && qstats.hardest.length === 0 ? (
            <EmptyState message={t('questionStats.empty')} />
          ) : (
            <Table headers={[t('table.question'), t('common:table.subject'), t('common:table.difficulty'), t('table.attempts'), t('table.wrong'), t('table.correct')]} loading={!qstats}>
              {(qstats?.hardest ?? []).map(q => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <div className="max-w-xs lg:max-w-md truncate text-gray-900 dark:text-gray-100" title={q.question_text}>{q.question_text}</div>
                    <div className="text-xs text-gray-400">ID {q.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{q.subject ?? '—'}</td>
                  <td className="px-4 py-3"><Badge color={DIFF_COLOR[q.difficulty] ?? 'gray'}>{difficultyLabel(q.difficulty)}</Badge></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatNumber(q.attempts)}</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400 font-medium">{formatNumber(q.wrong)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('font-semibold', q.correct_rate < 30 ? 'text-red-600' : q.correct_rate < 50 ? 'text-yellow-600' : 'text-green-600')}>
                      {fmtPct(q.correct_rate, 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('activity.title')}</h3>
          <div className="space-y-3">
            {((activity ?? []) as (ActivityItem & { user1?: string })[]).slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {activityType(item.type)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.user1 || item.user || '—'}{item.details ? ` · ${activityDetails(item.details)}` : ''}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.timestamp ? formatTime(item.timestamp) : ''}</span>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">{t('activity.empty')}</p>
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('system.title')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('system.api'), key: 'api' as const },
            { label: t('system.database'), key: 'database' as const },
            { label: t('system.redis'), key: 'redis' as const },
            { label: t('system.websocket'), key: 'websocket' as const },
          ].map(s => {
            const state = health?.[s.key];
            const online = state === 'online';
            return (
              <div key={s.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                <Badge color={!health ? 'gray' : online ? 'green' : 'red'}>
                  {!health ? '—' : online ? t('common:status.online') : t('common:status.offline')}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
