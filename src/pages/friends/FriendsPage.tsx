import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Trash2, Users, BarChart3, UserPlus, UserMinus, Clock } from 'lucide-react';
import { friendsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { Friendship } from '../../types';
import toast from 'react-hot-toast';

export default function FriendsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Friendship | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['admin-friends', page, search, statusFilter],
    queryFn: () => friendsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      status: statusFilter || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['friends-stats'],
    queryFn: () => friendsApi.getStats().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => friendsApi.delete(id),
    onSuccess: () => {
      toast.success('Friendship deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-friends'] });
    },
    onError: () => toast.error('Failed to delete friendship'),
  });

  const friends: Friendship[] = Array.isArray((friendsData as any)?.data) ? (friendsData as any).data : [];
  const total: number = (friendsData as any)?.total ?? 0;
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'accepted': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <UserPlus className="w-4 h-4" />;
      case 'rejected': return <UserMinus className="w-4 h-4" />;
      default: return null;
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
          Friendships <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search friendships..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : friends.length === 0 ? (
          <EmptyState message="No friendships found" />
        ) : (
          <>
            <Table headers={['Users', 'Status', 'Created', 'Updated', '']}>
              {friends.map((friendship) => (
                <tr key={friendship.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="font-medium">{friendship.requester_username}</div>
                        <div className="text-sm text-gray-500">→ {friendship.addressee_username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(friendship.status)}
                      <Badge color={getStatusColor(friendship.status)}>
                        {friendship.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(friendship.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(friendship.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelected(friendship); setViewModal(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(friendship); setDeleteModal(true); }}
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

      {/* View Modal */}
      <Modal open={viewModal} onClose={() => { setViewModal(false); setSelected(null); }} title="Friendship Details">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Friendship ID</label>
                <p className="text-sm">{selected.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <Badge color={getStatusColor(selected.status)}>{selected.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Requester</label>
                <p className="text-sm">{selected.requester_username}</p>
                <p className="text-xs text-gray-500">ID: {selected.requester_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Addressee</label>
                <p className="text-sm">{selected.addressee_username}</p>
                <p className="text-xs text-gray-500">ID: {selected.addressee_id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                <p className="text-sm">{formatDate(selected.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Updated</label>
                <p className="text-sm">{formatDate(selected.updated_at)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Friendship">
        <div className="space-y-4">
          <p>Are you sure you want to delete this friendship? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">Friendship #{selected.id}</p>
              <p className="text-sm text-gray-500">
                {selected.requester_username} → {selected.addressee_username}
              </p>
              <p className="text-sm text-gray-500">Status: {selected.status}</p>
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
