import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Clock, BarChart3, Trophy, Pencil, Play, Pause, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { seasonsApi } from '../../api/services';
import { Card, Spinner, EmptyState, Badge, Button, Modal, Input } from '../../components/ui';
import type { Season, SeasonStats, UserBadge, LeaderboardEntry, BadgeType } from '../../types';

const SeasonDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const seasonId = Number(id);

  const [season, setSeason] = useState<Season | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError('Ma\'lumotlar yuklanmadi');
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
    if (!confirm(`"${season.title}" mavsumini yakunlash va badgelarni taqsimlashni xohlaysizmi? Bu amal qaytarilmaydi.`)) return;
    try {
      setCompleting(true);
      const notes = prompt('Yakunlash uchun qo\'shimcha izoh (ixtiyoriy):');
      await seasonsApi.complete(seasonId, notes || undefined);
      setIsCompleted(true);
      await fetchSeasonData();
      alert('Mavsum muvaffaqiyatli yakunlandi va badgelar taqsimlandi!');
    } catch (err) {
      console.error('Error completing season:', err);
      alert('Mavsumni yakunlashda xatolik yuz berdi');
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
      toast.error('Nom bo\'sh bo\'lmasligi kerak');
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
      toast.success('Mavsum yangilandi');
    } catch {
      toast.error('Yangilashda xatolik yuz berdi');
    } finally {
      setSavingEdit(false);
    }
  };

  const [statusBusy, setStatusBusy] = useState(false);

  const changeStatus = async (status: 'active' | 'upcoming' | 'cancelled') => {
    if (status === 'cancelled' && !confirm('Mavsumni bekor qilishni xohlaysizmi?')) return;
    try {
      setStatusBusy(true);
      await seasonsApi.updateStatus(seasonId, status);
      await fetchSeasonData();
      toast.success('Mavsum holati o\'zgartirildi');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Holatni o\'zgartirishda xatolik');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Mavsumni o\'chirishni xohlaysizmi? Bu amal qaytarilmaydi.')) return;
    try {
      setStatusBusy(true);
      await seasonsApi.delete(seasonId);
      toast.success('Mavsum o\'chirildi');
      navigate('/seasons');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'O\'chirishda xatolik');
      setStatusBusy(false);
    }
  };

  const statusBadge = (status: Season['status']) => {
    const map = {
      upcoming: { color: 'blue' as const, label: 'Rejalashtirilgan' },
      active: { color: 'green' as const, label: 'Faol' },
      completed: { color: 'gray' as const, label: 'Yakunlangan' },
      cancelled: { color: 'red' as const, label: 'Bekor qilingan' },
    };
    return <Badge color={map[status].color}>{map[status].label}</Badge>;
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

  if (error || !season) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Xatolik yuz berdi</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Link to="/seasons" className="text-primary-600 hover:text-primary-700 font-medium">
          Mavsumlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  const statCards = [
    { label: 'Jami qatnashuvchilar', value: stats?.total_participants ?? 0, icon: <Users className="w-6 h-6" />, color: 'bg-blue-500' },
    { label: 'Faol qatnashuvchilar', value: stats?.active_participants ?? 0, icon: <UserCheck className="w-6 h-6" />, color: 'bg-green-500' },
    { label: 'Davomiylik', value: `${durationDays} kun`, icon: <Clock className="w-6 h-6" />, color: 'bg-amber-500' },
    { label: "To'liqlik darajasi", value: `${(stats?.completion_rate ?? 0).toFixed(1)}%`, icon: <BarChart3 className="w-6 h-6" />, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/seasons"
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Orqaga"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{season.title}</h1>
            {statusBadge(season.status)}
            {isCompleted && <Badge color="purple">Badgelar taqsimlangan</Badge>}
          </div>
          {season.description && <p className="text-gray-600 dark:text-gray-400">{season.description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={openEdit} disabled={statusBusy}>
            <Pencil className="w-4 h-4" />
            Nomini o'zgartirish
          </Button>

          {season.status === 'upcoming' && (
            <Button variant="primary" onClick={() => changeStatus('active')} loading={statusBusy}>
              <Play className="w-4 h-4" />
              Faollashtirish
            </Button>
          )}

          {season.status === 'active' && (
            <Button variant="secondary" onClick={() => changeStatus('upcoming')} loading={statusBusy}>
              <Pause className="w-4 h-4" />
              To'xtatish
            </Button>
          )}

          {season.status === 'active' && (
            <Button variant="primary" onClick={handleCompleteSeason} loading={completing}>
              <Trophy className="w-4 h-4" />
              Yakunlash
            </Button>
          )}

          {season.status === 'completed' && !isCompleted && (
            <Button variant="primary" onClick={handleCompleteSeason} loading={completing}>
              <Trophy className="w-4 h-4" />
              Badgelarni taqsimlash
            </Button>
          )}

          {(season.status === 'upcoming' || season.status === 'active') && (
            <Button variant="outline" onClick={() => changeStatus('cancelled')} loading={statusBusy}>
              <XCircle className="w-4 h-4" />
              Bekor qilish
            </Button>
          )}

          {season.status !== 'active' && (
            <Button variant="danger" onClick={handleDelete} loading={statusBusy}>
              <Trash2 className="w-4 h-4" />
              O'chirish
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
              { key: 'overview', label: "Umumiy ma'lumot", icon: '📊' },
              { key: 'leaderboard', label: 'Reyting', icon: '🏆' },
              { key: 'badges', label: 'Badgelar', icon: '🏅' },
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mavsum ma'lumotlari</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Boshlanish', new Date(season.start_date).toLocaleString('uz-UZ')],
                    ['Tugash', new Date(season.end_date).toLocaleString('uz-UZ')],
                    ['Yaratilgan', new Date(season.created_at).toLocaleString('uz-UZ')],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                      <span className="text-gray-500 dark:text-gray-400">{k}:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Qo'shimcha</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ['Mavsum davomiyligi', `${durationDays} kun`],
                    ['Holati', season.status === 'active' ? 'Faol' : season.status === 'completed' ? 'Yakunlangan' : season.status === 'upcoming' ? 'Rejalashtirilgan' : 'Bekor qilingan'],
                    ['Oxirgi yangilanish', new Date(season.updated_at).toLocaleString('uz-UZ')],
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reyting jadvali</h3>
              {leaderboard.length === 0 ? (
                <EmptyState message="Hali reyting ma'lumotlari yo'q (duellar o'ynalgach to'ladi)" />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        {["O'rin", 'Foydalanuvchi', 'Ochkolar'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {leaderboard.map((entry) => (
                        <tr key={entry.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3">
                            <span className={`font-bold ${
                              entry.rank_position === 1 ? 'text-amber-500' : entry.rank_position <= 3 ? 'text-gray-500 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              #{entry.rank_position}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {entry.avatar && <img src={entry.avatar} alt="" className="w-8 h-8 rounded-full" />}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {entry.first_name} {entry.last_name}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">@{entry.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{entry.total_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Badges */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Taqsimlangan badgelar</h3>
              {isCompleted && badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">{getBadgeIcon(badge.badge_name)}</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{badge.badge_title}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">#{badge.rank_position}-o'rin</p>
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
                        {new Date(badge.earned_at).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
                    Badgelar hali taqsimlanmagan. Mavsum tugagach quyidagilar TOP o'yinchilarga
                    avtomatik beriladi (yoki qo'lda yakunlang).
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
                            ? `${bt.rank_min}–${bt.rank_max}-o'rin`
                            : `${bt.rank_min}-o'rin`}
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
                        Badgelarni taqsimlash
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
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Mavsumni tahrirlash">
        <div className="space-y-4">
          <Input
            label="Mavsum nomi *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Masalan: Qish mavsumi"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tavsif (ixtiyoriy)</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Mavsum haqida qisqacha..."
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              Saqlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SeasonDetailsPage;
