import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import {
  Crown,
  Users,
  TrendingUp,
  UserCheck,
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CalendarPlus,
  RefreshCw,
  Ban,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi, usersApi } from '../../api/services';
import type { User } from '../../types';
import { Modal, Button, Card, StatCard, Badge, Table, EmptyState, Input, Select, Pagination } from '../../components/ui';
import { getIntlLocale } from '../../i18n';

interface PremiumSubscription {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  phone: string;
  plan_type: 'monthly' | 'yearly';
  price_som: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  auto_renew: boolean;
  created_at: string;
}

const SubscriptionsPage: React.FC = () => {
  const { t } = useTranslation('subscriptions');
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [grantModal, setGrantModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsSub, setDetailsSub] = useState<PremiumSubscription | null>(null);
  const [extendSub, setExtendSub] = useState<PremiumSubscription | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [cancelSub, setCancelSub] = useState<PremiumSubscription | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [grantForm, setGrantForm] = useState<{
    user_id: string;
    plan_type: 'monthly' | 'yearly';
    duration_days: number;
  }>({ user_id: '', plan_type: 'monthly', duration_days: 30 });

  const LIMIT = 20;

  // Filtr o'zgarganda 1-sahifaga qaytish
  const applyFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['subscriptions', statusFilter, planFilter, searchTerm, page],
    queryFn: async () => {
      const params: any = { page, limit: LIMIT };
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan_type = planFilter;
      if (searchTerm) params.search = searchTerm;
      const response = await subscriptionsApi.getAll(params);
      return response.data;
    },
  });

  const subscriptions: PremiumSubscription[] = subscriptionsData?.data?.subscriptions || [];
  const pagination = (subscriptionsData?.data as any)?.pagination as
    | { current_page: number; per_page: number; total: number; total_pages: number }
    | undefined;

  const { data: statsData } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const response = await subscriptionsApi.getStats();
      return response.data;
    },
  });

  const stats = statsData?.data;

  // Manual grant uchun foydalanuvchi qidiruvi (kamida 2 belgi, tanlangunча)
  const userSearchQ = useQuery({
    queryKey: ['user-search', userSearch],
    queryFn: () =>
      usersApi.getAll({ search: userSearch.trim(), limit: 8 }).then((r) => {
        // /admin/users paginatsiyalangan: { data: { data: [...], total, ... } }
        const d: any = r.data.data;
        return (Array.isArray(d) ? d : d?.data || d?.users || []) as User[];
      }),
    enabled: grantModal && userSearch.trim().length >= 2 && !selectedUser,
  });

  const userLabel = (u: User) => {
    const anyU = u as any;
    const name = [anyU.first_name, anyU.last_name].filter(Boolean).join(' ');
    return name || u.username;
  };

  const selectUser = (u: User) => {
    setSelectedUser(u);
    setGrantForm((f) => ({ ...f, user_id: String(u.id) }));
    setUserSearch('');
  };

  const resetGrant = () => {
    setGrantModal(false);
    setSelectedUser(null);
    setUserSearch('');
    setGrantForm({ user_id: '', plan_type: 'monthly', duration_days: 30 });
  };

  const extendMutation = useMutation({
    mutationFn: ({ id, additionalDays }: { id: number; additionalDays: number }) =>
      subscriptionsApi.extend(id, { additional_days: additionalDays, notes: 'Admin tomonidan uzaytirildi' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success(t('toast.extended'));
    },
    onError: () => toast.error(t('toast.extendError')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => subscriptionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success(t('toast.updated'));
    },
    onError: () => toast.error(t('toast.updateError')),
  });

  const createMutation = useMutation({
    mutationFn: (body: { user_id: number; plan_type: 'monthly' | 'yearly'; duration_days: number }) =>
      subscriptionsApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success(t('toast.granted'));
      resetGrant();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('toast.grantError')),
  });

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(grantForm.user_id);
    if (!uid) {
      toast.error(t('toast.userIdRequired'));
      return;
    }
    createMutation.mutate({
      user_id: uid,
      plan_type: grantForm.plan_type,
      duration_days: Number(grantForm.duration_days),
    });
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      subscriptionsApi.cancel(id, { reason, immediate: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success(t('toast.cancelled'));
      setCancelSub(null);
      setCancelReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || t('toast.cancelError')),
  });

  const submitExtend = () => {
    if (!extendSub) return;
    if (extendDays < 1) {
      toast.error(t('toast.minDays'));
      return;
    }
    extendMutation.mutate(
      { id: extendSub.id, additionalDays: extendDays },
      { onSuccess: () => setExtendSub(null) }
    );
  };

  const submitCancel = () => {
    if (!cancelSub) return;
    if (!cancelReason.trim()) {
      toast.error(t('toast.reasonRequired'));
      return;
    }
    cancelMutation.mutate({ id: cancelSub.id, reason: cancelReason.trim() });
  };

  const handleToggleAutoRenew = (sub: PremiumSubscription) => {
    updateMutation.mutate({ id: sub.id, data: { auto_renew: !sub.auto_renew } });
  };

  const statusBadge = (status: PremiumSubscription['status']) => {
    const map = {
      active: { color: 'green' as const, icon: CheckCircle, label: t('common:status.active') },
      expired: { color: 'red' as const, icon: XCircle, label: t('common:status.expired') },
      cancelled: { color: 'gray' as const, icon: XCircle, label: t('common:status.cancelled') },
      pending: { color: 'yellow' as const, icon: Clock, label: t('common:status.pending') },
    };
    const c = map[status];
    const Icon = c.icon;
    return (
      <Badge color={c.color}>
        <Icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const planBadge = (plan: string) => (
    <Badge color={plan === 'yearly' ? 'purple' : 'blue'}>
      {plan === 'yearly' ? t('plans.yearly') : t('plans.monthly')}
    </Badge>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString(getIntlLocale());
  const formatCurrency = (a: number) => `${a.toLocaleString(getIntlLocale())} ${t('common:units.som')}`;
  const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setGrantModal(true)}>
          <Crown className="w-4 h-4" />
          {t('grant.title')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.total')}
          value={stats?.overview?.total_subscriptions || 0}
          icon={<Users className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard
          title={t('stats.active')}
          value={stats?.overview?.active_subscriptions || 0}
          icon={<UserCheck className="w-6 h-6" />}
          color="bg-green-500"
        />
        <StatCard
          title={t('stats.monthlyRevenue')}
          value={formatCurrency(stats?.overview?.monthly_revenue || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard
          title={t('stats.newThisMonth')}
          value={stats?.overview?.new_this_month || 0}
          icon={<Sparkles className="w-6 h-6" />}
          color="bg-orange-500"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => applyFilter(() => setSearchTerm(e.target.value))}
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => applyFilter(() => setStatusFilter(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allStatuses')}</option>
            <option value="active">{t('common:status.active')}</option>
            <option value="expired">{t('common:status.expired')}</option>
            <option value="cancelled">{t('common:status.cancelled')}</option>
            <option value="pending">{t('common:status.pending')}</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => applyFilter(() => setPlanFilter(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allPlans')}</option>
            <option value="monthly">{t('plans.monthly')}</option>
            <option value="yearly">{t('plans.yearly')}</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      {!isLoading && subscriptions.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={t('empty.subscribers')} />
        </Card>
      ) : (
        <Table
          headers={[
            t('common:table.user'),
            t('table.plan'),
            t('common:table.status'),
            t('table.period'),
            t('common:table.price'),
            t('table.autoRenew'),
            t('common:table.actions'),
          ]}
          loading={isLoading}
        >
          {subscriptions.map((sub) => {
            const left = daysLeft(sub.end_date);
            return (
              <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {sub.full_name || sub.username}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{sub.phone}</div>
                </td>
                <td className="px-4 py-3">{planBadge(sub.plan_type)}</td>
                <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(sub.start_date)} – {formatDate(sub.end_date)}
                  </div>
                  {sub.status === 'active' && (
                    <div className={`text-xs mt-0.5 ${left > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {left > 0 ? t('table.daysLeft', { count: left }) : t('common:status.expired')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(sub.price_som)}
                </td>
                <td className="px-4 py-3">
                  {sub.auto_renew ? (
                    <Badge color="green">{t('common:status.enabled')}</Badge>
                  ) : (
                    <Badge color="gray">{t('common:status.disabled')}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setDetailsSub(sub)}
                      className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                      title={t('common:actions.details')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {sub.status === 'active' && (
                      <button
                        onClick={() => {
                          setExtendDays(30);
                          setExtendSub(sub);
                        }}
                        className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                        title={t('extend.title')}
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button
                        onClick={() => handleToggleAutoRenew(sub)}
                        disabled={updateMutation.isPending}
                        className={`p-2 rounded-lg transition disabled:opacity-50 ${
                          sub.auto_renew
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                        title={sub.auto_renew ? t('actions.disableAutoRenew') : t('actions.enableAutoRenew')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    {sub.status === 'active' && (
                      <button
                        onClick={() => {
                          setCancelReason('');
                          setCancelSub(sub);
                        }}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        title={t('cancel.action')}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {pagination && pagination.total > LIMIT && (
        <Pagination page={page} total={pagination.total} limit={LIMIT} onChange={setPage} />
      )}

      {/* Extend modal */}
      <Modal open={!!extendSub} onClose={() => setExtendSub(null)} title={t('extend.title')}>
        {extendSub && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Trans shouldUnescape tOptions={{ interpolation: { escapeValue: true } }}
                i18nKey="subscriptions:extend.description"
                values={{ name: extendSub.full_name || extendSub.username, date: formatDate(extendSub.end_date) }}
                components={{ b: <span className="font-medium text-gray-800 dark:text-gray-200" /> }}
              />
            </p>
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                    extendDays === d
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  {t('common:units.days', { count: d })}
                </button>
              ))}
            </div>
            <Input
              type="number"
              label={t('extend.customDays')}
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExtendSub(null)}>
                {t('common:actions.cancel')}
              </Button>
              <Button onClick={submitExtend} loading={extendMutation.isPending}>
                <CalendarPlus className="w-4 h-4" />
                {t('extend.submit')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel modal */}
      <Modal open={!!cancelSub} onClose={() => setCancelSub(null)} title={t('cancel.title')}>
        {cancelSub && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Trans shouldUnescape tOptions={{ interpolation: { escapeValue: true } }}
                i18nKey="subscriptions:cancel.description"
                values={{ name: cancelSub.full_name || cancelSub.username }}
                components={{ b: <span className="font-medium text-gray-800 dark:text-gray-200" /> }}
              />
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('cancel.reasonLabel')}</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('cancel.reasonPlaceholder')}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelSub(null)}>
                {t('common:actions.close')}
              </Button>
              <Button variant="danger" onClick={submitCancel} loading={cancelMutation.isPending}>
                <Ban className="w-4 h-4" />
                {t('cancel.action')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Details modal */}
      <Modal open={!!detailsSub} onClose={() => setDetailsSub(null)} title={t('details.title')}>
        {detailsSub && (
          <div className="space-y-3">
            {[
              [t('common:table.user'), detailsSub.full_name || detailsSub.username],
              [t('common:table.phone'), detailsSub.phone || '—'],
              [t('details.userId'), String(detailsSub.user_id)],
              [t('table.plan'), detailsSub.plan_type === 'yearly' ? t('plans.yearly') : t('plans.monthly')],
              [t('common:table.price'), formatCurrency(detailsSub.price_som)],
              [t('common:table.startDate'), formatDate(detailsSub.start_date)],
              [t('common:table.endDate'), formatDate(detailsSub.end_date)],
              [
                t('details.daysLeft'),
                detailsSub.status === 'active' ? t('common:units.days', { count: daysLeft(detailsSub.end_date) }) : '—',
              ],
              [t('table.autoRenew'), detailsSub.auto_renew ? t('common:status.enabled') : t('common:status.disabled')],
              [t('common:table.created'), formatDate(detailsSub.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{k}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('common:table.status')}:</span>
              {statusBadge(detailsSub.status)}
            </div>
          </div>
        )}
      </Modal>

      {/* Grant modal */}
      <Modal open={grantModal} onClose={resetGrant} title={t('grant.title')}>
        <form onSubmit={handleGrantSubmit} className="space-y-4">
          {/* Foydalanuvchi qidiruvi */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('grant.userLabel')}</label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userLabel(selectedUser)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{selectedUser.username} · {selectedUser.phone || '—'} · ID {selectedUser.id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setGrantForm((f) => ({ ...f, user_id: '' }));
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                  title={t('grant.changeUser')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  autoFocus
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t('grant.searchPlaceholder')}
                  className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {userSearch.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {userSearchQ.isLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-400">{t('grant.searching')}</div>
                    ) : (userSearchQ.data || []).length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">{t('common:state.noResults')}</div>
                    ) : (
                      (userSearchQ.data || []).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => selectUser(u)}
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <span className="text-sm text-gray-900 dark:text-gray-100">{userLabel(u)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            @{u.username} · {u.phone || '—'} · ID {u.id}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('table.plan')}
              value={grantForm.plan_type}
              onChange={(e) => setGrantForm((f) => ({ ...f, plan_type: e.target.value as 'monthly' | 'yearly' }))}
            >
              <option value="monthly">{t('plans.monthly')}</option>
              <option value="yearly">{t('plans.yearly')}</option>
            </Select>
            <Input
              type="number"
              label={t('grant.duration')}
              min={1}
              value={grantForm.duration_days}
              onChange={(e) => setGrantForm((f) => ({ ...f, duration_days: Number(e.target.value) }))}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('grant.priceHint', { currency: t('common:units.som') })}
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetGrant}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              {t('grant.submit')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
