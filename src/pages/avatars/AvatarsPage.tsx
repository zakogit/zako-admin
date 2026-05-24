import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, User, BarChart3 } from 'lucide-react';
import { avatarsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, getStaticFileUrl } from '../../utils/helpers';
import type { Avatar } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function AvatarsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState('');
  const [premiumFilter, setPremiumFilter] = useState('');
  const [selected, setSelected] = useState<Avatar | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: avatarsData, isLoading } = useQuery({
    queryKey: ['admin-avatars', page, genderFilter, premiumFilter],
    queryFn: () => avatarsApi.getAll({ 
      page, 
      limit, 
      gender: genderFilter || undefined,
      is_premium: premiumFilter || undefined
    }).then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['avatars-summary'],
    queryFn: () => avatarsApi.getSummary().then(r => r.data),
  });


  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: avatarsApi.add,
    onSuccess: () => {
      toast.success('Avatar added successfully');
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-avatars'] });
    },
    onError: () => toast.error('Failed to add avatar'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => avatarsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Avatar updated successfully');
      setEditModal(false);
      setSelected(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-avatars'] });
    },
    onError: () => toast.error('Failed to update avatar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => avatarsApi.delete(id),
    onSuccess: () => {
      toast.success('Avatar deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-avatars'] });
    },
    onError: () => toast.error('Failed to delete avatar'),
  });

  const avatars: Avatar[] = Array.isArray((avatarsData as any)?.data?.data) ? (avatarsData as any).data.data : [];
  const total: number = (avatarsData as any)?.data?.total ?? 0;
  const summary = (summaryData as any)?.data ?? {};

  const openEditModal = (avatar?: Avatar) => {
    setSelected(avatar || null);
    if (avatar) {
      setValue('url', avatar.url);
      setValue('gender', avatar.gender);
      setValue('is_premium', avatar.is_premium);
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
      {/* Summary Stats */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Avatars</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total || 0}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Premium</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.premium || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Male</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.male || 0}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Female</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.female || 0}</p>
              </div>
              <User className="w-8 h-8 text-pink-500" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Avatars <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={genderFilter} 
            onChange={e => setGenderFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="both">Both</option>
          </select>

          <select 
            value={premiumFilter} 
            onChange={e => setPremiumFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="true">Premium</option>
            <option value="false">Free</option>
          </select>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Avatar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : avatars.length === 0 ? (
          <EmptyState message="No avatars found" />
        ) : (
          <>
            <Table headers={['Preview', 'URL', 'Gender', 'Type', 'Usage', 'Created', '']}>
              {avatars.map((avatar) => (
                <tr key={avatar.id}>
                  <td className="px-4 py-3">
                    <img src={getStaticFileUrl(avatar.url)} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate" title={avatar.url}>
                      {avatar.url}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={
                      avatar.gender === 'male' ? 'blue' : 
                      avatar.gender === 'female' ? 'pink' : 'purple'
                    }>
                      {avatar.gender}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={avatar.is_premium ? 'yellow' : 'green'}>
                      {avatar.is_premium ? 'Premium' : 'Free'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{avatar.usage_count || 0} users</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {avatar.created_at ? formatDate(avatar.created_at) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(avatar)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(avatar); setDeleteModal(true); }}
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
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? 'Edit Avatar' : 'Add Avatar'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Avatar URL</label>
            <input 
              {...register('url', { required: 'Avatar URL is required' })}
              placeholder="/uploads/avatars/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.url && <p className="text-red-500 text-xs mt-1">{String(errors.url.message)}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select 
                {...register('gender', { required: 'Gender is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="both">Both</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{String(errors.gender.message)}</p>}
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  {...register('is_premium')}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium">Premium Avatar</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Avatar">
        <div className="space-y-4">
          <p>Are you sure you want to delete this avatar? This action cannot be undone.</p>
          {selected && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <img src={getStaticFileUrl(selected.url)} alt="Avatar" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <p className="text-sm truncate">{selected.url}</p>
                <p className="text-xs text-gray-500">{selected.gender} • {selected.is_premium ? 'Premium' : 'Free'}</p>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}