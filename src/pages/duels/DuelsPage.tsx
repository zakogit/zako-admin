import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Trash2, Swords, BarChart3, Trophy, Clock } from 'lucide-react';
import { duelsApi, subjectsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, formatDuration } from '../../utils/helpers';
import type { Duel, Subject } from '../../types';
import toast from 'react-hot-toast';

export default function DuelsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [selected, setSelected] = useState<Duel | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: duelsData, isLoading } = useQuery({
    queryKey: ['admin-duels', page, search, statusFilter, subjectFilter],
    queryFn: () => duelsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      status: statusFilter || undefined,
      subject_id: subjectFilter ? Number(subjectFilter) : undefined
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => duelsApi.delete(id),
    onSuccess: () => {
      toast.success('Duel deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-duels'] });
    },
    onError: () => toast.error('Failed to delete duel'),
  });

  const duels: Duel[] = Array.isArray((duelsData as any)?.data) ? (duelsData as any).data : [];
  const total: number = (duelsData as any)?.total ?? 0;
  const subjects: Subject[] = Array.isArray((subjectsData as any)?.data) ? (subjectsData as any).data : [];
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'yellow';
      case 'active': return 'blue';
      case 'finished': return 'green';
      case 'cancelled': return 'red';
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
          Duels <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="active">Active</option>
            <option value="finished">Finished</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select 
            value={subjectFilter} 
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search duels..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : duels.length === 0 ? (
          <EmptyState message="No duels found" />
        ) : (
          <>
            <Table headers={['Players', 'Subject', 'Status', 'Score', 'Duration', 'Created', '']}>
              {duels.map((duel) => (
                <tr key={duel.id}>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{duel.player1_username}</span>
                        {duel.is_bot_game && <Badge color="orange" size="sm">vs Bot</Badge>}
                      </div>
                      {duel.player2_username && !duel.is_bot_game && (
                        <div className="text-sm text-gray-500">vs {duel.player2_username}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{duel.subject_name}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(duel.status)}
                      <Badge color={getStatusColor(duel.status)}>
                        {duel.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {duel.status === 'finished' ? (
                      <div className="text-sm">
                        <div className="font-medium">{duel.p1_score} - {duel.p2_score}</div>
                        {duel.winner_username && (
                          <div className="text-green-600 text-xs">Winner: {duel.winner_username}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
                      <Button size="sm" variant="outline" onClick={() => { setSelected(duel); setViewModal(true); }}>
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

      {/* View Modal */}
      <Modal open={viewModal} onClose={() => { setViewModal(false); setSelected(null); }} title="Duel Details">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duel ID</label>
                <p className="text-sm">{selected.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <Badge color={getStatusColor(selected.status)}>{selected.status}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Player 1</label>
                <p className="text-sm">{selected.player1_username}</p>
                {selected.status === 'finished' && <p className="text-xs text-gray-500">Score: {selected.p1_score}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selected.is_bot_game ? 'Bot' : 'Player 2'}
                </label>
                <p className="text-sm">{selected.is_bot_game ? 'Bot Player' : selected.player2_username || 'Waiting...'}</p>
                {selected.status === 'finished' && <p className="text-xs text-gray-500">Score: {selected.p2_score}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
              <p className="text-sm">{selected.subject_name}</p>
            </div>

            {selected.winner_username && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Winner</label>
                <p className="text-sm font-medium text-green-600">{selected.winner_username}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                <p className="text-sm">{formatDate(selected.created_at)}</p>
              </div>
              {selected.finished_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Finished</label>
                  <p className="text-sm">{formatDate(selected.finished_at)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Duel">
        <div className="space-y-4">
          <p>Are you sure you want to delete this duel? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">Duel #{selected.id}</p>
              <p className="text-sm text-gray-500">
                {selected.player1_username} vs {selected.is_bot_game ? 'Bot' : selected.player2_username || 'Waiting'}
              </p>
              <p className="text-sm text-gray-500">{selected.subject_name} • {selected.status}</p>
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
