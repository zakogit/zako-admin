import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Coins, Gem, Tag, Clock, Apple } from 'lucide-react';
import { Table, Badge, Button, Modal, EmptyState } from '../../components/ui';
import { formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { storeApi } from '../../api/services';
import type { ProductPackage, ProductPackageInput } from '../../types';

/**
 * Do'kon paketlari — app KO'RSATADIGAN jadval (product_packages, /orders/packages).
 * Ikki tab: Tanga (coins, +bonus) va Olmos (diamonds). Har paket: miqdor, narx,
 * tartib, Apple IAP ID, "Maxsus taklif" badge (offer_type) va VAQTLI chegirma
 * (discount_percent + oyna). Chegirma boshlanganda backend hamma foydalanuvchiga
 * push yuboradi. Premium /subscriptions'da, kartalar /cards'da boshqariladi.
 */

type StoreTab = 'coins' | 'diamonds';

// Matnlar (tab nomi, placeholder) `store:tabs.*` / `store:form.*` dan olinadi — bu yerda faqat tuzilma.
interface TabConfig {
  icon: typeof Coins;
  iconBg: string;
  hasBonus: boolean;
  applePlaceholder: string;
}

const TABS: Record<StoreTab, TabConfig> = {
  coins: {
    icon: Coins,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    hasBonus: true,
    applePlaceholder: 'uz.zako.mobile.coins.500',
  },
  diamonds: {
    icon: Gem,
    iconBg: 'bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-400',
    hasBonus: false,
    applePlaceholder: 'uz.zako.mobile.diamonds.50',
  },
};

interface PackageForm {
  name: string;
  description: string;
  amount: number;
  bonus: number;
  price_som: number;
  sort_order: number;
  is_active: string;
  apple_product_id: string;
  offer_type: ProductPackage['offer_type'];
  discount_percent: number;
  discount_starts_at: string;
  discount_ends_at: string;
}

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
const labelCls = 'block text-sm font-medium mb-1 text-gray-900 dark:text-white';

// ISO → <input type="datetime-local"> qiymati (mahalliy vaqt)
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// datetime-local → ISO (yoki null)
function toISO(local: string | undefined): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Chegirma hozir faolmi?
function discountActive(p: ProductPackage): boolean {
  const pct = Number(p.discount_percent) || 0;
  if (pct <= 0 || pct >= 100) return false;
  const now = Date.now();
  if (p.discount_starts_at && now < new Date(p.discount_starts_at).getTime()) return false;
  if (p.discount_ends_at && now >= new Date(p.discount_ends_at).getTime()) return false;
  return true;
}

function packageAmount(p: ProductPackage, tab: StoreTab): number {
  return (tab === 'diamonds' ? p.package_data?.diamonds : p.package_data?.coins) ?? 0;
}

const emptyForm = (): PackageForm => ({
  name: '',
  description: '',
  amount: 0,
  bonus: 0,
  price_som: 0,
  sort_order: 0,
  is_active: 'true',
  apple_product_id: '',
  offer_type: 'simple',
  discount_percent: 0,
  discount_starts_at: '',
  discount_ends_at: '',
});

const formFromPackage = (p: ProductPackage, tab: StoreTab): PackageForm => ({
  name: p.name,
  description: p.description ?? '',
  amount: packageAmount(p, tab),
  bonus: p.package_data?.bonus ?? 0,
  price_som: p.price_som,
  sort_order: p.sort_order ?? 0,
  is_active: String(p.is_active),
  apple_product_id: p.apple_product_id ?? '',
  offer_type: p.offer_type || 'simple',
  discount_percent: p.discount_percent || 0,
  discount_starts_at: toLocalInput(p.discount_starts_at),
  discount_ends_at: toLocalInput(p.discount_ends_at),
});

// Faqat shu turning miqdor kalitlari yuboriladi; backend boshqa kalitlarni
// saqlab qoladi va tur bo'yicha tekshiradi (olmos paketida `diamonds` majburiy).
function buildBody(d: PackageForm, tab: StoreTab): ProductPackageInput {
  const package_data =
    tab === 'diamonds'
      ? { diamonds: Number(d.amount) || 0 }
      : { coins: Number(d.amount) || 0, bonus: Number(d.bonus) || 0 };
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    product_type: tab,
    price_som: Number(d.price_som),
    sort_order: Number(d.sort_order) || 0,
    is_active: d.is_active === 'true',
    package_data,
    apple_product_id: d.apple_product_id.trim() || null,
    offer_type: d.offer_type || 'simple',
    discount_percent: Number(d.discount_percent) || 0,
    discount_starts_at: toISO(d.discount_starts_at),
    discount_ends_at: toISO(d.discount_ends_at),
  };
}

