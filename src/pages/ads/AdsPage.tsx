import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adsApi } from '../../api/services';
import { Settings, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('ads');
  const [activeTab, setActiveTab] = useState<'settings'>('settings');
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'ios'>('android');
  const [editingSettings, setEditingSettings] = useState<Partial<AdsSettings>>({});
  const queryClient = useQueryClient();

  // Fetch ads settings
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['ads-settings'],
    queryFn: adsApi.getSettings,
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
  const handleSettingUpdate = (key: keyof AdsSettings, value: any) => {
    updateSettingMutation.mutate({ 
      key, 
      value: typeof value === 'boolean' ? value.toString() : value.toString()
    });
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('mobileIntegration')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'settings', label: t('tabs.settings'), icon: Settings },
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{t('settings.title')}</h3>
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
                        {t('settings.dailyLimit')}
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
                          {updateSettingMutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings.coinsPerAd')}
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
                          {updateSettingMutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.adsEnabled')}</span>
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
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.testMode')}</span>
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
                        {t('settings.admobAppId', { platform: selectedPlatform === 'android' ? 'Android' : 'iOS' })}
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
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" // i18n-ignore (AdMob ID format)
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
                          {updateSettingMutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('settings.rewardedUnitId', { platform: selectedPlatform === 'android' ? 'Android' : 'iOS' })}
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
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" // i18n-ignore (AdMob ID format)
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
                          {updateSettingMutation.isPending ? t('common:actions.saving') : t('common:actions.save')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('errors.loadSettings')}</p>
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