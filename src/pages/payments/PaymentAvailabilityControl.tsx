import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { paymentsApi, type PaymentConfig } from '../../api/services';
import { Button } from '../../components/ui';

interface ToggleRowProps {
  title: string;
  description: React.ReactNode;
  enabled: boolean | undefined;
  disabled: boolean;
  ariaLabel: string;
  onToggle: () => void;
  pending: boolean;
}

/** Ikkala kalit ham bir xil ko'rinadi — belgilash faqat shu yerda yoziladi. */
function ToggleRow({ title, description, enabled, disabled, ariaLabel, onToggle, pending }: ToggleRowProps) {
  const { t } = useTranslation('payments');
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={ariaLabel}
        aria-checked={enabled === true}
        disabled={disabled}
        onClick={onToggle}
        className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending
          ? t('common:actions.saving')
          : enabled === undefined
            ? t('common:state.loading')
            : enabled
              ? t('availability.toggle.enabledAction')
              : t('availability.toggle.disabledAction')}
      </button>
    </div>
  );
}

export function PaymentAvailabilityControl() {
  const { t } = useTranslation('payments');
  const queryClient = useQueryClient();
  const queryKey = ['payment-availability'];
  const config = useQuery({
    queryKey,
    queryFn: () => paymentsApi.getConfig().then(response => response.data.data),
    refetchInterval: 30_000,
  });
  const update = useMutation({
    mutationFn: (changes: Partial<PaymentConfig>) => paymentsApi.updateConfig(changes),
    onSuccess: response => {
      queryClient.setQueryData(queryKey, response.data.data);
      void queryClient.invalidateQueries({ queryKey });
      toast.success(t('availability.toast.saved'));
    },
    onError: () => toast.error(t('availability.toast.failed')),
  });

  const paymentsEnabled = config.data?.payments_enabled;
  const appleEnabled = config.data?.apple_iap_enabled;
  const busy = update.isPending || config.isFetching;

  if (config.isError) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4">
          <p role="alert" className="text-sm text-red-600">{t('availability.loadError')}</p>
          <Button onClick={() => void config.refetch()}>{t('common:actions.refresh')}</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="font-semibold text-gray-900 dark:text-white">{t('availability.title')}</h2>

      <ToggleRow
        title={t('availability.master.title')}
        ariaLabel={t('availability.master.aria')}
        enabled={paymentsEnabled}
        disabled={paymentsEnabled === undefined || busy}
        pending={update.isPending}
        onToggle={() => update.mutate({ payments_enabled: !paymentsEnabled })}
        description={
          <>
            <p>
              <Trans i18nKey="payments:availability.master.description" components={{ strong: <strong /> }} />
            </p>
            <p className="text-gray-500 dark:text-gray-400">{t('availability.master.note')}</p>
          </>
        }
      />

      <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
        <ToggleRow
          title={t('availability.ios.title')}
          ariaLabel={t('availability.ios.aria')}
          enabled={appleEnabled}
          // Bosh kalit o'chiq bo'lsa iOS baribir yopiq — tugma chalg'itmasin.
          disabled={appleEnabled === undefined || busy || paymentsEnabled === false}
          pending={update.isPending}
          onToggle={() => update.mutate({ apple_iap_enabled: !appleEnabled })}
          description={
            <>
              <p>
                <Trans i18nKey="payments:availability.ios.description" components={{ strong: <strong /> }} />
              </p>
              <p className="text-gray-500 dark:text-gray-400">{t('availability.ios.note')}</p>
              {paymentsEnabled === false && (
                <p className="text-amber-600 dark:text-amber-400">{t('availability.ios.masterOff')}</p>
              )}
            </>
          }
        />
      </div>
    </section>
  );
}
