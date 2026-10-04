import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, Trash2, Swords, BarChart3, Trophy, Clock, Settings, Save, ChevronDown, ChevronUp, AlertTriangle, Check, X,
} from 'lucide-react';
import { duelsApi, subjectsApi } from '../../api/services';
import type { DuelConfig, DuelReplay, ReplayFlag, ReplayPlayer } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState, Card, Spinner } from '../../components/ui';
import { cn, formatDate, formatDuration } from '../../utils/helpers';
import type { Duel, Subject } from '../../types';
import toast from 'react-hot-toast';

type BadgeColor = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange';
const SEVERITY_COLOR: Record<ReplayFlag['severity'], BadgeColor> = { low: 'yellow', medium: 'orange', high: 'red' };

const xpText = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v}`;
const xpClass = (v: number | null | undefined) =>
  v === null || v === undefined ? 'text-gray-400' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-500';

/**
 * Duel sozlamalari (spec §12 "Content management": duel vaqti va savollar soni).
 * Backend: GET/PUT /admin/duels/config. XP qoidalari Leagues sahifasida.
 */
function DuelSettingsCard() {
  const { t } = useTranslation('duels');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [timeOptions, setTimeOptions] = useState('');
  const [defaultTime, setDefaultTime] = useState<number>(60);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [seeded, setSeeded] = useState<DuelConfig | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['duel-config'],
    queryFn: () => duelsApi.getConfig().then(r => r.data.data),
  });

  // Server config kelganda (yoki qayta yuklanganda) formani to'ldirish — render vaqtida derived state
  if (config && config !== seeded) {
    setSeeded(config);
    setTimeOptions(config.timeOptions.join(', '));
    setDefaultTime(config.defaultSeconds);
    setQuestionCount(config.questionCount);
  }

  const parsedOptions = timeOptions
    .split(/[,\s]+/)
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0);

  const save = useMutation({
    mutationFn: () => duelsApi.updateConfig({
      time_options: parsedOptions,
      default_duel_time: defaultTime,
      questions_per_duel: questionCount,
    }).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message || t('common:toast.saved'));
      qc.invalidateQueries({ queryKey: ['duel-config'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('settings.saveError')),
  });

  return (
    <Card className="p-4">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isLoading || !config
                ? t('common:state.loading')
                : t('settings.summary', {
                    times: config.timeOptions.join(' / '),
                    standard: config.defaultSeconds,
                    questions: t('settings.questionsCount', { count: config.questionCount }),
                    win: config.xpWin,
                    lose: config.xpLose,
                    draw: `${config.xpDraw >= 0 ? '+' : ''}${config.xpDraw}`,
                  })}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>

      {open && config && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.timeOptions')}</label>
            <input
              value={timeOptions}
              onChange={e => setTimeOptions(e.target.value)}
              placeholder="60, 120, 180, 240"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 mt-1">{t('settings.timeOptionsHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.defaultTime')}</label>
            <select
              value={defaultTime}
              onChange={e => setDefaultTime(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {(parsedOptions.length ? parsedOptions : config.timeOptions).map(s => (
                <option key={s} value={s}>{t('common:units.seconds', { count: s })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('settings.questionCount')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <Trans i18nKey="duels:settings.xpNote" components={{ b: <b /> }} />
            </p>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={parsedOptions.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {t('common:actions.save')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PlayerSummary({ label, p }: { label: string; p: ReplayPlayer }) {
  const { t } = useTranslation('duels');
  return (
    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {p.username ?? '—'} {p.is_bot && <Badge color="orange" size="sm">{t('player.bot')}</Badge>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{p.score}</p>
          <p className={cn('text-xs font-semibold', xpClass(p.xp_change))}>{xpText(p.xp_change)} XP</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div><p className="text-gray-400">{t('replay.correct')}</p><p className="font-medium text-gray-900 dark:text-gray-100">{p.correct}/{p.answered}</p></div>
        <div><p className="text-gray-400">{t('replay.accuracy')}</p><p className="font-medium text-gray-900 dark:text-gray-100">{p.accuracy === null ? '—' : `${p.accuracy}%`}</p></div>
        <div><p className="text-gray-400">{t('replay.avgGap')}</p><p className="font-medium text-gray-900 dark:text-gray-100">{p.avg_gap_seconds === null ? '—' : t('units.secCompact', { value: p.avg_gap_seconds })}</p></div>
      </div>
      {p.flags.length > 0 && (
        <div className="space-y-1 pt-1">
          {p.flags.map(f => (
            <div key={f.code} className="flex items-start gap-1.5 text-xs">
              <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', f.severity === 'high' ? 'text-red-500' : f.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500')} />
              <span className="text-gray-700 dark:text-gray-300">{f.text}</span>
              <Badge color={SEVERITY_COLOR[f.severity]} size="sm">{t(`replay.severity.${f.severity}`, { defaultValue: f.severity })}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerCell({ a, options }: { a: DuelReplay['questions'][number]['p1']; options: { id: number; text: string; is_correct: boolean }[] }) {
  const { t } = useTranslation('duels');
  if (!a) return <span className="text-gray-400 text-xs">{t('replay.noAnswer')}</span>;
  const opt = a.selected_option_id != null ? options.find(o => o.id === a.selected_option_id) : null;
  return (
    <div className="flex items-start gap-1.5">
      {a.is_correct
        ? <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
        : <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-900 dark:text-gray-100 truncate max-w-[180px]" title={opt?.text ?? ''}>
          {opt?.text ?? (a.selected_option_id == null ? t('replay.timeUp') : `#${a.selected_option_id}`)}
        </p>
        <p className="text-[11px] text-gray-400">{t('units.secCompact', { value: a.seconds_from_start })}</p>
      </div>
    </div>
  );
}

