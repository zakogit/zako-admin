import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, BarChart3, FileJson } from 'lucide-react';
import { questionsApi, subjectsApi, topicsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { Question, Subject, Topic } from '../../types';
import toast from 'react-hot-toast';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import ImportQuestionsModal from './ImportQuestionsModal';

export default function QuestionsPage() {
  const { t } = useTranslation('questions');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [selected, setSelected] = useState<Question | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const limit = 20;

  const { data: questionsData, isLoading } = useQuery({
    queryKey: ['admin-questions', page, search, subjectFilter, topicFilter],
    queryFn: () => questionsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      subject_id: subjectFilter ? Number(subjectFilter) : undefined,
      topic_id: topicFilter ? Number(topicFilter) : undefined
    }).then(r => r.data),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-dropdown'],
    queryFn: () => subjectsApi.getAllForDropdown().then(r => r.data),
  });

  const { data: topicsData } = useQuery({
    queryKey: ['topics-by-subject', subjectFilter],
    queryFn: async () => {
      if (!subjectFilter || subjectFilter === '') return { data: { success: true, data: [] } };
      const result = await topicsApi.getBySubject(Number(subjectFilter));
      return result;
    },
    enabled: !!(subjectFilter && subjectFilter !== ''),
  });

  const { data: formTopicsData } = useQuery({
    queryKey: ['form-topics-by-subject', formSubjectId],
    queryFn: async () => {
      if (!formSubjectId) return { data: { success: true, data: [] } };
      const result = await topicsApi.getBySubject(Number(formSubjectId));
      return result;
    },
    enabled: !!formSubjectId,
  });

  const { data: statsData } = useQuery({
    queryKey: ['questions-stats'],
    queryFn: () => questionsApi.getStats().then(r => r.data),
  });

  const questionForm = useForm<any>({
    defaultValues: {
      options: ['', '', '', '']
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: questionForm.control,
    name: 'options'
  });

  const watchedSubjectId = useWatch({
    control: questionForm.control,
    name: 'subject_id'
  });

  useEffect(() => {
    if (watchedSubjectId) {
      setFormSubjectId(String(watchedSubjectId));
      // Clear topic when subject changes
      questionForm.setValue('topic_id', '');
    }
  }, [watchedSubjectId, questionForm]);

  const createMutation = useMutation({
    mutationFn: questionsApi.create,
    onSuccess: () => {
      toast.success(t('toast.created'));
      setEditModal(false);
      questionForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: () => toast.error(t('toast.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => questionsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success(t('toast.updated'));
      setEditModal(false);
      setSelected(null);
      questionForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: () => toast.error(t('toast.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => questionsApi.delete(id),
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: () => toast.error(t('toast.deleteFailed')),
  });

  const questions: Question[] = Array.isArray((questionsData as any)?.data?.data) ? (questionsData as any).data.data : [];
  const total: number = (questionsData as any)?.data?.total ?? 0;
  const subjects: Subject[] = Array.isArray((subjectsData as any)?.data) ? (subjectsData as any).data : [];
  // Parse topics with proper type conversion
  const rawTopics = (topicsData as any)?.data?.data;
  const topicsArray = rawTopics?.data || rawTopics; // Handle both structures
  const topics: Topic[] = Array.isArray(topicsArray) ? topicsArray.map((topic: any) => ({
    ...topic,
    id: Number(topic.id),
    subject_id: Number(topic.subject_id),
    order_index: Number(topic.order_index)
  })) : [];

  const rawFormTopics = (formTopicsData as any)?.data?.data;  
  const formTopicsArray = rawFormTopics?.data || rawFormTopics;
  const formTopics: Topic[] = Array.isArray(formTopicsArray) ? formTopicsArray.map((topic: any) => ({
    ...topic,
    id: Number(topic.id),
    subject_id: Number(topic.subject_id), 
    order_index: Number(topic.order_index)
  })) : [];

  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  // The stats endpoint returns fixed English labels; map the known ones, show anything else as received
  const statLabel = (label: string) => {
    switch (label) {
      case 'Total Questions': return t('stats.total');
      case 'Easy Questions': return t('stats.easy');
      case 'Medium Questions': return t('stats.medium');
      case 'Hard Questions': return t('stats.hard');
      default: return label;
    }
  };



  const openEditModal = (question?: Question) => {
    setSelected(question || null);
    if (question) {
      questionForm.setValue('question_text', question.question_text);
      questionForm.setValue('topic_id', question.topic_id);
      questionForm.setValue('subject_id', question.subject_id);
      questionForm.setValue('difficulty', question.difficulty);
      questionForm.setValue('correct_answer', question.correct_answer);
      questionForm.setValue('explanation', question.explanation || '');
      questionForm.setValue('options', question.options || ['', '', '', '']);
      setFormSubjectId(String(question.subject_id));
    } else {
      questionForm.reset();
      questionForm.setValue('options', ['', '', '', '']);
      setFormSubjectId('');
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
          {/* Filters */}
          <select 
            value={subjectFilter} 
            onChange={e => {
              setSubjectFilter(e.target.value);
              setTopicFilter(''); // Topic filterni tozala
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-40"
          >
            <option value="">{t('filters.allSubjects')}</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>

          <select 
            value={topicFilter} 
            onChange={e => setTopicFilter(e.target.value)}
            disabled={!subjectFilter}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-40"
          >
            <option value="">{t('filters.allTopics')}</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button variant="outline" onClick={() => setImportModal(true)} className="whitespace-nowrap">
            <FileJson className="w-4 h-4 mr-2" />
            {t('import.button')}
          </Button>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            {t('actions.add')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : questions.length === 0 ? (
          <EmptyState message={t('empty.list')} />
        ) : (
          <>
            <Table headers={[t('table.question'), t('common:table.subject'), t('common:table.topic'), t('common:table.difficulty'), t('common:table.created'), '']}>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate" title={question.question_text}>
                      {question.question_text}
                    </div>
                  </td>
                  <td className="px-4 py-3">{question.subject_name}</td>
                  <td className="px-4 py-3">{question.topic_name}</td>
                  <td className="px-4 py-3">
                    <Badge color={
                      question.difficulty === 'easy' ? 'green' : 
                      question.difficulty === 'medium' ? 'yellow' : 'red'
                    }>
                      {t(`difficulty.${question.difficulty}`, { defaultValue: question.difficulty })}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(question.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(question)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(question); setDeleteModal(true); }}
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

      {/* JSON import */}
      <ImportQuestionsModal
        open={importModal}
        onClose={() => setImportModal(false)}
        onImported={() => {
          qc.invalidateQueries({ queryKey: ['admin-questions'] });
          qc.invalidateQueries({ queryKey: ['questions-stats'] });
        }}
      />

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? t('modal.edit') : t('modal.create')}>
        <form onSubmit={questionForm.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('form.questionText')}</label>
            <textarea 
              {...questionForm.register('question_text', { required: t('validation.questionText') })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {questionForm.formState.errors.question_text && <p className="text-red-500 text-xs mt-1">{String(questionForm.formState.errors.question_text.message)}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('common:table.subject')}</label>
              <select 
                {...questionForm.register('subject_id', { required: t('validation.subject') })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('form.selectSubject')}</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
              {questionForm.formState.errors.subject_id && <p className="text-red-500 text-xs mt-1">{String(questionForm.formState.errors.subject_id.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('common:table.topic')}</label>
              <select 
                {...questionForm.register('topic_id', { required: t('validation.topic') })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                disabled={!formSubjectId}
              >
                <option value="">{t('form.selectTopic')}</option>
                {formTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
              {questionForm.formState.errors.topic_id && <p className="text-red-500 text-xs mt-1">{String(questionForm.formState.errors.topic_id.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('common:table.difficulty')}</label>
              <select 
                {...questionForm.register('difficulty', { required: t('validation.difficulty') })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">{t('form.selectDifficulty')}</option>
                <option value="easy">{t('difficulty.easy')}</option>
                <option value="medium">{t('difficulty.medium')}</option>
                <option value="hard">{t('difficulty.hard')}</option>
              </select>
              {questionForm.formState.errors.difficulty && <p className="text-red-500 text-xs mt-1">{String(questionForm.formState.errors.difficulty.message)}</p>}
            </div>
          </div>

          {/* Answer Options */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('form.answerOptions')}</label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...questionForm.register(`options.${index}`, { required: t('validation.option') })}
                    placeholder={t('form.optionPlaceholder', { number: index + 1 })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                  {fields.length > 2 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
                      {t('form.removeOption')}
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append('')}>
                {t('form.addOption')}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('form.correctAnswer')}</label>
            <input
              {...questionForm.register('correct_answer', { required: t('validation.correctAnswer') })}
              placeholder={t('form.correctAnswerPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {questionForm.formState.errors.correct_answer && <p className="text-red-500 text-xs mt-1">{String(questionForm.formState.errors.correct_answer.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('form.explanation')}</label>
            <textarea
              {...questionForm.register('explanation')}
              rows={2}
              placeholder={t('form.explanationPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
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
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title={t('modal.delete')}>
        <div className="space-y-4">
          <p>{t('confirm.delete')}</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-sm truncate">{selected.question_text}</p>
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