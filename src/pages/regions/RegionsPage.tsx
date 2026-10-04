import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, MapPin, BarChart3, Users, Swords } from 'lucide-react';
import { regionsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';
import type { Region } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export default function RegionsPage() {
  const { t } = useTranslation('regions');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Region | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: regionsData, isLoading } = useQuery({
    queryKey: ['admin-regions', page, search],
    queryFn: () => regionsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['regions-stats'],
    queryFn: () => regionsApi.getStats().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: regionsApi.create,
    onSuccess: () => {
      toast.success(t('toast.created'));
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-regions'] });
    },
    onError: () => toast.error(t('toast.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => regionsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success(t('toast.updated'));
      setEditModal(false);
      setSelected(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-regions'] });
    },
    onError: () => toast.error(t('toast.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => regionsApi.delete(id),
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-regions'] });
    },
    onError: () => toast.error(t('toast.deleteFailed')),
  });

  const regions: Region[] = Array.isArray((regionsData as any)?.data?.data) ? (regionsData as any).data.data : [];
  const total: number = (regionsData as any)?.data?.total ?? 0;
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  // The stats endpoint returns English labels — translate the known ones, fall back to the raw text.
  const statLabel = (label: string): string => {
    switch (label) {
      case 'Total Regions': return t('stats.totalRegions');
      case 'Total Users': return t('stats.totalUsers');
      case 'Average Rating': return t('stats.averageRating');
      case 'Total Duels': return t('stats.totalDuels');
      default: return label;
    }
  };

  const openEditModal = (region?: Region) => {
    setSelected(region || null);
    if (region) {
      setValue('name', region.name);
    } else {
      reset();
    }
    setEditModal(true);
  };

  const onSubmit = (data: any) => {
    if (selected) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{statLabel(stat.label)}</p>
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
          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            {t('addRegion')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : regions.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <Table headers={[t('common:table.region'), t('table.users'), t('table.avgRating'), t('table.duels'), t('common:table.created'), t('common:table.updated'), '']}>
              {regions.map((region) => (
                <tr key={region.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="font-medium">{region.name}</div>
                        <div className="text-sm text-gray-500">ID: {region.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{formatNumber(region.user_count || 0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {region.avg_rating && typeof region.avg_rating === 'number' ? (
                      <Badge color="purple">{region.avg_rating.toFixed(1)}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">{formatNumber(region.duel_count || 0)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(region.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(region.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(region)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(region); setDeleteModal(true); }}
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

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? t('modal.editTitle') : t('modal.createTitle')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('form.name')}</label>
            <input
              {...register('name', { required: true })}
              placeholder={t('form.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{t('validation.nameRequired')}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? t('common:actions.update') : t('common:actions.create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title={t('modal.deleteTitle')}>
        <div className="space-y-4">
          <p>{t('confirm.delete')}</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-gray-500">
                {t('count.users', { count: selected.user_count || 0 })} • {t('count.duels', { count: selected.duel_count || 0 })}
              </p>
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
