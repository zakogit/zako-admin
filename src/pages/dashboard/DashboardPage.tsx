import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { cn, formatDate, formatNumber, getStaticFileUrl } from '../../utils/helpers';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange';
interface Health { color: BadgeColor; label: string }

const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? '—' : `${Number(v).toFixed(digits)}%`;

// Thresholds from the "ZAKO - Dashboard" product spec
function retentionHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', label: 'No data' };
  if (r >= 30) return { color: 'green', label: 'Good' };
  if (r >= 20) return { color: 'yellow', label: 'OK' };
  return { color: 'red', label: 'Low' };
}
function stickinessHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', label: 'No data' };
  if (r >= 30) return { color: 'green', label: 'Very good' };
  if (r >= 20) return { color: 'green', label: 'Good' };
  if (r >= 10) return { color: 'yellow', label: 'OK' };
  return { color: 'red', label: 'Low' };
}
function completionHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', label: 'No data' };
  if (r >= 90) return { color: 'green', label: 'Very good' };
  if (r >= 85) return { color: 'green', label: 'Good' };
  if (r >= 70) return { color: 'yellow', label: 'Watch' };
  return { color: 'red', label: 'Critical' };
}
function winRateHealth(r: number | null): Health {
  if (r === null) return { color: 'gray', label: 'No data' };
  if (r >= 45 && r <= 55) return { color: 'green', label: 'Balanced' };
  if (r >= 40 && r <= 60) return { color: 'yellow', label: 'OK' };
  return { color: 'red', label: 'Unbalanced' };
}

const retLine = (p: RetentionPoint) => `${fmtPct(p.rate)} (${p.returned}/${p.cohort_size})`;
const MODE_LABEL: Record<string, string> = { bot: 'vs Bot', random: 'Random match', friend: 'Friend room' };
const DIFF_COLOR: Record<string, BadgeColor> = { easy: 'green', medium: 'yellow', hard: 'red' };
const LEAGUE_COLORS = ['#cd7f32', '#9ca3af', '#eab308', '#38bdf8', '#a855f7', '#6366f1'];
const WIN_BUCKET_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#f59e0b', '#ef4444'];

