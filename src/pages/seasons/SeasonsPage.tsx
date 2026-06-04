import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Users, 
  Trophy, 
  Gift, 
  MoreHorizontal,
  Edit3,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { seasonsApi } from '../../api/services';
import toast from 'react-hot-toast';

interface Season {
  id: number;
  title: string;
  description?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  total_participants: number;
  created_at: string;
  updated_at: string;
}

const SeasonsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState<number | null>(null);

  // Fetch seasons with React Query
  const { data: seasons = [], isLoading, error } = useQuery({
    queryKey: ['seasons', statusFilter],
    queryFn: async () => {
      const response = await seasonsApi.getAll({ 
        status: statusFilter || undefined,
        limit: 100
      });
      return response.data.data as Season[];
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await seasonsApi.updateStatus(id, status as any);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season holati o\'zgartirildi');
      setShowDropdown(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Xatolik yuz berdi');
    }
  });

  // Delete season mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await seasonsApi.delete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season o\'chirildi');
      setShowDropdown(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Season o\'chirishda xatolik');
    }
  });

  // Complete season mutation
  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await seasonsApi.complete(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Season yakunlandi va badgelar taqsimlandi');
      setShowDropdown(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Season yakunlashda xatolik');
    }
  });

  const getStatusBadge = (status: Season['status']) => {
    const configs = {
      upcoming: { 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        icon: Clock,
        label: 'Rejalashtirilgan'
      },
      active: { 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        icon: Play,
        label: 'Faol'
      },
      completed: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600',
        icon: CheckCircle,
        label: 'Yakunlangan'
      },
      cancelled: { 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        icon: XCircle,
        label: 'Bekor qilingan'
      }
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
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleStatusChange = (seasonId: number, newStatus: string) => {
    if (newStatus === 'completed') {
      if (confirm('Seasonni yakunlashni xohlaysizmi? Badge\'lar taqsimlanadi.')) {
        completeMutation.mutate(seasonId);
      }
    } else {
      statusMutation.mutate({ id: seasonId, status: newStatus });
    }
  };

  const handleDelete = (seasonId: number) => {
    if (confirm('Seasonni o\'chirishni xohlaysizmi? Bu amal qaytarilmaydi.')) {
      deleteMutation.mutate(seasonId);
    }
  };

  const getActionMenu = (season: Season) => {
    const canActivate = season.status === 'upcoming';
    const canPause = season.status === 'active';
    const canComplete = season.status === 'active';
    const canCancel = ['upcoming', 'active'].includes(season.status);

    return (
      <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
        <Link
          to={`/seasons/${season.id}`}
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Ma'lumotlarni tahrirlash
        </Link>
        
        <Link
          to={`/seasons/${season.id}/rewards`}
          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Gift className="w-4 h-4 mr-2" />
          Rewards boshqarish
        </Link>

        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

        {canActivate && (
          <button
            onClick={() => handleStatusChange(season.id, 'active')}
            className="flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            <Play className="w-4 h-4 mr-2" />
            Faollashtirish
          </button>
        )}

        {canPause && (
          <button
            onClick={() => handleStatusChange(season.id, 'upcoming')}
            className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
          >
            <Pause className="w-4 h-4 mr-2" />
            To'xtatish
          </button>
        )}

        {canComplete && (
          <button
            onClick={() => handleStatusChange(season.id, 'completed')}
            className="flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Yakunlash
          </button>
        )}

        {canCancel && (
          <button
            onClick={() => handleStatusChange(season.id, 'cancelled')}
            className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Bekor qilish
          </button>
        )}

        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

        <button
          onClick={() => handleDelete(season.id)}
          className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          O'chirish
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            Mavsumlar va rewards tizimini boshqaring
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Jami Seasons', value: seasons.length, icon: Trophy, color: 'blue' },
          { label: 'Faol', value: seasons.filter(s => s.status === 'active').length, icon: Play, color: 'green' },
          { label: 'Rejalashtirilgan', value: seasons.filter(s => s.status === 'upcoming').length, icon: Clock, color: 'yellow' },
          { label: 'Yakunlangan', value: seasons.filter(s => s.status === 'completed').length, icon: CheckCircle, color: 'gray' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
            green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300',
            yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300',
            gray: 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
          };

          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Season
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Holat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ishtirokchilar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Yaratilgan
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amallar
                </th>
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
                        </div>
                        {season.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {season.description}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(season.status)}
                    </td>
                    
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
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(season.created_at)}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/seasons/${season.id}/rewards`}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Rewards boshqarish"
                        >
                          <Gift className="h-4 w-4" />
                        </Link>
                        
                        <Link
                          to={`/seasons/${season.id}`}
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                          title="Tahrirlash"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(showDropdown === season.id ? null : season.id);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Ko'proq amallar"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          
                          {showDropdown === season.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowDropdown(null)}
                              />
                              {getActionMenu(season)}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {seasons.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Seasons topilmadi
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Yangi season yarating
              </p>
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
    </div>
  );
};

export default SeasonsPage;