import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Crown, 
  Users, 
  TrendingUp, 
  Calendar, 
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Gift,
  Eye,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionsApi } from '../../api/services';

interface PremiumSubscription {
  id: number;
  user_id: number;
  user_name: string;
  user_phone: string;
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

  // Real API calls
  const { data: subscriptionsData, isLoading } = useQuery({
    queryKey: ['subscriptions', statusFilter, planFilter, searchTerm],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan_type = planFilter;
      if (searchTerm) params.search = searchTerm;
      
      const response = await subscriptionsApi.getAll(params);
      return response.data;
    },
  });
  
  const subscriptions = subscriptionsData?.data?.subscriptions || [];

  const { data: statsData } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const response = await subscriptionsApi.getStats();
      return response.data;
    },
  });
  
  const stats = statsData?.data;

  // Mutations
  const extendMutation = useMutation({
    mutationFn: ({ id, additionalDays }: { id: number; additionalDays: number }) =>
      subscriptionsApi.extend(id, { additional_days: additionalDays, notes: 'Admin tomonidan uzaytirildi' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success('Obuna muvaffaqiyatli uzaytirildi');
    },
    onError: () => {
      toast.error('Obunani uzaytirishda xatolik yuz berdi');
    },
  });


  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      subscriptionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast.success('Obuna yangilandi');
    },
    onError: () => {
      toast.error('Obunani yangilashda xatolik yuz berdi');
    },
  });

  // Helper functions
  const handleExtendSubscription = (subscription: PremiumSubscription) => {
    const additionalDays = 30; // Default extend by 30 days
    extendMutation.mutate({ id: subscription.id, additionalDays });
  };

  const handleToggleAutoRenew = (subscription: PremiumSubscription) => {
    updateMutation.mutate({
      id: subscription.id,
      data: { auto_renew: !subscription.auto_renew }
    });
  };

  const getStatusBadge = (status: PremiumSubscription['status']) => {
    const configs = {
      active: { 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300',
        icon: CheckCircle,
        label: 'Faol'
      },
      expired: { 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300',
        icon: XCircle,
        label: 'Tugagan'
      },
      cancelled: { 
        color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300',
        icon: XCircle,
        label: 'Bekor qilingan'
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300',
        icon: Clock,
        label: 'Kutilmoqda'
      }
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    return plan === 'yearly' ? (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-300">
        Yillik
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300">
        Oylik
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uz-UZ');
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('uz-UZ') + ' so\'m';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Premium Obunalar
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Premium a'zolik va obunalarni boshqaring
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => console.log('Create modal not implemented yet')}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Crown className="h-4 w-4" />
            <span>Manual Premium Berish</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Jami Obunachilar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.total_subscribers || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faol Obunachilar</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.active_subscribers || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Oylik Daromad</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.monthly_revenue ? formatCurrency(stats.monthly_revenue) : '0 so\'m'}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Shu Oy Yangi</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.new_this_month || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Foydalanuvchi qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Barcha holatlar</option>
            <option value="active">Faol</option>
            <option value="expired">Tugagan</option>
            <option value="cancelled">Bekor qilingan</option>
            <option value="pending">Kutilmoqda</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Barcha rejalar</option>
            <option value="monthly">Oylik</option>
            <option value="yearly">Yillik</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Premium Obunachilar</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Foydalanuvchi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reja
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Holat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Muddat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Narx
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Avto Yangilanish
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {subscription.user_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {subscription.user_phone}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(subscription.plan_type)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(subscription.status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(subscription.price_som)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {subscription.auto_renew ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        ✓ Ha
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        ✗ Yo'q
                      </span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => console.log('Subscription details:', subscription)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Ko'rish"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {subscription.status === 'active' && (
                        <button
                          onClick={() => handleExtendSubscription(subscription)}
                          disabled={extendMutation.isPending}
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50"
                          title="Uzaytirish"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      )}
                      
                      {subscription.status === 'active' && (
                        <button
                          onClick={() => handleToggleAutoRenew(subscription)}
                          disabled={updateMutation.isPending}
                          className={`p-2 rounded-lg disabled:opacity-50 ${
                            subscription.auto_renew 
                              ? 'text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={subscription.auto_renew ? "Avto yangilanishni o'chirish" : "Avto yangilanishni yoqish"}
                        >
                          <Gift className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {subscriptions.length === 0 && (
            <div className="text-center py-12">
              <Crown className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Premium obunachilar topilmadi
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Hozircha premium obunasi bo'lgan foydalanuvchi yo'q
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;