function MetricCard({ title, value, icon, color, health, lines }: {
  title: string; value: string; icon: ReactNode; color: string; health: Health; lines: string[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl text-white', color)}>{icon}</div>
        <Badge color={health.color}>{health.label}</Badge>
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
  const qc = useQueryClient();
  const [days, setDays] = useState<7 | 30>(7);

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
      label: days === 7 ? p.weekday : `${p.date.slice(8, 10)}.${p.date.slice(5, 7)}`,
    })),
    [trends, days],
  );

  const n = (v: number | undefined) => (isLoading || v === undefined ? '—' : formatNumber(v));
  const growth = a?.users.growth_7d_pct;
  const growthText = growth === null || growth === undefined
    ? `+${a?.users.new_7d ?? 0} new · last 7 days`
    : `+${a?.users.new_7d ?? 0} last 7d · ${growth >= 0 ? '+' : ''}${growth}% vs prev 7d`;
  const dauDelta = a ? a.active.dau - a.active.dau_yesterday : 0;
  const top = a?.top_player ?? null;
  const topName = top ? ([top.first_name, top.last_name].filter(Boolean).join(' ') || top.username) : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time platform statistics
            {a?.generated_at ? ` · updated ${formatDate(a.generated_at).split(',')[1]?.trim()}` : ''}
          </p>
        </div>
        <button onClick={refreshAll} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards — today */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={n(a?.users.total)} icon={<Users className="w-6 h-6" />} color="bg-primary-600" subtitle={growthText} />
        <StatCard title="Online Now" value={n(a?.users.online)} icon={<Activity className="w-6 h-6" />} color="bg-green-600" subtitle={`${a?.users.new_today ?? 0} registered today`} />
        <StatCard title="Duels Today" value={n(a?.duels.today)} icon={<Swords className="w-6 h-6" />} color="bg-orange-600" subtitle={`${a?.duels.active_now ?? 0} live right now`} />
        <StatCard title="Questions Today" value={n(a?.questions.answered_today)} icon={<HelpCircle className="w-6 h-6" />} color="bg-sky-600" subtitle={`${fmtPct(a?.questions.correct_rate, 0)} answered correctly`} />
        <StatCard title="Cards Sold" value={n(a?.cards_sold)} icon={<Layers className="w-6 h-6" />} color="bg-purple-600" subtitle="Total inventory" />
      </div>

      {/* Product metrics — D1 Retention, DAU, Duel Completion, Avg Win Rate */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Product metrics</h3>
          <p className="text-xs text-gray-400">Retention: cohort of the last 7 registration days · Duels & win rate: last 30 days</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="D1 Retention"
            value={isLoading || !a ? '—' : fmtPct(a.retention.d1.rate)}
            icon={<Repeat className="w-5 h-5" />}
            color="bg-indigo-600"
            health={retentionHealth(a?.retention.d1.rate ?? null)}
            lines={a ? [
              `Cohort ${a.retention.d1.cohort_size} users · ${a.retention.d1.returned} came back next day`,
              `D7 ${retLine(a.retention.d7)} · D30 ${retLine(a.retention.d30)}`,
              'Target: D1 30–40%, D7 15–25%, D30 8–15%',
            ] : []}
          />
          <MetricCard
            title="DAU"
            value={n(a?.active.dau)}
            icon={<Flame className="w-5 h-5" />}
            color="bg-rose-600"
            health={stickinessHealth(a?.active.stickiness ?? null)}
            lines={a ? [
              `WAU ${formatNumber(a.active.wau)} · MAU ${formatNumber(a.active.mau)}`,
              `Stickiness DAU/MAU ${fmtPct(a.active.stickiness)} (target 20%+)`,
              `${dauDelta >= 0 ? '+' : ''}${dauDelta} vs yesterday (${a.active.dau_yesterday})`,
            ] : []}
          />
          <MetricCard
            title="Duel Completion"
            value={isLoading || !a ? '—' : fmtPct(a.duels.completion_rate)}
            icon={<Target className="w-5 h-5" />}
            color="bg-orange-600"
            health={completionHealth(a?.duels.completion_rate ?? null)}
            lines={a ? [
              `${formatNumber(a.duels.finished_30d)} finished / ${formatNumber(a.duels.started_30d)} started`,
              a.duels.by_mode.map(m => `${MODE_LABEL[m.mode] ?? m.mode} ${fmtPct(m.rate, 0)}`).join(' · ') || 'No duels yet',
              'Target: 85%+ good, below 70% is a red flag',
            ] : []}
          />
          <MetricCard
            title="Avg Win Rate"
            value={isLoading || !a ? '—' : fmtPct(a.win_rate.avg_win_rate)}
            icon={<Trophy className="w-5 h-5" />}
            color="bg-emerald-600"
            health={winRateHealth(a?.win_rate.avg_win_rate ?? null)}
            lines={a ? [
              a.win_rate.players > 0
                ? `${a.win_rate.players} PvP players with 3+ duels`
                : 'Not enough PvP duels (bots excluded)',
              `In 40–60% band: ${a.win_rate.buckets[2]?.users ?? 0} players`,
              'Healthy: most players between 45–55%',
            ] : []}
          />
        </div>
      </div>

      {/* Trend chart + Top player */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activity Trend</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Daily active users, new registrations and duels</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-primary-500 inline-block rounded"></span>DAU</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-green-500 inline-block rounded"></span>New users</span>
                <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded"></span>Duels</span>
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
                    {d} days
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
              <Area type="monotone" dataKey="dau" name="DAU" stroke="#6366f1" strokeWidth={2} fill="url(#gDau)" />
              <Area type="monotone" dataKey="new_users" name="New users" stroke="#22c55e" strokeWidth={2} fill="url(#gNew)" />
              <Area type="monotone" dataKey="duels" name="Duels" stroke="#f97316" strokeWidth={2} fill="url(#gDuels)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Player</h3>
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
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(top.rating)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Win rate</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtPct(top.win_rate, 0)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center">{top.won_duels} wins of {top.total_duels} duels</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">{isLoading ? 'Loading…' : 'No players yet'}</p>
          )}
        </Card>
      </div>

      {/* XP distribution · Completion by mode · Win-rate distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">XP Distribution</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Players per league</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={xp ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
              <XAxis dataKey="league" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} formatter={(v) => [formatNumber(Number(v)), 'Players']} />
              <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                {(xp ?? []).map((_, i) => <Cell key={i} fill={LEAGUE_COLORS[i % LEAGUE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Duel Completion by Mode</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Finished / started · last 30 days</p>
          <div className="space-y-4">
            {(a?.duels.by_mode ?? []).map(m => (
              <RateBar
                key={m.mode}
                label={MODE_LABEL[m.mode] ?? m.mode}
                sub={`${formatNumber(m.finished)} of ${formatNumber(m.started)} finished`}
                rate={m.rate}
                color={m.rate === null ? 'bg-gray-300' : m.rate >= 85 ? 'bg-green-500' : m.rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
              />
            ))}
            {a && a.duels.by_mode.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No finished duels in the last 30 days</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">Win Rate Distribution</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">PvP players by win rate · healthy matchmaking clusters at 40–60%</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={a?.win_rate.buckets ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} formatter={(v) => [formatNumber(Number(v)), 'Players']} />
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
              <h3 className="font-semibold text-gray-900 dark:text-white">Question Statistics</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Most-missed questions (5+ attempts) · {formatNumber(qstats?.total_attempts ?? 0)} answers analysed
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(qstats?.by_difficulty ?? []).map(d => (
                <span key={d.difficulty} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs">
                  <Badge color={DIFF_COLOR[d.difficulty] ?? 'gray'} size="sm">{d.difficulty}</Badge>
                  <span className="text-gray-600 dark:text-gray-300">{fmtPct(d.correct_rate, 0)} correct</span>
                  <span className="text-gray-400">· {formatNumber(d.attempts)}</span>
                </span>
              ))}
            </div>
          </div>
          {qstats && qstats.hardest.length === 0 ? (
            <EmptyState message="Not enough answers yet to rank questions" />
          ) : (
            <Table headers={['Question', 'Subject', 'Difficulty', 'Attempts', 'Wrong', 'Correct']} loading={!qstats}>
              {(qstats?.hardest ?? []).map(q => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <div className="max-w-xs lg:max-w-md truncate text-gray-900 dark:text-gray-100" title={q.question_text}>{q.question_text}</div>
                    <div className="text-xs text-gray-400">ID {q.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{q.subject ?? '—'}</td>
                  <td className="px-4 py-3"><Badge color={DIFF_COLOR[q.difficulty] ?? 'gray'}>{q.difficulty}</Badge></td>
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
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {((activity ?? []) as (ActivityItem & { user1?: string })[]).slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.user1 || item.user || '—'}{item.details ? ` · ${item.details}` : ''}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.timestamp ? formatDate(item.timestamp).split(',')[1]?.trim() : ''}</span>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'API Server', key: 'api' as const },
            { label: 'Database', key: 'database' as const },
            { label: 'Redis Cache', key: 'redis' as const },
            { label: 'WebSocket', key: 'websocket' as const },
          ].map(s => {
            const state = health?.[s.key];
            const online = state === 'online';
            return (
              <div key={s.label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                <Badge color={!health ? 'gray' : online ? 'green' : 'red'}>
                  {!health ? '—' : online ? 'Online' : 'Offline'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
