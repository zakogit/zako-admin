import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button, Spinner } from '../../components/ui';
import { appApi } from '../../api/services';
import PlatformReleaseCard from './PlatformReleaseCard';
import { RELEASE_STATUS_KEY } from './versionUtils';
import AdvancedSettingsCard from './AdvancedSettingsCard';

/**
 * App releases. Per platform: the live state (published version, required or
 * optional, App Store version for iOS, how active devices are spread across
 * versions) and a one-step publish form — type the version, tick "required",
 * send. Mobile reads the result from the public `GET /api/v1/app/version`:
 * builds below a required version get a blocking update dialog, builds below
 * an optional one get a dismissible "new version available" dialog.
 */
export default function AppVersionPage() {
  const { t } = useTranslation('appVersion');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: RELEASE_STATUS_KEY,
    queryFn: () => appApi.getReleaseStatus().then((r) => r.data.data),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={isFetching}
          onClick={() => refetch()}
          className="flex items-center gap-2"
        >
          {!isFetching && <RefreshCw className="w-4 h-4" />}
          {t('common:actions.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PlatformReleaseCard
          platform="ios"
          status={data.platforms.ios}
          gateEnabled={data.force_update_enabled}
        />
        <PlatformReleaseCard
          platform="android"
          status={data.platforms.android}
          gateEnabled={data.force_update_enabled}
        />
      </div>

      <AdvancedSettingsCard />
    </div>
  );
}