export default function DuelsPage() {
  const { t } = useTranslation('duels');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selected, setSelected] = useState<Duel | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: duelsData, isLoading } = useQuery({
    queryKey: ['admin-duels', page, search, statusFilter, subjectFilter, sortOrder],
    queryFn: () => duelsApi.getAll({
      page,
      limit,
      search: search || undefined,
      status: statusFilter || undefined,
      subject_id: subjectFilter ? Number(subjectFilter) : undefined,
      sort: sortOrder,
    }).then(r => r.data),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsApi.getAllForDropdown().then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['duels-stats'],
    queryFn: () => duelsApi.getStats().then(r => r.data),
  });

  // Replay — faqat modal ochilganda yuklanadi
  const { data: replay, isLoading: replayLoading } = useQuery({
    queryKey: ['duel-replay', selected?.id],
    queryFn: () => duelsApi.getReplay(selected!.id).then(r => r.data.data),
    enabled: viewModal && !!selected,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => duelsApi.delete(id),
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-duels'] });
    },
    onError: () => toast.error(t('toast.deleteFailed')),
  });

  const duels: Duel[] = Array.isArray((duelsData as any)?.data) ? (duelsData as any).data : [];
  const total: number = (duelsData as any)?.total ?? 0;
  const subjects: Subject[] = Array.isArray((subjectsData as any)?.data) ? (subjectsData as any).data : [];
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const getStatusColor = (status: string): BadgeColor => {
    switch (status) {
      case 'waiting': return 'yellow';
      case 'active': return 'blue';
      case 'finished': return 'green';
      case 'cancelled': return 'red';
      case 'expired': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'active': return <Swords className="w-4 h-4" />;
      case 'finished': return <Trophy className="w-4 h-4" />;
      default: return null;
    }
  };

  // Backenddan kelgan status qiymati (id) — matn render vaqtida tarjima qilinadi
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return t('status.waiting');
      case 'active': return t('common:status.active');
      case 'finished': return t('status.finished');
      case 'cancelled': return t('common:status.cancelled');
      case 'expired': return t('common:status.expired');
      default: return status;
    }
  };

  const totalFlags = replay ? replay.players.p1.flags.length + replay.players.p2.flags.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Duel sozlamalari */}
      <DuelSettingsCard />

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('title')} <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allStatuses')}</option>
            <option value="active">{t('common:status.active')}</option>
            <option value="finished">{t('status.finished')}</option>
            <option value="expired">{t('common:status.expired')}</option>
          </select>

          <select
            value={subjectFilter}
            onChange={e => { setSubjectFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allSubjects')}</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={e => { setSortOrder(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="newest">{t('filters.sortNewest')}</option>
            <option value="oldest">{t('filters.sortOldest')}</option>
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : duels.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <Table headers={[
              t('common:table.id'),
              t('table.players'),
              t('common:table.subject'),
              t('common:table.status'),
              t('table.score'),
              t('table.xpChange'),
              t('table.duration'),
              t('common:table.created'),
              '',
            ]}>
              {duels.map((duel) => (
                <tr key={duel.id}>
                  <td className="px-4 py-3 text-sm text-gray-500">#{duel.id}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{duel.player1_username}</span>
                        {duel.is_bot_game && <Badge color="orange" size="sm">{t('table.vsBot')}</Badge>}
                      </div>
                      {duel.player2_username && (
                        <div className="text-sm text-gray-500">{t('table.vsPlayer', { name: duel.player2_username })}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{duel.subject_name}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(duel.status)}
                      <Badge color={getStatusColor(duel.status)}>{getStatusLabel(duel.status)}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {duel.status === 'finished' ? (
                      <div className="text-sm">
                        <div className="font-medium">{duel.p1_score} - {duel.p2_score}</div>
                        {duel.is_draw ? (
                          <div className="text-gray-500 text-xs">{t('table.draw')}</div>
                        ) : duel.winner_username ? (
                          <div className="text-green-600 text-xs">{t('table.winner', { name: duel.winner_username })}</div>
                        ) : duel.is_bot_game ? (
                          <div className="text-orange-600 text-xs">{t('table.winner', { name: t('player.bot') })}</div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {duel.status === 'finished' ? (
                      <div className="space-y-0.5">
                        <div className={cn('font-medium', xpClass(duel.p1_xp_change))}>{xpText(duel.p1_xp_change)}</div>
                        <div className={cn('text-xs', xpClass(duel.p2_xp_change))}>{xpText(duel.p2_xp_change)}</div>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {duel.finished_at ?
                      formatDuration(new Date(duel.created_at), new Date(duel.finished_at)) :
                      duel.status === 'active' ?
                      formatDuration(new Date(duel.created_at), new Date()) :
                      '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(duel.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelected(duel); setViewModal(true); }} title={t('actions.replay')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setSelected(duel); setDeleteModal(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination
              page={page}
              total={total}
              limit={limit}
              onChange={setPage}
            />
          </>
        )}
      </div>

      {/* Replay Modal */}
      <Modal
        open={viewModal}
        onClose={() => { setViewModal(false); setSelected(null); }}
        title={selected ? t('replay.title', { id: selected.id }) : t('duelSingular')}
        size="xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge color={getStatusColor(selected.status)}>{getStatusLabel(selected.status)}</Badge>
              <Badge color="blue">{selected.subject_name}</Badge>
              {replay?.duel.duration_seconds && <Badge color="gray">{t('units.sec', { value: replay.duel.duration_seconds })}</Badge>}
              {replay?.duel.ai_test_id && <Badge color="purple">{t('replay.aiTestDuel')}</Badge>}
              <span className="text-gray-500">{formatDate(selected.created_at)}</span>
              {selected.finished_at && <span className="text-gray-400">→ {formatDate(selected.finished_at)}</span>}
              {totalFlags > 0 && (
                <Badge color="red">
                  <AlertTriangle className="w-3 h-3 mr-1" /> {t('replay.suspiciousCount', { count: totalFlags })}
                </Badge>
              )}
            </div>

            {replayLoading || !replay ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <PlayerSummary label={t('player.player1')} p={replay.players.p1} />
                  <PlayerSummary label={replay.players.p2.is_bot ? t('player.bot') : t('player.player2')} p={replay.players.p2} />
                </div>

                {replay.duel.status === 'finished' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {replay.duel.is_draw
                      ? t('replay.resultDraw')
                      : replay.duel.winner_username
                        ? <Trans shouldUnescape tOptions={{ interpolation: { escapeValue: true } }} i18nKey="duels:replay.resultWinner" values={{ name: replay.duel.winner_username }} components={{ b: <b className="text-green-600" /> }} />
                        : t('replay.resultNoWinner')}
                  </p>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('replay.byQuestion', { total: replay.questions.length })}
                  </h4>
                  {replay.questions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      {replay.duel.ai_test_id ? t('replay.aiQuestionsSeparate') : t('replay.noAnswers')}
                    </p>
                  ) : (
                    <Table headers={['#', t('replay.questionHeader'), replay.players.p1.username ?? 'P1', replay.players.p2.username ?? (replay.players.p2.is_bot ? t('player.bot') : 'P2')]}>
                      {replay.questions.map(q => (
                        <tr key={q.id}>
                          <td className="px-4 py-2 text-xs text-gray-400">{q.index}</td>
                          <td className="px-4 py-2">
                            <p className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={q.text ?? ''}>{q.text ?? t('replay.questionFallback', { id: q.id })}</p>
                            <p className="text-[11px] text-gray-400">
                              {t('replay.questionMeta', {
                                difficulty: q.difficulty != null ? t(`replay.difficulty.${q.difficulty}`, { defaultValue: q.difficulty }) : '—',
                                answer: q.options.find(o => o.is_correct)?.text ?? '—',
                              })}
                            </p>
                          </td>
                          <td className="px-4 py-2"><AnswerCell a={q.p1} options={q.options} /></td>
                          <td className="px-4 py-2"><AnswerCell a={q.p2} options={q.options} /></td>
                        </tr>
                      ))}
                    </Table>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">
                    {t('replay.footnote')}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title={t('delete.title')}>
        <div className="space-y-4">
          <p>{t('delete.confirm')} {t('common:confirm.irreversible')}</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{t('duelNumber', { id: selected.id })}</p>
              <p className="text-sm text-gray-500">
                {selected.is_bot_game
                  ? t('delete.matchupBot', { p1: selected.player1_username ?? '' })
                  : selected.player2_username
                    ? t('delete.matchup', { p1: selected.player1_username ?? '', p2: selected.player2_username })
                    : t('delete.matchupWaiting', { p1: selected.player1_username ?? '' })}
              </p>
              <p className="text-sm text-gray-500">{selected.subject_name} • {getStatusLabel(selected.status)}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              loading={deleteMutation.isPending}
            >
              {t('common:actions.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
