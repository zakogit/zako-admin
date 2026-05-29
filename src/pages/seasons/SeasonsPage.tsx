import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { seasonsApi } from '../../api/services';
import type { Season } from '../../types';

const SeasonsPage: React.FC = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const response = await seasonsApi.getAll({ 
        status: statusFilter || undefined,
        limit: 100
      });
      setSeasons(response.data.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Mavsumlar yuklanmadi';
      setError(errorMessage);
      console.error('Error fetching seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, [statusFilter]);

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
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleStatusChange = async (seasonId: number, newStatus: Season['status']) => {
    try {
      await seasonsApi.updateStatus(seasonId, newStatus);
      await fetchSeasons(); // Refresh data
    } catch (err) {
      console.error('Error updating season status:', err);
      alert('Holat o\'zgartirishda xatolik yuz berdi');
    }
  };

  const handleDelete = async (seasonId: number) => {
    if (!confirm('Bu mavsumni o\'chirmoqchimisiz? Bu amal qaytarilmaydi.')) {
      return;
    }

    try {
      await seasonsApi.delete(seasonId);
      await fetchSeasons(); // Refresh data
    } catch (err) {
      console.error('Error deleting season:', err);
      alert('Mavsumni o\'chirishda xatolik yuz berdi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mavsumlar</h1>
          <p className="text-gray-600">Mavsum va badge tizimini boshqaring</p>
        </div>
        <Link
          to="/seasons/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yangi Mavsum
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Barcha holatlar</option>
            <option value="upcoming">Rejalashtirilgan</option>
            <option value="active">Faol</option>
            <option value="completed">Yakunlangan</option>
            <option value="cancelled">Bekor qilingan</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Seasons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seasons.map((season) => (
          <div key={season.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Banner Image */}
            {season.banner_image && (
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
                <img
                  src={season.banner_image}
                  alt={season.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="p-4">
              {/* Status Badge */}
              <div className="mb-3">
                {getStatusBadge(season.status)}
              </div>

              {/* Title and Description */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {season.title}
              </h3>
              {season.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {season.description}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Qatnashuvchilar:</span>
                  <p className="font-semibold">{season.total_participants}</p>
                </div>
                <div>
                  <span className="text-gray-500">Maksimal:</span>
                  <p className="font-semibold">{season.max_participants || 'Cheksiz'}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 mb-4">
                <div>Boshlanish: {new Date(season.start_date).toLocaleDateString('uz-UZ')}</div>
                <div>Tugash: {new Date(season.end_date).toLocaleDateString('uz-UZ')}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/seasons/${season.id}`}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors text-center"
                >
                  Ko'rish
                </Link>
                
                {season.status === 'upcoming' && (
                  <button
                    onClick={() => handleStatusChange(season.id, 'active')}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                  >
                    Faollashtirrish
                  </button>
                )}
                
                {season.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange(season.id, 'completed')}
                    className="flex-1 bg-orange-50 text-orange-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                  >
                    Yakunlash
                  </button>
                )}

                {(season.status === 'upcoming' || season.status === 'cancelled') && (
                  <button
                    onClick={() => handleDelete(season.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="O'chirish"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {seasons.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Hech qanday mavsum yo'q</h3>
          <p className="text-gray-500 mb-4">Birinchi mavsumingizni yarating</p>
          <Link
            to="/seasons/create"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Yangi Mavsum Yaratish
          </Link>
        </div>
      )}
    </div>
  );
};

export default SeasonsPage;