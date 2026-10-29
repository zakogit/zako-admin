import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, Save } from 'lucide-react';
import { Button, Card, Input } from '../../components/ui';
import { appApi, type AppVersionConfig } from '../../api/services';
import { RELEASE_STATUS_KEY } from './versionUtils';

type SettingsForm = Pick<
  AppVersionConfig,
  'force_update_enabled' | 'update_message' | 'store_url_android' | 'store_url_ios'
>;

/**
 * Rarely-touched knobs, collapsed by default: the shared update message, the
 * store links, and the force-update kill switch. Versions are deliberately not
 * editable here — they only change through the publish form, so `min` and
 * `latest` can't drift apart by hand. Saved via `PUT /admin/app/version`.
 */
export default function AdvancedSettingsCard() {
  const { t } = useTranslation('appVersion');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<SettingsForm>();

  const { data } = useQuery({
    queryKey: ['app-version-config'],
    queryFn: () => appApi.getVersionConfig().then((r) => r.data.data),
  });

  useEffect(() => {
    if (data) {
      reset({
        force_update_enabled: data.force_update_enabled,
        update_message: data.update_message,
        store_url_android: data.store_url_android,
        store_url_ios: data.store_url_ios,
      });
    }
  }, [data, reset]);

  const save = useMutation({
    mutationFn: (body: SettingsForm) => appApi.updateVersionConfig(body).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('common:toast.saved'));
      qc.invalidateQueries({ queryKey: ['app-version-config'] });
      qc.invalidateQueries({ queryKey: RELEASE_STATUS_KEY });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.saveError')),
  });

  const iosStore = watch('store_url_ios');

  return (
    <Card className="space-y-4 p-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h2>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
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
                {t('enable.hint')} {t('settings.killSwitchHint')}
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

          <Input
            label={t('fields.storeUrlAndroid')}
            placeholder="https://play.google.com/store/apps/details?id=uz.zako.app"
            {...register('store_url_android')}
          />
          <Input
            label={t('fields.storeUrlIos')}
            placeholder="https://apps.apple.com/app/id..."
            {...register('store_url_ios')}
          />
          {!iosStore && (
            <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {t('warnings.iosStoreEmpty')}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t('common:actions.save')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
