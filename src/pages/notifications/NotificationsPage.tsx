import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Bell, BarChart3, Send, Clock, Check } from 'lucide-react';
import { notificationsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  target: 'all' | 'specific' | 'region';
  status: 'draft' | 'sent' | 'scheduled';
  sent_at?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  recipient_count?: number;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Notification | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const limit = 20;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['admin-notifications', page, search, statusFilter],
    queryFn: () => notificationsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      status: statusFilter || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['notifications-stats'],
    queryFn: () => notificationsApi.getStats().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: notificationsApi.create,
    onSuccess: () => {
      toast.success('Notification created successfully');
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('Failed to create notification'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => notificationsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Notification updated successfully');
      setEditModal(false);
      setSelected(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('Failed to update notification'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => {
      toast.success('Notification deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('Failed to delete notification'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.send(id),
    onSuccess: () => {
      toast.success('Notification sent successfully');
      setSendModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
    onError: () => toast.error('Failed to send notification'),
  });

  const notifications: Notification[] = Array.isArray((notificationsData as any)?.data) ? (notificationsData as any).data : [];
  const total: number = (notificationsData as any)?.total ?? 0;
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'gray';
      case 'sent': return 'green';
      case 'scheduled': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'sent': return <Check className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'blue';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'gray';
    }
  };

  const openEditModal = (notification?: Notification) => {
    setSelected(notification || null);
    if (notification) {
      setValue('title', notification.title);
      setValue('message', notification.message);
      setValue('type', notification.type);
      setValue('target', notification.target);
      setValue('scheduled_at', notification.scheduled_at);
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
          Notifications <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Create Notification
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyState message="No notifications found" />
        ) : (
          <>
            <Table headers={['Notification', 'Type', 'Target', 'Status', 'Recipients', 'Created', '']}>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bell className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{notification.message}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={getTypeColor(notification.type)}>
                      {notification.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="purple">{notification.target}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(notification.status)}
                      <Badge color={getStatusColor(notification.status)}>
                        {notification.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{notification.recipient_count || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(notification.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {notification.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="primary" 
                          onClick={() => { setSelected(notification); setSendModal(true); }}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEditModal(notification)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(notification); setDeleteModal(true); }}
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
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? 'Edit Notification' : 'Create Notification'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input 
              {...register('title', { required: 'Title is required' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{String(errors.title.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea 
              {...register('message', { required: 'Message is required' })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{String(errors.message.message)}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select 
                {...register('type', { required: 'Type is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Type</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{String(errors.type.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target</label>
              <select 
                {...register('target', { required: 'Target is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Target</option>
                <option value="all">All Users</option>
                <option value="specific">Specific Users</option>
                <option value="region">By Region</option>
              </select>
              {errors.target && <p className="text-red-500 text-xs mt-1">{String(errors.target.message)}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Schedule (Optional)</label>
            <input 
              type="datetime-local"
              {...register('scheduled_at')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Modal */}
      <Modal open={sendModal} onClose={() => setSendModal(false)} title="Send Notification">
        <div className="space-y-4">
          <p>Are you sure you want to send this notification?</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.title}</p>
              <p className="text-sm text-gray-500">{selected.message}</p>
              <p className="text-sm text-gray-500 mt-2">Target: {selected.target}</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setSendModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => selected && sendMutation.mutate(selected.id)}
              loading={sendMutation.isPending}
            >
              Send Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Notification">
        <div className="space-y-4">
          <p>Are you sure you want to delete this notification? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.title}</p>
              <p className="text-sm text-gray-500">{selected.message}</p>
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
