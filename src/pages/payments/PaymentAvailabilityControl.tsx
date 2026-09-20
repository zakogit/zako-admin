import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
          ? 'Saqlanmoqda…'
          : enabled === undefined
            ? 'Yuklanmoqda…'
            : enabled
              ? 'Yoqilgan — o‘chirish'
              : 'O‘chirilgan — yoqish'}
      </button>
    </div>
  );
}

export function PaymentAvailabilityControl() {
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
      toast.success('To‘lov sozlamasi saqlandi');
    },
    onError: () => toast.error('Sozlamani saqlab bo‘lmadi'),
  });

  const paymentsEnabled = config.data?.payments_enabled;
  const appleEnabled = config.data?.apple_iap_enabled;
  const busy = update.isPending || config.isFetching;

  if (config.isError) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4">
          <p role="alert" className="text-sm text-red-600">To‘lov holatini yuklab bo‘lmadi.</p>
          <Button onClick={() => void config.refetch()}>Qayta yuklash</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="font-semibold text-gray-900 dark:text-white">Mobile to‘lovlari</h2>

      <ToggleRow
        title="Barcha to‘lovlar (bosh kalit)"
        ariaLabel="Mobile to‘lovlarini yoqish"
        enabled={paymentsEnabled}
        disabled={paymentsEnabled === undefined || busy}
        pending={update.isPending}
        onToggle={() => update.mutate({ payments_enabled: !paymentsEnabled })}
        description={
          <>
            <p>
              Tanga, olmos va Premium xaridlarini <strong>barcha platformalarda</strong> boshqaradi.
              O‘chirilganda xarid tugmalari yashiriladi va to‘lov sahifalari yopiladi.
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Yangi buyurtmalar bloklanadi; ochiq ilovada holat har 30 soniyada tekshiriladi.
              Boshlangan to‘lovlar, kvitansiya tekshiruvi va bepul mukofotlar ishlashda davom etadi.
            </p>
          </>
        }
      />

      <div className="border-t border-gray-200 pt-5 dark:border-gray-700">
        <ToggleRow
          title="App Store do‘koni (faqat iOS)"
          ariaLabel="iOS App Store do‘konini yoqish"
          enabled={appleEnabled}
          // Bosh kalit o'chiq bo'lsa iOS baribir yopiq — tugma chalg'itmasin.
          disabled={appleEnabled === undefined || busy || paymentsEnabled === false}
          pending={update.isPending}
          onToggle={() => update.mutate({ apple_iap_enabled: !appleEnabled })}
          description={
            <>
              <p>
                O‘chirilganda <strong>iOS’da pul do‘koni butunlay yashiriladi</strong>.
                Android’dagi Payme/Click savdosi ishlayveradi — ya’ni App Store tomonidagi
                muammo (StoreKit uzilishi, mahsulot sozlanmagani) Android’ni to‘xtatmaydi.
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                iOS hech qachon Payme/Click’ga o‘tmaydi: App Store Review 3.1.1 raqamli
                valyutani faqat Apple IAP orqali sotishga ruxsat beradi.
              </p>
              {paymentsEnabled === false && (
                <p className="text-amber-600 dark:text-amber-400">
                  Bosh kalit o‘chiq — iOS baribir yopiq.
                </p>
              )}
            </>
          }
        />
      </div>
    </section>
  );
}
