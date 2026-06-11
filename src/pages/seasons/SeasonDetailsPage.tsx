import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { seasonsApi } from '../../api/services';
import type { Season, SeasonStats, UserBadge, LeaderboardEntry } from '../../types';

const SeasonDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);

  const [season, setSeason] = useState<Season | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'badges'>('overview');
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const fetchSeasonData = async () => {
    try {
      setLoading(true);
      const [detailsResponse, completionResponse] = await Promise.all([
        seasonsApi.getById(seasonId),
        seasonsApi.getCompletionStatus(seasonId)
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

  useEffect(() => {
    if (seasonId) {
      fetchSeasonData();
    }
  }, [seasonId]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeTab === 'badges') {
      fetchBadges();
    }
  }, [activeTab]);

  const handleCompleteSeason = async () => {
    if (!season) return;
    
    const confirmed = confirm(
      `"${season.title}" mavsumini yakunlash va batchlarni taqsimlashni xohlaysizmi? Bu amal qaytarilmaydi.`
    );
    
    if (!confirmed) return;

    try {
      setCompleting(true);
      const notes = prompt('Yakunlash uchun qo\'shimcha izoh (ixtiyoriy):');
      await seasonsApi.complete(seasonId, notes || undefined);
      setIsCompleted(true);
      await fetchSeasonData();
      alert('Mavsum muvaffaqiyatli yakunlandi va batchlar taqsimlandi!');
    } catch (err) {
      console.error('Error completing season:', err);
      alert('Mavsumni yakunlashda xatolik yuz berdi');
    } finally {
      setCompleting(false);
    }
  };

  const getStatusBadge = (status: Season['status']) => {
    const badges = {
      upcoming: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const labels = {
      upcoming: 'Rejalashtirilgan',
      active: 'Faol',
      completed: 'Yakunlangan',
      cancelled: 'Bekor qilingan'
    };

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };


  const getBadgeIcon = (badgeName: string) => {
    const icons: Record<string, string> = {
      champion: '🏆',
      top10: '🥈',
      top50: '🥉',
      top100: '🎖️'
    };
    return icons[badgeName] || '🏅';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Xatolik yuz berdi</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link
          to="/seasons"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Mavsumlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/seasons"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Orqaga"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{season.title}</h1>
            {getStatusBadge(season.status)}
            {isCompleted && (
              <span className="bg-purple-100 text-purple-800 px-3 py-1 text-sm font-medium rounded-full border border-purple-200">
                Batchlar taqsimlangan
              </span>
            )}
          </div>
          <p className="text-gray-600">{season.description}</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {season.status === 'completed' && !isCompleted && (
            <button
              onClick={handleCompleteSeason}
              disabled={completing}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {completing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              🏆 Batchlarni Taqsimlash
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Jami Qatnashuvchilar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_participants}</p>
              </div>
              <div className="text-blue-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Faol Qatnashuvchilar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active_participants}</p>
              </div>
              <div className="text-green-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Olingan Sovg'alar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_rewards_claimed}</p>
              </div>
              <div className="text-yellow-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">To'liqlik Darajasi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completion_rate.toFixed(1)}%</p>
              </div>
              <div className="text-purple-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Umumiy Ma\'lumot', icon: '📊' },
              { key: 'leaderboard', label: 'Reyting', icon: '🏆' },
              { key: 'badges', label: 'Batchlar', icon: '🏅' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mavsum Ma'lumotlari</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Boshlanish:</span>
                      <span className="font-medium">{new Date(season.start_date).toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tugash:</span>
                      <span className="font-medium">{new Date(season.end_date).toLocaleString('uz-UZ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Maksimal qatnashuvchilar:</span>
                      <span className="font-medium">{season.max_participants || 'Cheksiz'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Yaratilgan:</span>
                      <span className="font-medium">{new Date(season.created_at).toLocaleString('uz-UZ')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Qo'shimcha Ma'lumotlar</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mavsum davomiyligi:</span>
                      <span className="font-medium">
                        {Math.ceil((new Date(season.end_date).getTime() - new Date(season.start_date).getTime()) / (1000 * 60 * 60 * 24))} kun
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Holati:</span>
                      <span className="font-medium">{season.status === 'active' ? 'Faol' : season.status === 'completed' ? 'Yakunlangan' : season.status === 'upcoming' ? 'Rejalashtirilgan' : 'Bekor qilingan'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Oxirgi yangilanish:</span>
                      <span className="font-medium">{new Date(season.updated_at).toLocaleString('uz-UZ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Reyting Jadvali</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">O'rin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foydalanuvchi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ochkolar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yakunlangan kunlar</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yutuqlar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaderboard.map((entry) => (
                      <tr key={entry.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          <span className={`font-bold ${
                            entry.rank_position === 1 ? 'text-yellow-600' :
                            entry.rank_position <= 3 ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            #{entry.rank_position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            {entry.avatar && (
                              <img
                                src={entry.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {entry.first_name} {entry.last_name}
                              </p>
                              <p className="text-gray-500">@{entry.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {entry.total_points}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.days_completed}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {entry.achievements_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {leaderboard.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Hali reyting ma'lumotlari yo'q</p>
                </div>
              )}
            </div>
          )}

          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Taqsimlangan Batchlar</h3>
              
              {isCompleted ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">
                          {getBadgeIcon(badge.badge_name)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{badge.badge_title}</h4>
                          <p className="text-sm text-gray-600">#{badge.rank_position} o'rin</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {badge.avatar && (
                          <img
                            src={badge.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {badge.first_name} {badge.last_name}
                          </p>
                          <p className="text-sm text-gray-500">@{badge.username}</p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(badge.earned_at).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Batchlar hali taqsimlanmagan</h3>
                  <p className="text-gray-500 mb-4">Mavsum yakunlanganidan keyin batchlarni taqsimlang</p>
                  {season.status === 'completed' && (
                    <button
                      onClick={handleCompleteSeason}
                      disabled={completing}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {completing && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      🏆 Batchlarni Taqsimlash
                    </button>
                  )}
                </div>
              )}
              
              {badges.length === 0 && isCompleted && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Hech qanday batch taqsimlanmagan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonDetailsPage;