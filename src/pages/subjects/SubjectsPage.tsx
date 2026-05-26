import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, BookOpen, BarChart3 } from 'lucide-react';
import { subjectsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, getStaticFileUrl } from '../../utils/helpers';
import type { Subject } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Subject | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => subjectsApi.getAll({}).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['subjects-stats'],
    queryFn: () => subjectsApi.getStats().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => {
      toast.success('Subject created successfully');
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-subjects'] });
    },
    onError: () => toast.error('Failed to create subject'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => subjectsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Subject updated successfully');
      setEditModal(false);
      setSelected(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-subjects'] });
    },
    onError: () => toast.error('Failed to update subject'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => subjectsApi.delete(id),
    onSuccess: () => {
      toast.success('Subject deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-subjects'] });
    },
    onError: () => toast.error('Failed to delete subject'),
  });

  // Filter subjects by search and paginate on frontend
  let allSubjects: Subject[] = Array.isArray((subjectsData as any)?.data) ? (subjectsData as any).data : [];
  
  // Apply search filter
  if (search) {
    allSubjects = allSubjects.filter(subject => 
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.slug.toLowerCase().includes(search.toLowerCase()) ||
      (subject.description && subject.description.toLowerCase().includes(search.toLowerCase()))
    );
  }
  
  // Apply pagination
  const total = allSubjects.length;
  const startIndex = (page - 1) * limit;
  const subjects = allSubjects.slice(startIndex, startIndex + limit);
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const openEditModal = (subject?: Subject) => {
    setSelected(subject || null);
    if (subject) {
      setValue('name', subject.name);
      setValue('slug', subject.slug);
      setValue('description', subject.description);
      setValue('is_active', subject.is_active);
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
          Subjects <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search subjects..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : subjects.length === 0 ? (
          <EmptyState message="No subjects found" />
        ) : (
          <>
            <Table headers={['Subject', 'Slug', 'Topics', 'Questions', 'Status', 'Created', '']}>
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {subject.icon ? (
                        <img 
                          src={getStaticFileUrl(subject.icon)} 
                          alt={subject.name} 
                          className="w-8 h-8 rounded object-cover" 
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer-when-downgrade" 
                        />
                      ) : (
                        <BookOpen className="w-8 h-8 text-primary-500" />
                      )}
                      <div>
                        <div className="font-medium">{subject.name}</div>
                        {subject.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{subject.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{subject.slug}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{subject.topic_count || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{subject.question_count || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={subject.is_active ? 'green' : 'red'}>
                      {subject.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(subject.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(subject)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(subject); setDeleteModal(true); }}
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
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? 'Edit Subject' : 'Create Subject'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Name</label>
              <input 
                {...register('name', { required: 'Subject name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{String(errors.name.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <input 
                {...register('slug', { required: 'Slug is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.slug && <p className="text-red-500 text-xs mt-1">{String(errors.slug.message)}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea 
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
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
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Subject">
        <div className="space-y-4">
          <p>Are you sure you want to delete this subject? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-gray-500">{selected.topic_count || 0} topics • {selected.question_count || 0} questions</p>
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
