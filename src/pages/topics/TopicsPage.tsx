import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, BookOpen, BarChart3 } from 'lucide-react';
import { topicsApi, subjectsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { Topic, Subject } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function TopicsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [selected, setSelected] = useState<Topic | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: topicsData, isLoading } = useQuery({
    queryKey: ['admin-topics', page, search, subjectFilter],
    queryFn: () => topicsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      subject_id: subjectFilter ? Number(subjectFilter) : undefined
    }).then(r => r.data),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsApi.getAllForDropdown().then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['topics-stats'],
    queryFn: () => topicsApi.getStats().then(r => r.data),
  });

  const topicForm = useForm<any>();

  const createMutation = useMutation({
    mutationFn: topicsApi.create,
    onSuccess: () => {
      toast.success('Topic created successfully');
      setEditModal(false);
      topicForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-topics'] });
    },
    onError: () => toast.error('Failed to create topic'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => topicsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Topic updated successfully');
      setEditModal(false);
      setSelected(null);
      topicForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-topics'] });
    },
    onError: () => toast.error('Failed to update topic'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      toast.success('Topic deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-topics'] });
    },
    onError: () => toast.error('Failed to delete topic'),
  });

  // Parse topics data with proper structure handling
  const rawTopicsData = (topicsData as any)?.data;
  const topicsArray = rawTopicsData?.data || [];
  const topics: Topic[] = Array.isArray(topicsArray) ? topicsArray.map((topic: any) => ({
    ...topic,
    id: Number(topic.id),
    subject_id: Number(topic.subject_id),
    order_index: Number(topic.order_index || 0),
    question_count: Number(topic.question_count || 0)
  })) : [];
  
  const total: number = rawTopicsData?.total ?? 0;
  const subjects: Subject[] = Array.isArray((subjectsData as any)?.data) ? (subjectsData as any).data : [];
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const openEditModal = (topic?: Topic) => {
    setSelected(topic || null);
    if (topic) {
      topicForm.setValue('name', topic.name);
      topicForm.setValue('description', topic.description);
      topicForm.setValue('subject_id', topic.subject_id);
      topicForm.setValue('order_index', topic.order_index);
      topicForm.setValue('is_active', topic.is_active);
    } else {
      topicForm.reset();
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
          Topics <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={subjectFilter} 
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-40"
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
              placeholder="Search topics..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Topic
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : topics.length === 0 ? (
          <EmptyState message="No topics found" />
        ) : (
          <>
            <Table headers={['Topic', 'Subject', 'Questions', 'Order', 'Status', 'Created', '']}>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-8 h-8 text-blue-500" />
                      <div>
                        <div className="font-medium">{topic.name}</div>
                        {topic.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{topic.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="purple">{topic.subject_name}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{topic.question_count || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{topic.order_index}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={topic.is_active ? 'green' : 'red'}>
                      {topic.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(topic.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(topic)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(topic); setDeleteModal(true); }}
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
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? 'Edit Topic' : 'Create Topic'}>
        <form onSubmit={topicForm.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Topic Name</label>
              <input 
                {...topicForm.register('name', { required: 'Topic name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {topicForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{String(topicForm.formState.errors.name.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select 
                {...topicForm.register('subject_id', { required: 'Subject is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {topicForm.formState.errors.subject_id && <p className="text-red-500 text-xs mt-1">{String(topicForm.formState.errors.subject_id.message)}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea 
              {...topicForm.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Order Index</label>
              <input 
                type="number"
                {...topicForm.register('order_index', { required: 'Order index is required', min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {topicForm.formState.errors.order_index && <p className="text-red-500 text-xs mt-1">{String(topicForm.formState.errors.order_index.message)}</p>}
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  {...topicForm.register('is_active')}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
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

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Topic">
        <div className="space-y-4">
          <p>Are you sure you want to delete this topic? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-gray-500">{selected.subject_name} • {selected.question_count || 0} questions</p>
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
