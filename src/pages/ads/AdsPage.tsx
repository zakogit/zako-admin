import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adsApi } from '../../api/services';
import { Activity, Settings, Users, TrendingUp, Smartphone, DollarSign } from 'lucide-react';

interface AdsSettings {
  daily_limit: number;
  coins_per_ad: number;
  ads_enabled: boolean;
  admob_app_id: string;
  rewarded_unit_id: string;
  admob_app_id_android: string;
  admob_app_id_ios: string;
  rewarded_unit_id_android: string;
  rewarded_unit_id_ios: string;
  test_mode: boolean;
}

const AdsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics' | 'users'>('settings');
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
  const [editingSettings, setEditingSettings] = useState<Partial<AdsSettings>>({});
  const queryClient = useQueryClient();

  // Fetch ads settings
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['ads-settings'],
    queryFn: adsApi.getSettings,
  });

  // Fetch analytics
  const { data: analyticsResponse, isLoading: analyticsLoading } = useQuery({
    queryKey: ['ads-analytics'],
    queryFn: () => adsApi.getAnalytics({ limit: 50 }),
    enabled: activeTab === 'analytics',
  });

  // Fetch user stats
  const { data: userStatsResponse, isLoading: userStatsLoading } = useQuery({
    queryKey: ['ads-user-stats'],
    queryFn: adsApi.getUserStats,
    enabled: activeTab === 'users',
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => 
      adsApi.updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-settings'] });
      setEditingSettings({});
    },
  });

  const settings = settingsResponse?.data?.data as AdsSettings | undefined;
  
  const analytics = analyticsResponse?.data as any;
  const userStats = userStatsResponse?.data as any;

  const handleSettingUpdate = (key: keyof AdsSettings, value: any) => {
    updateSettingMutation.mutate({ 
      key, 
      value: typeof value === 'boolean' ? value.toString() : value.toString()
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('uz-UZ');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reklama Boshqaruvi</h1>
          <p className="text-gray-600 dark:text-gray-400">AdMob integratsiyasi va reklama sozlamalari</p>
        </div>
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Mobile App Integration</span>
        </div>
      </div>

      {/* Stats Cards */}
      {analytics?.total_stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Jami Ko'rishlar</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumber(analytics.total_stats.total_ad_views)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">Tarqatilgan Coinlar</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatNumber(analytics.total_stats.total_coins_distributed)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 dark:text-purple-400 text-sm font-medium">Faol Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatNumber(analytics.total_stats.total_unique_users)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">O'rtacha/Foydalanuvchi</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {analytics.total_stats.total_unique_users > 0 
                    ? Math.round(analytics.total_stats.total_ad_views / analytics.total_stats.total_unique_users)
                    : 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'settings', label: 'Sozlamalar', icon: Settings },
              { key: 'analytics', label: 'Analitika', icon: TrendingUp },
              { key: 'users', label: 'Foydalanuvchilar', icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reklama Sozlamalari</h3>
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {[
                    { key: 'android', label: 'Android' },
                    { key: 'ios', label: 'iOS' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPlatform(key as 'android' | 'ios')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedPlatform === key
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              {settingsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : settings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Kunlik Limit
                      </label>
                      <input
                        type="number"
                        value={editingSettings.daily_limit ?? settings.daily_limit}
                        onChange={(e) => setEditingSettings(prev => ({ 
                          ...prev, 
                          daily_limit: parseInt(e.target.value) 
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      {editingSettings.daily_limit !== undefined && editingSettings.daily_limit !== settings.daily_limit && (
                        <button
                          onClick={() => handleSettingUpdate('daily_limit', editingSettings.daily_limit!)}
                          disabled={updateSettingMutation.isPending}
                          className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          {updateSettingMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Reklama uchun Coinlar
                      </label>
                      <input
                        type="number"
                        value={editingSettings.coins_per_ad ?? settings.coins_per_ad}
                        onChange={(e) => setEditingSettings(prev => ({ 
                          ...prev, 
                          coins_per_ad: parseInt(e.target.value) 
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      {editingSettings.coins_per_ad !== undefined && editingSettings.coins_per_ad !== settings.coins_per_ad && (
                        <button
                          onClick={() => handleSettingUpdate('coins_per_ad', editingSettings.coins_per_ad!)}
                          disabled={updateSettingMutation.isPending}
                          className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          {updateSettingMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reklamalar Faol</span>
                      <button
                        onClick={() => handleSettingUpdate('ads_enabled', !settings.ads_enabled)}
                        disabled={updateSettingMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.ads_enabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.ads_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Mode</span>
                      <button
                        onClick={() => handleSettingUpdate('test_mode', !settings.test_mode)}
                        disabled={updateSettingMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.test_mode ? 'bg-orange-600 dark:bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.test_mode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        AdMob App ID ({selectedPlatform === 'android' ? 'Android' : 'iOS'})
                      </label>
                      <input
                        type="text"
                        value={selectedPlatform === 'android' 
                          ? (editingSettings.admob_app_id_android ?? settings?.admob_app_id_android ?? settings?.admob_app_id) 
                          : (editingSettings.admob_app_id_ios ?? settings?.admob_app_id_ios ?? settings?.admob_app_id)
                        }
                        onChange={(e) => setEditingSettings(prev => ({ 
                          ...prev, 
                          [selectedPlatform === 'android' ? 'admob_app_id_android' : 'admob_app_id_ios']: e.target.value 
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                      />
                      {((selectedPlatform === 'android' && editingSettings.admob_app_id_android !== undefined && editingSettings.admob_app_id_android !== settings.admob_app_id_android) ||
                        (selectedPlatform === 'ios' && editingSettings.admob_app_id_ios !== undefined && editingSettings.admob_app_id_ios !== settings.admob_app_id_ios)) && (
                        <button
                          onClick={() => handleSettingUpdate(
                            selectedPlatform === 'android' ? 'admob_app_id_android' : 'admob_app_id_ios',
                            selectedPlatform === 'android' ? editingSettings.admob_app_id_android! : editingSettings.admob_app_id_ios!
                          )}
                          disabled={updateSettingMutation.isPending}
                          className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          {updateSettingMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rewarded Ad Unit ID ({selectedPlatform === 'android' ? 'Android' : 'iOS'})
                      </label>
                      <input
                        type="text"
                        value={selectedPlatform === 'android' 
                          ? (editingSettings.rewarded_unit_id_android ?? settings?.rewarded_unit_id_android ?? settings?.rewarded_unit_id) 
                          : (editingSettings.rewarded_unit_id_ios ?? settings?.rewarded_unit_id_ios ?? settings?.rewarded_unit_id)
                        }
                        onChange={(e) => setEditingSettings(prev => ({ 
                          ...prev, 
                          [selectedPlatform === 'android' ? 'rewarded_unit_id_android' : 'rewarded_unit_id_ios']: e.target.value 
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                      />
                      {((selectedPlatform === 'android' && editingSettings.rewarded_unit_id_android !== undefined && editingSettings.rewarded_unit_id_android !== settings.rewarded_unit_id_android) ||
                        (selectedPlatform === 'ios' && editingSettings.rewarded_unit_id_ios !== undefined && editingSettings.rewarded_unit_id_ios !== settings.rewarded_unit_id_ios)) && (
                        <button
                          onClick={() => handleSettingUpdate(
                            selectedPlatform === 'android' ? 'rewarded_unit_id_android' : 'rewarded_unit_id_ios',
                            selectedPlatform === 'android' ? editingSettings.rewarded_unit_id_android! : editingSettings.rewarded_unit_id_ios!
                          )}
                          disabled={updateSettingMutation.isPending}
                          className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                        >
                          {updateSettingMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Sozlamalarni yuklashda xatolik</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Reklama Analitikasi</h3>
              
              {analyticsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Daily Stats */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Oxirgi 7 kun</h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="grid grid-cols-4 gap-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                        <div>Sana</div>
                        <div>Ko'rishlar</div>
                        <div>Coinlar</div>
                        <div>Foydalanuvchilar</div>
                      </div>
                      {analytics?.daily_stats?.map((day: any, index: number) => (
                        <div key={index} className="grid grid-cols-4 gap-4 text-center py-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatDate(day.view_date)}</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{formatNumber(day.total_views)}</div>
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium">{formatNumber(day.total_coins_given)}</div>
                          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">{formatNumber(day.unique_users)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Viewers */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Eng faol ko'ruvchilar</h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="grid grid-cols-4 gap-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                        <div>Foydalanuvchi</div>
                        <div>Ko'rishlar</div>
                        <div>Coinlar</div>
                        <div>O'rtacha</div>
                      </div>
                      {analytics?.top_viewers?.slice(0, 10).map((user: any, index: number) => (
                        <div key={index} className="grid grid-cols-4 gap-4 text-center py-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : user.username}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{user.total_ads_watched}</div>
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium">{user.total_coins_earned}</div>
                          <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                            {user.total_ads_watched > 0 ? Math.round(user.total_coins_earned / user.total_ads_watched) : 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Analitikani yuklashda xatolik</p>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Foydalanuvchi Statistikasi</h3>
              
              {userStatsLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : userStats && userStats.length > 0 ? (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="grid grid-cols-7 gap-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    <div>Foydalanuvchi</div>
                    <div>Faol Kunlar</div>
                    <div>Ko'rishlar</div>
                    <div>Coinlar</div>
                    <div>O'rtacha/Kun</div>
                    <div>O'rtacha/Ko'rish</div>
                    <div>Oxirgi Faollik</div>
                  </div>
                  {userStats?.slice(0, 50).map((user: any, index: number) => (
                    <div key={index} className="grid grid-cols-7 gap-4 text-center py-2 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
                      <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center justify-center">
                        <div>
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : user.username}
                        </div>
                      </div>
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">{user.active_days}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{user.total_views}</div>
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">{user.total_coins_earned}</div>
                      <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        {user.active_days > 0 ? Math.round(user.total_views / user.active_days) : 0}
                      </div>
                      <div className="text-sm text-pink-600 dark:text-pink-400 font-medium">
                        {user.total_views > 0 ? Math.round(user.total_coins_earned / user.total_views) : 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(user.last_active_date)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Hozircha foydalanuvchi statistikasi yo'q</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdsPage;