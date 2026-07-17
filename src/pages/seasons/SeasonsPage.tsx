import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Users,
  Trophy,
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Award,
} from 'lucide-react';
import { seasonsApi } from '../../api/services';
import { Card, Spinner } from '../../components/ui';
import { getStaticFileUrl } from '../../utils/helpers';
import type { BadgeType } from '../../types';

/** Nishon rasmi — yuklanmasa chiroyli emoji (🏆🥈🥉🎖️) ko'rsatadi ("Error" o'rniga). */
function BadgeIcon({ name, iconPath, title }: { name: string; iconPath?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const emoji: Record<string, string> = { champion: '🏆', top10: '🥈', top50: '🥉', top100: '🎖️' };
  const fallback = emoji[name] || '🏅';
  if (!iconPath || failed) {
    return (
      <div className="w-28 h-28 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-5xl mb-4">
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={getStaticFileUrl(iconPath)}
      alt={title}
      onError={() => setFailed(true)}
      className="w-28 h-28 object-contain mb-4"
    />
  );
}

interface Season {
  id: number;
  title: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  total_participants: number;
  season_number?: number;
  created_at: string;
  updated_at: string;
}

const SeasonsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'seasons' | 'badges'>('seasons');

  // Fetch seasons
  const { data: seasons = [], isLoading, error } = useQuery({
    queryKey: ['seasons', statusFilter],
    queryFn: async () => {
      const response = await seasonsApi.getAll({
        status: statusFilter || undefined,
        limit: 100,
      });
      const seasonsData = response.data?.data || response.data;
      return Array.isArray(seasonsData) ? (seasonsData as Season[]) : [];
    },
  });

  // Fetch badge catalog
  const { data: badgeTypes = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['admin', 'badge-types'],
    queryFn: async () => {
      const res = await seasonsApi.getBadgeTypes();
      return (res.data?.data || []) as BadgeType[];
    },
    enabled: activeTab === 'badges',
  });

  // Barcha boshqaruv amallari (faollashtirish, yakunlash, o'chirish, ...) endi
  // season detail sahifasida (/seasons/:id). Bu yerda faqat ro'yxat + "Batafsil".

  const getStatusBadge = (status: Season['status']) => {
    const configs = {
      upcoming: {
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        icon: Clock,
        label: 'Rejalashtirilgan',
      },
      active: {
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        icon: Play,
        label: 'Faol',
      },
      completed: {
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        icon: CheckCircle,
        label: 'Yakunlangan',
      },
      cancelled: {
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        icon: XCircle,
        label: 'Bekor qilingan',
      },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Xatolik yuz berdi</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Seasons Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Mavsumlar va nishonlar tizimini boshqaring
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Barcha holatlar</option>
            <option value="upcoming">Rejalashtirilgan</option>
            <option value="active">Faol</option>
            <option value="completed">Yakunlangan</option>
            <option value="cancelled">Bekor qilingan</option>
          </select>
          <Link
            to="/seasons/create"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Yangi Season</span>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('seasons')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'seasons'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Seasons</span>
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'badges'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Award className="h-5 w-5" />
            <span>Nishonlar</span>
          </button>
        </nav>
      </div>

      {/* Seasons Tab */}
      {activeTab === 'seasons' && (
        <>
          {/* Pipeline banner — avtomatik rotatsiya holati */}
          {(() => {
            const active = seasons.find((s) => s.status === 'active');
            const upcoming = seasons
              .filter((s) => s.status === 'upcoming')
              .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
            const dLeft = active ? getDaysRemaining(active.end_date) : 0;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-xs font-semibold uppercase tracking-wide">
                    <Play className="w-4 h-4" /> Hozirgi mavsum
                  </div>
                  {active ? (
                    <div className="mt-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {active.title}
                        {active.season_number && <span className="ml-2 text-sm text-gray-400">#{active.season_number}</span>}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(active.start_date)} – {formatDate(active.end_date)}
                      </p>
                      <p className={`mt-1 text-sm font-medium ${dLeft > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {dLeft > 0 ? `${dLeft} kun qoldi` : 'Muddati tugadi — tez orada yakunlanadi'}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Faol mavsum yo'q</p>
                  )}
                </div>
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide">
                    <Clock className="w-4 h-4" /> Keyingi mavsum
                  </div>
                  {upcoming ? (
                    <div className="mt-2">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {upcoming.title}
                        {upcoming.season_number && <span className="ml-2 text-sm text-gray-400">#{upcoming.season_number}</span>}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(upcoming.start_date)} – {formatDate(upcoming.end_date)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Hozirgi mavsum tugagach avtomatik faollashadi
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Navbatda mavsum yo'q</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Jami Seasons', value: seasons.length, icon: Trophy, color: 'blue' },
              { label: 'Faol', value: seasons.filter((s) => s.status === 'active').length, icon: Play, color: 'green' },
              { label: 'Rejalashtirilgan', value: seasons.filter((s) => s.status === 'upcoming').length, icon: Clock, color: 'yellow' },
              { label: 'Yakunlangan', value: seasons.filter((s) => s.status === 'completed').length, icon: CheckCircle, color: 'gray' },
            ].map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses: Record<string, string> = {
                blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
                green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300',
                yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300',
                gray: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
              };

              return (
                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seasons Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Barcha Seasons</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Season</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Holat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sana</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ishtirokchilar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Yaratilgan</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amallar</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {seasons.map((season) => {
                    const daysRemaining = getDaysRemaining(season.end_date);
                    return (
                      <tr key={season.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {season.title}
                              {season.season_number && (
                                <span className="ml-2 text-xs text-gray-400">#{season.season_number}</span>
                              )}
                            </div>
                            {season.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {season.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(season.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(season.start_date)} - {formatDate(season.end_date)}
                          </div>
                          {season.status === 'active' && (
                            <div className={`text-xs mt-1 ${daysRemaining > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {daysRemaining > 0 ? `${daysRemaining} kun qoldi` : 'Muddati tugagan'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            {season.total_participants}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(season.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/seasons/${season.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                            title="Barcha amallar shu yerda"
                          >
                            Batafsil
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {seasons.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Seasons topilmadi</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Yangi season yarating</p>
                  <div className="mt-6">
                    <Link
                      to="/seasons/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Yangi Season
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Badges Catalog Tab */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nishon turlari</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Mavsum yakunida reyting bo'yicha tarqatiladigan nishonlar (top 100). Rasmlar mobil ilovada ko'rinadi.
            </p>
          </div>

          {badgesLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : badgeTypes.length === 0 ? (
            <Card className="p-12 text-center text-gray-500 dark:text-gray-400">Nishon turlari topilmadi</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {badgeTypes.map((bt) => (
                <Card key={bt.id} className="p-6 flex flex-col items-center text-center">
                  <BadgeIcon name={bt.name} iconPath={bt.icon_path} title={bt.title} />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{bt.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {bt.rank_max && bt.rank_max !== bt.rank_min
                      ? `${bt.rank_min}–${bt.rank_max}-o'rin`
                      : `${bt.rank_min}-o'rin`}
                  </p>
                  {bt.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{bt.description}</p>
                  )}
                  <span
                    className="mt-3 inline-block w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: bt.badge_color || '#9CA3AF' }}
                    title={bt.badge_color}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeasonsPage;
