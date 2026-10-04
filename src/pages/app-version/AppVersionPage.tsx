import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Smartphone, Apple, AlertTriangle, Save } from 'lucide-react';
import { Button, Input, Card, Spinner } from '../../components/ui';
import { appApi, type AppVersionConfig } from '../../api/services';

/**
 * Force-update gate configuration. Mirrors the public mobile contract
 * (`GET /api/v1/app/version`): the app compares its build version against
 * `min_version_*` on launch and, when `force_update_enabled` is on and the
 * build is below the minimum, shows a blocking "update required" dialog
 * pointing at the store URL. `latest_version_*` drives a soft "update
 * available" hint. Saved via `PUT /api/v1/admin/app/version` (partial allowed).
 */
export default function AppVersionPage() {
  const { t } = useTranslation('appVersion');
  const qc = useQueryClient();
  const { register, handleSubmit, reset, watch } = useForm<AppVersionConfig>();

  const { data, isLoading } = useQuery({
    queryKey: ['app-version-config'],
    queryFn: () => appApi.getVersionConfig().then((r) => r.data.data),
  });

  // Populate the form once the config loads.
  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const saveMutation = useMutation({
    mutationFn: (body: AppVersionConfig) =>
      appApi.updateVersionConfig(body).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common:toast.saved'));
      qc.invalidateQueries({ queryKey: ['app-version-config'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || t('toast.saveError')),
  });

  const forceEnabled = watch('force_update_enabled');
  const minAndroid = watch('min_version_android');
  const latestAndroid = watch('latest_version_android');
  const minIos = watch('min_version_ios');
  const latestIos = watch('latest_version_ios');
  const iosStore = watch('store_url_ios');

  // The gate is inert when min == latest (nobody is below the minimum).
  const androidInert = forceEnabled && !!minAndroid && minAndroid === latestAndroid;
  const iosInert = forceEnabled && !!minIos && minIos === latestIos;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
        {/* Global toggle + message */}
        <Card className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('force_update_enabled')}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                {t('enable.title')}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t('enable.hint')}
              </span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('message.label')}
            </label>
            <textarea
              {...register('update_message')}
              rows={2}
              placeholder={t('message.placeholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </Card>

        {/* Android */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Android
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('fields.minVersion')}
              placeholder="1.2.0"
              {...register('min_version_android')}
            />
            <Input
              label={t('fields.latestVersion')}
              placeholder="1.2.0"
              {...register('latest_version_android')}
            />
          </div>
          <Input
            label={t('fields.storeUrlAndroid')}
            placeholder="https://play.google.com/store/apps/details?id=uz.zako.app"
            {...register('store_url_android')}
          />
          {androidInert && (
            <InertWarning />
          )}
        </Card>

        {/* iOS */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              iOS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('fields.minVersion')}
              placeholder="1.2.0"
              {...register('min_version_ios')}
            />
            <Input
              label={t('fields.latestVersion')}
              placeholder="1.2.0"
              {...register('latest_version_ios')}
            />
          </div>
          <Input
            label={t('fields.storeUrlIos')}
            placeholder="https://apps.apple.com/app/id..."
            {...register('store_url_ios')}
          />
          {forceEnabled && !iosStore && (
            <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {t('warnings.iosStoreEmpty')}
            </p>
          )}
          {iosInert && <InertWarning />}
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={saveMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('common:actions.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Shown when min == latest, so the force-update gate never actually fires. */
function InertWarning() {
  const { t } = useTranslation('appVersion');
  return (
    <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      {t('warnings.inert')}
    </p>
  );
}
