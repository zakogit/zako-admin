import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Clock, BarChart3, Trophy, Pencil, Play, Pause, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { seasonsApi } from '../../api/services';
import { Card, Spinner, EmptyState, Badge, Button, Modal, Input } from '../../components/ui';
import { getIntlLocale } from '../../i18n';
import { formatNumber, getStaticFileUrl } from '../../utils/helpers';
import type { Season, SeasonStats, UserBadge, LeaderboardEntry, BadgeType } from '../../types';

const SeasonDetailsPage: React.FC = () => {
  const { t } = useTranslation('seasons');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const seasonId = Number(id);

  const [season, setSeason] = useState<Season | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  // Matn emas, holat: xabar render vaqtida tarjima qilinadi (til almashganda yangilanishi uchun)
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'badges'>('overview');
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSeasonData = async () => {
    try {
      setLoading(true);
      const [detailsResponse, completionResponse] = await Promise.all([
        seasonsApi.getById(seasonId),
        seasonsApi.getCompletionStatus(seasonId),
      ]);
      setSeason(detailsResponse.data.data.season);
      setStats(detailsResponse.data.data.stats);
      setIsCompleted(completionResponse.data.data.badges_distributed);
    } catch (err) {
      setLoadFailed(true);
      console.error('Error fetching season data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await seasonsApi.getLeaderboard(seasonId, 50);
      setLeaderboard(response.data.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  const fetchBadges = async () => {
    try {
      const response = await seasonsApi.getBadges(seasonId);
      setBadges(response.data.data);
    } catch (err) {
      console.error('Error fetching badges:', err);
    }
  };

  const fetchBadgeTypes = async () => {
    try {
      const response = await seasonsApi.getBadgeTypes();
      setBadgeTypes(response.data.data);
    } catch (err) {
      console.error('Error fetching badge types:', err);
    }
  };

  useEffect(() => {
    if (seasonId) fetchSeasonData();
  }, [seasonId]);

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard();
    else if (activeTab === 'badges') {
      fetchBadges();
      fetchBadgeTypes();
    }
  }, [activeTab]);

  const handleCompleteSeason = async () => {
    if (!season) return;
    if (!confirm(t('confirm.complete', { title: season.title }))) return;
    try {
      setCompleting(true);
      const notes = prompt(t('prompts.completeNote'));
      await seasonsApi.complete(seasonId, notes || undefined);
      setIsCompleted(true);
      await fetchSeasonData();
      alert(t('toast.completed'));
    } catch (err) {
      console.error('Error completing season:', err);
      alert(t('toast.completeError'));
    } finally {
      setCompleting(false);
    }
  };

  const openEdit = () => {
    if (!season) return;
    setEditTitle(season.title);
    setEditDesc(season.description || '');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) {
      toast.error(t('edit.nameRequired'));
      return;
    }
    try {
      setSavingEdit(true);
      await seasonsApi.update(seasonId, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
      });
      setEditOpen(false);
      await fetchSeasonData();
      toast.success(t('toast.updated'));
    } catch {
      toast.error(t('toast.updateError'));
    } finally {
      setSavingEdit(false);
    }
  };

  const [statusBusy, setStatusBusy] = useState(false);

  const changeStatus = async (status: 'active' | 'upcoming' | 'cancelled') => {
    if (status === 'cancelled' && !confirm(t('confirm.cancel'))) return;
    try {
      setStatusBusy(true);
      await seasonsApi.updateStatus(seasonId, status);
      await fetchSeasonData();
      toast.success(t('toast.statusChanged'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('toast.statusError'));
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirm.delete'))) return;
    try {
      setStatusBusy(true);
      await seasonsApi.delete(seasonId);
      toast.success(t('toast.deleted'));
      navigate('/seasons');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('toast.deleteError'));
      setStatusBusy(false);
    }
  };

  const statusMap = {
    upcoming: { color: 'blue' as const, label: t('status.upcoming') },
    active: { color: 'green' as const, label: t('common:status.active') },
    completed: { color: 'gray' as const, label: t('common:status.completed') },
    cancelled: { color: 'red' as const, label: t('common:status.cancelled') },
  };

  const statusBadge = (status: Season['status']) => {
    return <Badge color={statusMap[status].color}>{statusMap[status].label}</Badge>;
  };

  const getBadgeIcon = (badgeName: string) => {
    const icons: Record<string, string> = { champion: '🏆', top10: '🥈', top50: '🥉', top100: '🎖️' };
    return icons[badgeName] || '🏅';
  };

  const durationDays = season
    ? Math.ceil((new Date(season.end_date).getTime() - new Date(season.start_date).getTime()) / 86400000)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadFailed || !season) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('common:state.error')}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{loadFailed ? t('errors.loadFailed') : null}</p>
        <Link to="/seasons" className="text-primary-600 hover:text-primary-700 font-medium">
          {t('errors.backToList')}
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: t('details.stats.total'), value: stats?.total_participants ?? 0, icon: <Users className="w-6 h-6" />, color: 'bg-blue-500' },
    { label: t('details.stats.active'), value: stats?.active_participants ?? 0, icon: <UserCheck className="w-6 h-6" />, color: 'bg-green-500' },
    { label: t('details.stats.duration'), value: t('common:units.days', { count: durationDays }), icon: <Clock className="w-6 h-6" />, color: 'bg-amber-500' },
    { label: t('details.stats.completion'), value: `${(stats?.completion_rate ?? 0).toFixed(1)}%`, icon: <BarChart3 className="w-6 h-6" />, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/seasons"
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('common:actions.back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{season.title}</h1>
            {statusBadge(season.status)}
            {isCompleted && <Badge color="purple">{t('badges.distributed')}</Badge>}
          </div>
          {season.description && <p className="text-gray-600 dark:text-gray-400">{season.description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={openEdit} disabled={statusBusy}>
            <Pencil className="w-4 h-4" />
            {t('actions.rename')}
          </Button>

          {season.status === 'upcoming' && (
            <Button variant="primary" onClick={() => changeStatus('active')} loading={statusBusy}>
              <Play className="w-4 h-4" />
              {t('common:actions.activate')}
            </Button>
          )}

          {season.status === 'active' && (
            <Button variant="secondary" onClick={() => changeStatus('upcoming')} loading={statusBusy}>
              <Pause className="w-4 h-4" />
              {t('actions.pause')}
            </Button>
          )}

          {season.status === 'active' && (
            <Button variant="primary" onClick={handleCompleteSeason} loading={completing}>
              <Trophy className="w-4 h-4" />
              {t('actions.complete')}
            </Button>
          )}

          {season.status === 'completed' && !isCompleted && (
            <Button variant="primary" onClick={handleCompleteSeason} loading={completing}>
              <Trophy className="w-4 h-4" />
              {t('actions.distributeBadges')}
            </Button>
          )}

          {(season.status === 'upcoming' || season.status === 'active') && (
            <Button variant="outline" onClick={() => changeStatus('cancelled')} loading={statusBusy}>
              <XCircle className="w-4 h-4" />
              {t('actions.cancelSeason')}
            </Button>
          )}

          {season.status !== 'active' && (
            <Button variant="danger" onClick={handleDelete} loading={statusBusy}>
              <Trash2 className="w-4 h-4" />
              {t('common:actions.delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
                <div className={`p-3 rounded-xl text-white ${s.color}`}>{s.icon}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex gap-6 px-6">
            {[
              { key: 'overview', label: t('tabs.overview'), icon: '📊' },
              { key: 'leaderboard', label: t('tabs.leaderboard'), icon: '🏆' },
              { key: 'badges', label: t('tabs.badges'), icon: '🏅' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('details.overview.infoTitle')}</h3>
                <div className="space-y-3 text-sm">
                  {[
                    [t('details.overview.start'), new Date(season.start_date).toLocaleString(getIntlLocale())],
                    [t('details.overview.end'), new Date(season.end_date).toLocaleString(getIntlLocale())],
                    [t('common:table.created'), new Date(season.created_at).toLocaleString(getIntlLocale())],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500 dark:text-gray-400">{k}:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('details.overview.extraTitle')}</h3>
                <div className="space-y-3 text-sm">
                  {[
                    [t('details.overview.duration'), t('common:units.days', { count: durationDays })],
                    [t('common:table.status'), statusMap[season.status].label],
                    [t('details.overview.lastUpdate'), new Date(season.updated_at).toLocaleString(getIntlLocale())],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500 dark:text-gray-400">{k}:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('details.leaderboard.title')}</h3>
              {leaderboard.length === 0 ? (
                <EmptyState message={t('details.leaderboard.empty')} />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        {[t('details.leaderboard.rank'), t('common:table.user'), t('details.leaderboard.points')].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {leaderboard.map((entry, index) => {
                        const rank = index + 1;
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <span className={`font-bold ${
                                rank === 1 ? 'text-amber-500' : rank <= 3 ? 'text-gray-500 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                #{rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {entry.avatar && (
                                  <img
                                    src={getStaticFileUrl(entry.avatar)}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {entry.first_name} {entry.last_name}
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-400">
                                    @{entry.username}{entry.region_name ? ` · ${entry.region_name}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{formatNumber(entry.xp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Badges */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('details.badges.title')}</h3>
              {isCompleted && badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">{getBadgeIcon(badge.badge_name)}</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{badge.badge_title}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('rank.hash', { rank: badge.rank_position })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {badge.avatar && <img src={badge.avatar} alt="" className="w-8 h-8 rounded-full" />}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {badge.first_name} {badge.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">@{badge.username}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {new Date(badge.earned_at).toLocaleDateString(getIntlLocale())}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
                    {t('details.badges.notDistributed')}
                  </div>

                  {/* Beriladigan badge turlari — oldindan ko'rish */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {badgeTypes.map((bt) => (
                      <div
                        key={bt.id}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col items-center text-center"
                      >
                        <div className="text-4xl mb-2">{getBadgeIcon(bt.name)}</div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{bt.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {bt.rank_max && bt.rank_max !== bt.rank_min
                            ? t('rank.range', { from: bt.rank_min, to: bt.rank_max })
                            : t('rank.single', { rank: bt.rank_min })}
                        </p>
                        {bt.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{bt.description}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {season.status === 'completed' && (
                    <div className="flex justify-center pt-2">
                      <Button variant="primary" onClick={handleCompleteSeason} loading={completing}>
                        <Trophy className="w-4 h-4" />
                        {t('actions.distributeBadges')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Rename / tahrirlash modali */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('edit.title')}>
        <div className="space-y-4">
          <Input
            label={t('form.name')}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={t('edit.namePlaceholder')}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('edit.description')}</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder={t('edit.descriptionPlaceholder')}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              {t('common:actions.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SeasonDetailsPage;
