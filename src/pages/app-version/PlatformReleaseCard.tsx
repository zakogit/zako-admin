import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Smartphone, Apple, AlertTriangle, CheckCircle2, Download, Send } from 'lucide-react';
import { Badge, Button, Card, Input } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';
import {
  appApi,
  type AppPlatform,
  type PlatformReleaseStatus,
  type PublishReleaseBody,
} from '../../api/services';
import { compareVersions, RELEASE_STATUS_KEY, VERSION_RE } from './versionUtils';

const PLATFORM_LABEL: Record<AppPlatform, string> = { android: 'Android', ios: 'iOS' };

interface Props {
  platform: AppPlatform;
  status: PlatformReleaseStatus;
  gateEnabled: boolean;
}

/**
 * One platform's release card: the live state (published version, required or
 * not, store version, device adoption) on top, and the one-step publish form
 * (version + "required" + send) below.
 */
export default function PlatformReleaseCard({ platform, status, gateEnabled }: Props) {
  const { t } = useTranslation('appVersion');
  const Icon = platform === 'ios' ? Apple : Smartphone;

  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-2">
        <Icon className={platform === 'ios' ? 'w-5 h-5 text-gray-400' : 'w-5 h-5 text-green-500'} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {PLATFORM_LABEL[platform]}
        </h2>
      </div>

      <ReleaseStatus platform={platform} status={status} gateEnabled={gateEnabled} />
      <AdoptionBar adoption={status.adoption} />

      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('publish.title')}
        </h3>
        <PublishForm platform={platform} status={status} />
      </div>
    </Card>
  );
}

function ReleaseStatus({ platform, status, gateEnabled }: Props) {
  const { t } = useTranslation('appVersion');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{t('status.current')}:</span>
        <span className="text-xl font-bold text-gray-900 dark:text-white">{status.latest}</span>
        {!gateEnabled ? (
          <Badge color="gray">{t('status.gateOff')}</Badge>
        ) : status.required ? (
          <Badge color="red">{t('status.required')}</Badge>
        ) : (
          <Badge color="blue">{t('status.optional')}</Badge>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {status.published_at && t('status.publishedAt', { date: formatDate(status.published_at) })}
        {status.published_by && ` · ${t('status.publishedBy', { name: status.published_by })}`}
        {gateEnabled && !status.required && ` · ${t('status.minNote', { min: status.min })}`}
      </p>

      {platform === 'ios' ? <AppStoreLine status={status} /> : (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('status.androidStoreNote')}</p>
      )}
    </div>
  );
}

function AppStoreLine({ status }: { status: PlatformReleaseStatus }) {
  const { t } = useTranslation('appVersion');

  if (!status.store) {
    return (
      <StatusLine tone="warn">
        {t('status.storeUnavailable', { error: status.store_error ?? '' })}
      </StatusLine>
    );
  }
  const diff = compareVersions(status.store.version, status.latest);
  const label = `${t('status.storeLabel')}: ${status.store.version}`;
  if (diff === 0) return <StatusLine tone="ok">{`${label} · ${t('status.storeMatch')}`}</StatusLine>;
  if (diff > 0) {
    return <StatusLine tone="warn">{t('status.storeAhead', { version: status.store.version })}</StatusLine>;
  }
  return <StatusLine tone="warn">{t('status.storeBehind', { version: status.store.version })}</StatusLine>;
}

function StatusLine({ tone, children }: { tone: 'ok' | 'warn'; children: ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle2 : AlertTriangle;
  const color = tone === 'ok'
    ? 'text-green-600 dark:text-green-400'
    : 'text-amber-600 dark:text-amber-400';
  return (
    <p className={`flex items-center gap-1.5 text-xs ${color}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {children}
    </p>
  );
}

function AdoptionBar({ adoption }: { adoption: PlatformReleaseStatus['adoption'] }) {
  const { t } = useTranslation('appVersion');
  const { total, on_latest, below_min, buckets, window_days } = adoption;
  const outdated = Math.max(total - on_latest - below_min, 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const segments = [
    { key: 'onLatest', value: on_latest, bar: 'bg-green-500', dot: 'bg-green-500' },
    { key: 'outdated', value: outdated, bar: 'bg-amber-400', dot: 'bg-amber-400' },
    { key: 'blocked', value: below_min, bar: 'bg-red-500', dot: 'bg-red-500' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{t('adoption.title', { days: window_days })}</span>
        <span>{t('adoption.devices', { n: formatNumber(total) })}</span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('adoption.empty')}</p>
      ) : (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            {segments.map((s) =>
              s.value > 0 ? (
                <div key={s.key} className={s.bar} style={{ width: `${(s.value / total) * 100}%` }} />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
            {segments.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {t(`adoption.${s.key}`)}: {pct(s.value)}%
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {buckets.slice(0, 6).map((b) => (
              <Badge key={b.version} color="gray" size="sm">
                {b.version} · {pct(b.count)}%
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PublishForm({ platform, status }: { platform: AppPlatform; status: PlatformReleaseStatus }) {
  const { t } = useTranslation('appVersion');
  const qc = useQueryClient();
  const [version, setVersion] = useState('');
  const [required, setRequired] = useState(true);

  const lookup = useMutation({
    mutationFn: () => appApi.lookupAppStore().then((r) => r.data.data),
    onSuccess: (store) => setVersion(store.version),
    onError: (e: any) => toast.error(e?.response?.data?.message || t('toast.lookupError')),
  });

  const publish = useMutation({
    mutationFn: (body: PublishReleaseBody) => appApi.publishRelease(body).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(t('publish.success'));
      qc.setQueryData(RELEASE_STATUS_KEY, res.data);
      setVersion('');
    },
    onError: (e: any, body) => {
      const data = e?.response?.data;
      // The App Store still serves an older build: let the admin override
      // knowingly instead of silently locking users out.
      if (data?.code === 'STORE_BEHIND' || data?.code === 'STORE_CHECK_FAILED') {
        if (window.confirm(t('publish.confirmStoreBehind', { message: data.message }))) {
          publish.mutate({ ...body, skip_store_check: true });
        }
        return;
      }
      toast.error(data?.message || t('toast.publishError'));
    },
  });

  const trimmed = version.trim();
  const valid = VERSION_RE.test(trimmed);

  const submit = () => {
    const vars = { platform: PLATFORM_LABEL[platform], version: trimmed };
    const question = required ? t('publish.confirmRequired', vars) : t('publish.confirmOptional', vars);
    if (window.confirm(question)) publish.mutate({ platform, version: trimmed, required });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Input
            label={t('publish.version')}
            placeholder={status.latest || '1.2.0'}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            error={trimmed && !valid ? t('publish.invalidVersion') : undefined}
          />
        </div>
        {platform === 'ios' && (
          <Button
            type="button"
            variant="outline"
            loading={lookup.isPending}
            onClick={() => lookup.mutate()}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('publish.fetchFromStore')}
          </Button>
        )}
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900 dark:text-white">
            {t('publish.required')}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {required ? t('publish.requiredHint') : t('publish.optionalHint')}
          </span>
        </span>
      </label>

      {platform === 'android' && required && (
        <StatusLine tone="warn">{t('publish.androidWarning')}</StatusLine>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant={required ? 'danger' : 'primary'}
          disabled={!valid}
          loading={publish.isPending}
          onClick={submit}
          className="flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {t('publish.submit')}
        </Button>
      </div>
    </div>
  );
}