function BasicFields({ form, tab }: { form: UseFormReturn<PackageForm>; tab: StoreTab }) {
  const { t } = useTranslation('store');
  const cfg = TABS[tab];
  return (
    <>
      <div>
        <label className={labelCls}>{t('form.name')}</label>
        <input {...form.register('name', { required: true })} className={inputCls} placeholder={t(`form.namePlaceholder.${tab}`)} />
      </div>
      <div>
        <label className={labelCls}>{t('common:table.description')}</label>
        <textarea {...form.register('description')} rows={2} className={inputCls} />
      </div>
      <div className={`grid gap-4 ${cfg.hasBonus ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div>
          <label className={labelCls}>{t(`form.amount.${tab}`)}</label>
          <input type="number" min={1} {...form.register('amount', { required: true, valueAsNumber: true, min: 1 })} className={inputCls} />
        </div>
        {cfg.hasBonus && (
          <div>
            <label className={labelCls}>{t('form.bonus')}</label>
            <input type="number" min={0} {...form.register('bonus', { valueAsNumber: true, min: 0 })} className={inputCls} />
          </div>
        )}
        <div>
          <label className={labelCls}>{t('form.price')}</label>
          <input type="number" min={1} {...form.register('price_som', { required: true, valueAsNumber: true, min: 1 })} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('form.sortOrder')}</label>
          <input type="number" min={0} {...form.register('sort_order', { valueAsNumber: true, min: 0 })} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('form.sortHint')}</p>
        </div>
        <div>
          <label className={labelCls}>{t('common:table.status')}</label>
          <select {...form.register('is_active')} className={inputCls}>
            <option value="true">{t('common:status.active')}</option>
            <option value="false">{t('common:status.inactive')}</option>
          </select>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
        <label className={`${labelCls} flex items-center gap-2`}><Apple className="w-4 h-4" /> {t('form.appleProductId')}</label>
        <input {...form.register('apple_product_id')} className={`${inputCls} font-mono text-sm`} placeholder={cfg.applePlaceholder} />
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('form.appleHint')}</p>
      </div>
    </>
  );
}

// Offer/discount tahrirlash bloki (create/edit uchun umumiy)
function OfferFields({ form }: { form: UseFormReturn<PackageForm> }) {
  const { t } = useTranslation('store');
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <Tag className="w-4 h-4" /> {t('offer.title')}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('offer.type')}</label>
          <select {...form.register('offer_type')} className={inputCls}>
            <option value="simple">{t('offer.simple')}</option>
            <option value="special_offer">{t('offer.special')}</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('offer.discountPercent')}</label>
          <input type="number" min={0} max={95} {...form.register('discount_percent', { valueAsNumber: true, min: 0, max: 95 })} className={inputCls} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t('offer.startsAt')}</label>
          <input type="datetime-local" {...form.register('discount_starts_at')} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('offer.startsHint')}</p>
        </div>
        <div>
          <label className={labelCls}>{t('offer.endsAt')}</label>
          <input type="datetime-local" {...form.register('discount_ends_at')} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">{t('offer.endsHint')}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('offer.note')}</p>
    </div>
  );
}

export default function StorePage() {
  const { t } = useTranslation('store');
  const qc = useQueryClient();
  const [tab, setTab] = useState<StoreTab>('coins');
  const [createModal, setCreateModal] = useState(false);
  const [selected, setSelected] = useState<ProductPackage | null>(null);

  const createForm = useForm<PackageForm>({ defaultValues: emptyForm() });
  const editForm = useForm<PackageForm>();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['store-packages'],
    queryFn: () => storeApi.getPackages().then((r) => r.data),
  });
  const allPackages: ProductPackage[] = Array.isArray(packagesData?.data) ? packagesData.data : [];
  const packages = allPackages
    .filter((p) => p.product_type === tab)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_som - b.price_som);
  const countOf = (tb: StoreTab) => allPackages.filter((p) => p.product_type === tb).length;

  const onError = (fallback: string) => (e: AxiosError<{ message?: string }>) =>
    toast.error(e.response?.data?.message || fallback);

  const createMutation = useMutation({
    mutationFn: (d: PackageForm) => storeApi.createPackage(buildBody(d, tab)).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('toast.created'));
      setCreateModal(false);
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: onError(t('toast.createFailed')),
  });

  const updateMutation = useMutation({
    mutationFn: (d: PackageForm) => storeApi.updatePackage(selected!.id, buildBody(d, selected!.product_type as StoreTab)).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('toast.updated'));
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: onError(t('toast.updateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeApi.deletePackage(id).then((r) => r.data),
    onSuccess: () => {
      toast.success(t('toast.deactivated'));
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: onError(t('toast.deleteFailed')),
  });

  const openCreate = () => {
    createForm.reset(emptyForm());
    setCreateModal(true);
  };

  const openEdit = (p: ProductPackage) => {
    setSelected(p);
    editForm.reset(formFromPackage(p, tab));
  };

  const cfg = TABS[tab];
  const Icon = cfg.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t(`addPackage.${tab}`)}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(Object.keys(TABS) as StoreTab[]).map((tb) => {
          const TabIcon = TABS[tb].icon;
          const isActive = tb === tab;
          return (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <TabIcon className="w-4 h-4" /> {t(`tabs.${tb}`)}
              <span className="text-xs text-gray-400">({countOf(tb)})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : packages.length > 0 ? (
          <Table headers={['#', t('table.package'), t(`tabs.${tab}`), t('table.price'), t('table.offer'), 'iOS', t('common:table.status'), '']}>
            {packages.map((pkg) => {
              const active = discountActive(pkg);
              const discounted = active ? Math.round((pkg.price_som * (100 - pkg.discount_percent)) / 100) : pkg.price_som;
              return (
                <tr key={pkg.id} className={pkg.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3 text-gray-500 text-sm">{pkg.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                        {pkg.description && <div className="text-xs text-gray-500">{pkg.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {formatNumber(packageAmount(pkg, tab))}
                    {cfg.hasBonus && pkg.package_data?.bonus ? (
                      <span className="text-green-500 text-xs"> +{pkg.package_data.bonus}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {active ? (
                      <div className="flex items-center gap-2">
                        <span className="line-through text-gray-400 text-sm">{formatNumber(pkg.price_som)}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(discounted)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-900 dark:text-white">{formatNumber(pkg.price_som)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pkg.offer_type === 'special_offer' && <Badge color="purple">{t('badge.specialOffer')}</Badge>}
                      {active && (
                        <Badge color="red">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />-{pkg.discount_percent}%</span>
                        </Badge>
                      )}
                      {pkg.offer_type !== 'special_offer' && !active && <span className="text-gray-400 text-sm">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {pkg.apple_product_id ? (
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300" title={pkg.apple_product_id}>
                        {pkg.apple_product_id}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={pkg.is_active ? 'green' : 'gray'}>{pkg.is_active ? t('common:status.active') : t('common:status.inactive')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}><Edit2 className="w-4 h-4" /></Button>
                      {pkg.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirm(t('confirm.deactivate')) && deleteMutation.mutate(pkg.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState message={t(`empty.${tab}`)} />
        )}
      </div>

      {/* Create */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title={t(`addPackage.${tab}`)} size="lg">
        <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <BasicFields form={createForm} tab={tab} />
          <OfferFields form={createForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={createMutation.isPending}>{t('common:actions.create')}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={t(`editPackage.${tab}`)} size="lg">
        <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <BasicFields form={editForm} tab={tab} />
          <OfferFields form={editForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>{t('common:actions.cancel')}</Button>
            <Button type="submit" loading={updateMutation.isPending}>{t('common:actions.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
