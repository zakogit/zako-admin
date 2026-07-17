import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      toast.success('Obuna muvaffaqiyatli uzaytirildi');
    },
    onError: () => toast.error('Obunani uzaytirishda xatolik yuz berdi'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => subscriptionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success('Obuna yangilandi');
    },
    onError: () => toast.error('Obunani yangilashda xatolik yuz berdi'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { user_id: number; plan_type: 'monthly' | 'yearly'; duration_days: number }) =>
      subscriptionsApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success('Premium muvaffaqiyatli berildi');
      resetGrant();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Premium berishda xatolik yuz berdi'),
  });

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uid = Number(grantForm.user_id);
    if (!uid) {
      toast.error('Foydalanuvchi ID kiriting');
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
      toast.success('Obuna bekor qilindi');
      setCancelSub(null);
      setCancelReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Bekor qilishda xatolik'),
  });

  const submitExtend = () => {
    if (!extendSub) return;
    if (extendDays < 1) {
      toast.error('Kun 1 dan kam bo\'lmasligi kerak');
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
      toast.error('Bekor qilish sababini kiriting');
      return;
    }
    cancelMutation.mutate({ id: cancelSub.id, reason: cancelReason.trim() });
  };

  const handleToggleAutoRenew = (sub: PremiumSubscription) => {
    updateMutation.mutate({ id: sub.id, data: { auto_renew: !sub.auto_renew } });
  };

  const statusBadge = (status: PremiumSubscription['status']) => {
    const map = {
      active: { color: 'green' as const, icon: CheckCircle, label: 'Faol' },
      expired: { color: 'red' as const, icon: XCircle, label: 'Tugagan' },
      cancelled: { color: 'gray' as const, icon: XCircle, label: 'Bekor qilingan' },
      pending: { color: 'yellow' as const, icon: Clock, label: 'Kutilmoqda' },
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
    <Badge color={plan === 'yearly' ? 'purple' : 'blue'}>{plan === 'yearly' ? 'Yillik' : 'Oylik'}</Badge>
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ');
  const formatCurrency = (a: number) => a.toLocaleString('uz-UZ') + " so'm";
  const daysLeft = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Premium Obunalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Premium a'zolik va obunalarni boshqaring</p>
        </div>
        <Button onClick={() => setGrantModal(true)}>
          <Crown className="w-4 h-4" />
          Manual premium berish
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami obunachilar"
          value={stats?.overview?.total_subscriptions || 0}
          icon={<Users className="w-6 h-6" />}
          color="bg-blue-500"
        />
        <StatCard
          title="Faol obunachilar"
          value={stats?.overview?.active_subscriptions || 0}
          icon={<UserCheck className="w-6 h-6" />}
          color="bg-green-500"
        />
        <StatCard
          title="Oylik daromad"
          value={stats?.overview?.monthly_revenue ? formatCurrency(stats.overview.monthly_revenue) : "0 so'm"}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-purple-500"
        />
        <StatCard
          title="Shu oy yangi"
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
              placeholder="Foydalanuvchi qidirish..."
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
            <option value="">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="expired">Tugagan</option>
            <option value="cancelled">Bekor qilingan</option>
            <option value="pending">Kutilmoqda</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => applyFilter(() => setPlanFilter(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Barcha rejalar</option>
            <option value="monthly">Oylik</option>
            <option value="yearly">Yillik</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      {!isLoading && subscriptions.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Premium obunachilar topilmadi" />
        </Card>
      ) : (
        <Table
          headers={['Foydalanuvchi', 'Reja', 'Holat', 'Muddat', 'Narx', 'Avto-yangilanish', 'Amallar']}
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
                      {left > 0 ? `${left} kun qoldi` : 'Muddati tugagan'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(sub.price_som)}
                </td>
                <td className="px-4 py-3">
                  {sub.auto_renew ? (
                    <Badge color="green">Yoqilgan</Badge>
                  ) : (
                    <Badge color="gray">O'chirilgan</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setDetailsSub(sub)}
                      className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                      title="Batafsil"
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
                        title="Muddatni uzaytirish"
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
                        title={sub.auto_renew ? "Avto-yangilanishni o'chirish" : 'Avto-yangilanishni yoqish'}
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
                        title="Bekor qilish"
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
      <Modal open={!!extendSub} onClose={() => setExtendSub(null)} title="Muddatni uzaytirish">
        {extendSub && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {extendSub.full_name || extendSub.username}
              </span>{' '}
              obunasini uzaytirish (hozir tugash: {formatDate(extendSub.end_date)}).
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
                  {d} kun
                </button>
              ))}
            </div>
            <Input
              type="number"
              label="Yoki aniq kun kiriting"
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExtendSub(null)}>
                Bekor qilish
              </Button>
              <Button onClick={submitExtend} loading={extendMutation.isPending}>
                <CalendarPlus className="w-4 h-4" />
                Uzaytirish
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel modal */}
      <Modal open={!!cancelSub} onClose={() => setCancelSub(null)} title="Obunani bekor qilish">
        {cancelSub && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {cancelSub.full_name || cancelSub.username}
              </span>{' '}
              obunasi bekor qilinadi va premium darhol o'chiriladi.
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sabab *</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Bekor qilish sababi"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCancelSub(null)}>
                Yopish
              </Button>
              <Button variant="danger" onClick={submitCancel} loading={cancelMutation.isPending}>
                <Ban className="w-4 h-4" />
                Bekor qilish
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Details modal */}
      <Modal open={!!detailsSub} onClose={() => setDetailsSub(null)} title="Obuna ma'lumotlari">
        {detailsSub && (
          <div className="space-y-3">
            {[
              ['Foydalanuvchi', detailsSub.full_name || detailsSub.username],
              ['Telefon', detailsSub.phone || '—'],
              ['Foydalanuvchi ID', String(detailsSub.user_id)],
              ['Reja', detailsSub.plan_type === 'yearly' ? 'Yillik' : 'Oylik'],
              ['Narx', formatCurrency(detailsSub.price_som)],
              ['Boshlanish', formatDate(detailsSub.start_date)],
              ['Tugash', formatDate(detailsSub.end_date)],
              ['Qolgan kun', detailsSub.status === 'active' ? `${daysLeft(detailsSub.end_date)} kun` : '—'],
              ['Avto-yangilanish', detailsSub.auto_renew ? 'Yoqilgan' : "O'chirilgan"],
              ['Yaratilgan', formatDate(detailsSub.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{k}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">Holat:</span>
              {statusBadge(detailsSub.status)}
            </div>
          </div>
        )}
      </Modal>

      {/* Grant modal */}
      <Modal open={grantModal} onClose={resetGrant} title="Manual premium berish">
        <form onSubmit={handleGrantSubmit} className="space-y-4">
          {/* Foydalanuvchi qidiruvi */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foydalanuvchi *</label>
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
                  title="Boshqa foydalanuvchi tanlash"
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
                  placeholder="Ism, username yoki telefon bo'yicha qidiring..."
                  className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {userSearch.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                    {userSearchQ.isLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Qidirilmoqda...</div>
                    ) : (userSearchQ.data || []).length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">Topilmadi</div>
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
              label="Reja"
              value={grantForm.plan_type}
              onChange={(e) => setGrantForm((f) => ({ ...f, plan_type: e.target.value as 'monthly' | 'yearly' }))}
            >
              <option value="monthly">Oylik</option>
              <option value="yearly">Yillik</option>
            </Select>
            <Input
              type="number"
              label="Muddat (kun)"
              min={1}
              value={grantForm.duration_days}
              onChange={(e) => setGrantForm((f) => ({ ...f, duration_days: Number(e.target.value) }))}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manual berishda narx 0 so'm (sovg'a) sifatida yoziladi.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetGrant}>
              Bekor qilish
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Premium berish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;
