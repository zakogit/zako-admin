import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, TrendingUp, Users, DollarSign, Plus, Edit, Trash2, Settings, BarChart3 } from 'lucide-react';
import { Table, Badge, Button, Modal, Card, EmptyState } from '../../components/ui';
import { formatDate, formatNumber, getStaticFileUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

// Types
interface RentalPackage {
  id: number;
  name: string;
  days: number;
  price: number;
  is_active: boolean;
  created_at: string;
}

interface PackageUsage {
  package_id: number;
  package_name: string;
  days: number;
  price: number;
  total_rentals: number;
  active_rentals: number;
  total_revenue: number;
}

interface RentalStats {
  total_active_rentals: number;
  total_revenue: number;
  most_popular_avatars: Array<{
    avatar_id: number;
    avatar_url: string;
    rental_count: number;
    total_revenue: number;
  }>;
  recent_rentals: Array<{
    id: number;
    user_id: number;
    avatar_id: number;
    rental_start: string;
    rental_end: string;
    days_remaining: number;
    is_active: boolean;
    price_paid: number;
    avatar_url: string;
    avatar_gender: string;
  }>;
}

interface AnalyticsData {
  packages_usage: PackageUsage[];
  summary: {
    total_packages: number;
    active_packages: number;
    total_revenue: number;
    total_rentals: number;
  };
}

// API Functions
const avatarPackagesApi = {
  // Packages
  getPackages: () => 
    api.get('/admin/avatar-packages/packages').then(r => r.data),
    
  createPackage: (data: { name: string; days: number; price: number; is_active: boolean }) =>
    api.post('/admin/avatar-packages/packages', data).then(r => r.data),
    
  updatePackage: (id: number, data: Partial<RentalPackage>) =>
    api.put(`/admin/avatar-packages/packages/${id}`, data).then(r => r.data),
    
  deletePackage: (id: number) =>
    api.delete(`/admin/avatar-packages/packages/${id}`).then(r => r.data),

  // Analytics
  getAnalytics: () =>
    api.get('/admin/avatar-packages/rental-analytics').then(r => r.data),
    
  getRentalStats: () =>
    api.get('/premium-avatars/admin/stats').then(r => r.data),
    
  cleanupRentals: () =>
    api.post('/premium-avatars/admin/cleanup').then(r => r.data)
};

export default function PremiumAvatarManagement() {
  const { t } = useTranslation('premiumAvatars');
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'rentals' | 'analytics'>('overview');
  const [selectedPackage, setSelectedPackage] = useState<RentalPackage | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>();

  // Queries
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: avatarPackagesApi.getPackages,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: avatarPackagesApi.getAnalytics,
  });

  const { data: rentalStatsData, isLoading: rentalStatsLoading } = useQuery({
    queryKey: ['rental-stats'],
    queryFn: avatarPackagesApi.getRentalStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: avatarPackagesApi.createPackage,
    onSuccess: () => {
      toast.success(t('toast.created'));
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-packages'] });
      qc.invalidateQueries({ queryKey: ['admin-analytics'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('toast.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => avatarPackagesApi.updatePackage(id, data),
    onSuccess: () => {
      toast.success(t('toast.updated'));
      setEditModal(false);
      setSelectedPackage(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-packages'] });
      qc.invalidateQueries({ queryKey: ['admin-analytics'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('toast.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: avatarPackagesApi.deletePackage,
    onSuccess: () => {
      toast.success(t('toast.deleted'));
      setDeleteModal(false);
      setSelectedPackage(null);
      qc.invalidateQueries({ queryKey: ['admin-packages'] });
      qc.invalidateQueries({ queryKey: ['admin-analytics'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('toast.deleteFailed')),
  });

  const cleanupMutation = useMutation({
    mutationFn: avatarPackagesApi.cleanupRentals,
    onSuccess: (data: any) => {
      toast.success(t('toast.cleaned', { count: Number(data.data.deactivated_count) || 0 }));
      qc.invalidateQueries({ queryKey: ['rental-stats'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || t('toast.cleanupFailed')),
  });

  const packages: RentalPackage[] = packagesData?.success && Array.isArray(packagesData.data) ? packagesData.data : Array.isArray(packagesData) ? packagesData : [];
  const analytics: AnalyticsData | undefined = analyticsData?.success ? analyticsData.data : analyticsData;
  const rentalStats: RentalStats | undefined = rentalStatsData?.success ? rentalStatsData.data : rentalStatsData;

  const openEditModal = (pkg?: RentalPackage) => {
    setSelectedPackage(pkg || null);
    if (pkg) {
      setValue('name', pkg.name);
      setValue('days', pkg.days);
      setValue('price', pkg.price);
      setValue('is_active', pkg.is_active);
    } else {
      reset();
      setValue('is_active', true);
    }
    setEditModal(true);
  };

  const onSubmit = (data: any) => {
    if (selectedPackage) {
      updateMutation.mutate({ id: selectedPackage.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Overview Tab
  const OverviewTab = () => {
    const { t } = useTranslation('premiumAvatars');
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {analytics?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('stats.totalPackages')}</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.summary.total_packages || 0}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('stats.totalRevenue')}</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(analytics.summary.total_revenue || 0)}</p>
                  <p className="text-xs text-gray-400">{t('units.coinsCaption')}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('stats.totalRentals')}</p>
                  <p className="text-2xl font-bold text-purple-600">{formatNumber(analytics.summary.total_rentals || 0)}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t('stats.activeRentals')}</p>
                  <p className="text-2xl font-bold text-orange-600">{rentalStats?.total_active_rentals || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>
        )}

        {/* Package Performance */}
        {analytics?.packages_usage && analytics.packages_usage.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('overview.performanceTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('table.package')}</th>
                    <th className="text-left py-2">{t('common:table.price')}</th>
                    <th className="text-left py-2">{t('table.totalRentals')}</th>
                    <th className="text-left py-2">{t('table.activeRentals')}</th>
                    <th className="text-left py-2">{t('table.revenue')}</th>
                    <th className="text-left py-2">{t('table.performance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.packages_usage.map((pkg) => (
                    <tr key={pkg.package_id} className="border-b">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge color="blue">{pkg.package_name}</Badge>
                          <span className="text-sm text-gray-500">({t('common:units.days', { count: Number(pkg.days) || 0 })})</span>
                        </div>
                      </td>
                      <td className="py-3">{t('units.coins', { count: Number(pkg.price) || 0 })}</td>
                      <td className="py-3">{formatNumber(pkg.total_rentals)}</td>
                      <td className="py-3">
                        <Badge color={pkg.active_rentals > 0 ? 'green' : 'gray'}>
                          {pkg.active_rentals}
                        </Badge>
                      </td>
                      <td className="py-3 font-semibold text-green-600">{formatNumber(pkg.total_revenue)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (pkg.total_revenue / Math.max(...(analytics?.packages_usage?.map(p => p.total_revenue) || [1]))) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {Math.round((pkg.total_revenue / (analytics?.summary?.total_revenue || 1)) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('overview.quickActions')}</h3>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setActiveTab('packages')} className="gap-2">
              <Settings className="w-4 h-4" />
              {t('overview.managePackages')}
            </Button>
            <Button
              onClick={() => cleanupMutation.mutate()}
              variant="outline"
              className="gap-2"
              loading={cleanupMutation.isPending}
            >
              <Trash2 className="w-4 h-4" />
              {t('overview.cleanupExpired')}
            </Button>
            <Button onClick={() => setActiveTab('analytics')} variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('overview.viewAnalytics')}
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // Packages Tab
  const PackagesTab = () => {
    const { t } = useTranslation('premiumAvatars');
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('packages.title')}</h2>
          <Button onClick={() => openEditModal()} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('packages.new')}
          </Button>
        </div>

        {/* Packages Table */}
        <Card>
          {packagesLoading ? (
            <div className="p-8 text-center">{t('common:state.loading')}</div>
          ) : packages.length === 0 ? (
            <EmptyState message={t('packages.empty')} />
          ) : (
            <Table headers={[t('table.package'), t('table.duration'), t('common:table.price'), t('common:table.status'), t('common:table.created'), '']}>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{pkg.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="purple">{t('common:units.days', { count: Number(pkg.days) || 0 })}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{t('units.coins', { count: Number(pkg.price) || 0 })}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={pkg.is_active ? 'green' : 'red'}>
                      {pkg.is_active ? t('common:status.active') : t('common:status.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(pkg.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(pkg)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setSelectedPackage(pkg); setDeleteModal(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    );
  };

  // Rentals Tab
  const RentalsTab = () => {
    const { t } = useTranslation('premiumAvatars');
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">{t('rentals.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('rentals.subtitle', { status: t('common:table.status') })}</p>
        </div>

        {rentalStatsLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : !rentalStats?.recent_rentals?.length ? (
          <EmptyState message={t('rentals.empty')} />
        ) : (
          <Card>
            <Table headers={[t('common:table.user'), t('table.avatar'), t('common:table.startDate'), t('common:table.endDate'), t('table.daysRemaining'), t('common:table.price'), t('common:table.status')]}>
              {(rentalStats?.recent_rentals || []).map((rental) => (
                <tr key={rental.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">ID: {rental.user_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {rental.avatar_url ? (
                        <img
                          src={getStaticFileUrl(rental.avatar_url)}
                          alt={t('avatarAlt')}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] text-gray-400">
                          {t('rentals.noAvatar')}
                        </div>
                      )}
                      <Badge color="blue">{rental.avatar_gender ? t(`gender.${String(rental.avatar_gender).toLowerCase()}`, { defaultValue: rental.avatar_gender }) : '—'}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(rental.rental_start)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(rental.rental_end)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={rental.days_remaining > 0 ? 'green' : 'red'}>
                      {t('common:units.days', { count: Number(rental.days_remaining) || 0 })}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {t('units.coins', { count: Number(rental.price_paid) || 0 })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={rental.is_active ? 'green' : 'red'}>
                      {rental.is_active ? t('common:status.active') : t('common:status.inactive')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>
    );
  };

  // Analytics Tab
  const AnalyticsTab = () => {
    const { t } = useTranslation('premiumAvatars');
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">{t('analytics.title')}</h2>
      
        {/* Most Popular Avatars */}
        {rentalStats?.most_popular_avatars && rentalStats.most_popular_avatars.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('analytics.popularTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(rentalStats?.most_popular_avatars || []).map((avatar) => (
                <div key={avatar.avatar_id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={avatar.avatar_url}
                      alt={t('avatarAlt')}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div>
                      <div className="font-medium">{t('analytics.avatarNumber', { id: avatar.avatar_id })}</div>
                      <div className="text-sm text-gray-500">{t('analytics.rentedTimes', { count: Number(avatar.rental_count) || 0 })}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t('analytics.totalRevenue')}</span>
                    <span className="font-semibold text-green-600">{t('units.coins', { count: Number(avatar.total_revenue) || 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Additional analytics could go here */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('analytics.extraTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">{t('analytics.systemTitle')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('analytics.totalPremium')}</span>
                  <span className="font-medium">{t('analytics.notShown')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('analytics.avgDuration')}</span>
                  <span className="font-medium">
                    {t('common:units.days', { count: (analytics?.packages_usage && analytics?.summary ? Math.round((analytics.packages_usage || []).reduce((acc, pkg) => acc + (pkg.days * pkg.total_rentals), 0) / Math.max(analytics.summary.total_rentals || 1, 1)) : 0) || 0 })}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">{t('analytics.recommendations')}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {t('analytics.tip1')}</p>
                <p>• {t('analytics.tip2')}</p>
                <p>• {t('analytics.tip3')}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { id: 'overview', label: t('tabs.overview'), icon: BarChart3 },
            { id: 'packages', label: t('tabs.packages'), icon: Package },
            { id: 'rentals', label: t('tabs.rentals'), icon: Users },
            { id: 'analytics', label: t('tabs.analytics'), icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-primary-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'packages' && <PackagesTab />}
      {activeTab === 'rentals' && <RentalsTab />}
      {activeTab === 'analytics' && <AnalyticsTab />}

      {/* Edit Modal */}
      <Modal 
        open={editModal} 
        onClose={() => { setEditModal(false); setSelectedPackage(null); }} 
        title={selectedPackage ? t('modal.editTitle') : t('modal.createTitle')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('form.name')}</label>
            <input 
              {...register('name', { required: t('validation.nameRequired') })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              placeholder={t('form.namePlaceholder')}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{String(errors.name.message)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('form.days')}</label>
              <input 
                type="number"
                {...register('days', { required: t('validation.daysRequired'), min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                min="1"
              />
              {errors.days && <p className="text-red-500 text-xs mt-1">{String(errors.days.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('form.price')}</label>
              <input 
                type="number"
                {...register('price', { required: t('validation.priceRequired'), min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                min="1"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{String(errors.price.message)}</p>}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium">{t('common:status.active')}</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selectedPackage ? t('common:actions.update') : t('common:actions.create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title={t('modal.deleteTitle')}>
        <div className="space-y-4">
          <p>{t('confirm.deleteText')}</p>
          {selectedPackage && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selectedPackage.name}</p>
              <p className="text-sm text-gray-500">{t('common:units.days', { count: Number(selectedPackage.days) || 0 })} - {t('units.coins', { count: Number(selectedPackage.price) || 0 })}</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button 
              variant="danger" 
              onClick={() => selectedPackage && deleteMutation.mutate(selectedPackage.id)}
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