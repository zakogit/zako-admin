import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Coins, Tag, Clock } from 'lucide-react';
import { Table, Badge, Button, Modal, EmptyState } from '../../components/ui';
import { formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '../../api/client';

/**
 * Do'kon paketlari — app KO'RSATADIGAN jadval (product_packages, /orders/packages).
 * Har paket: coins (+bonus), narx, "Maxsus taklif" badge (offer_type) va VAQTLI
 * chegirma (discount_percent + oyna). Chegirma boshlanganda backend hamma
 * foydalanuvchiga push yuboradi.
 */
interface ProductPackage {
  id: number;
  name: string;
  description: string;
  product_type: string;
  price_som: number;
  package_data: { coins?: number; bonus?: number } | null;
  is_active: boolean;
  sort_order: number;
  offer_type: string;
  discount_percent: number;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
}

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

export default function StorePage() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState<ProductPackage | null>(null);

  const createForm = useForm<any>();
  const editForm = useForm<any>();

  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['store-packages'],
    queryFn: () => api.get('/admin/store-packages').then((r) => r.data),
  });
  // Bu sahifa faqat COIN to'plamlarini boshqaradi (premium /subscriptions'da,
  // cards /cards'da). product_type='coins' bo'lganlarini ko'rsatamiz.
  const packages: ProductPackage[] = (Array.isArray(packagesData?.data) ? packagesData.data : []).filter(
    (p: ProductPackage) => p.product_type === 'coins',
  );

  const buildBody = (d: any) => ({
    name: d.name,
    description: d.description,
    product_type: d.product_type || 'coins',
    price_som: Number(d.price_som),
    sort_order: Number(d.sort_order) || 0,
    is_active: String(d.is_active) === 'true',
    package_data: { coins: Number(d.coins) || 0, bonus: Number(d.bonus) || 0 },
    offer_type: d.offer_type || 'simple',
    discount_percent: Number(d.discount_percent) || 0,
    discount_starts_at: toISO(d.discount_starts_at),
    discount_ends_at: toISO(d.discount_ends_at),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/admin/store-packages', buildBody(d)).then((r) => r.data),
    onSuccess: () => {
      toast.success('Paket yaratildi');
      setCreateModal(false);
      createForm.reset();
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: (d: any) => api.put(`/admin/store-packages/${selected!.id}`, buildBody(d)).then((r) => r.data),
    onSuccess: () => {
      toast.success('Paket yangilandi');
      setEditModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Yangilashda xatolik'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/store-packages/${id}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Paket o‘chirildi');
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: () => toast.error('O‘chirishda xatolik'),
  });

  const openEdit = (p: ProductPackage) => {
    setSelected(p);
    editForm.reset({
      name: p.name,
      description: p.description,
      product_type: p.product_type,
      price_som: p.price_som,
      sort_order: p.sort_order,
      is_active: String(p.is_active),
      coins: p.package_data?.coins ?? 0,
      bonus: p.package_data?.bonus ?? 0,
      offer_type: p.offer_type || 'simple',
      discount_percent: p.discount_percent || 0,
      discount_starts_at: toLocalInput(p.discount_starts_at),
      discount_ends_at: toLocalInput(p.discount_ends_at),
    });
    setEditModal(true);
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

  // Offer/discount tahrirlash bloki (create/edit uchun umumiy)
  const OfferFields = ({ form }: { form: any }) => (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
        <Tag className="w-4 h-4" /> Maxsus taklif & chegirma
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Taklif turi</label>
          <select {...form.register('offer_type')} className={inputCls}>
            <option value="simple">Oddiy</option>
            <option value="special_offer">Maxsus taklif (badge)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Chegirma (%)</label>
          <input type="number" min={0} max={95} {...form.register('discount_percent', { valueAsNumber: true })} className={inputCls} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Chegirma boshlanishi</label>
          <input type="datetime-local" {...form.register('discount_starts_at')} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Bo‘sh = darhol</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Chegirma tugashi</label>
          <input type="datetime-local" {...form.register('discount_ends_at')} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Countdown shu vaqtga</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Chegirma % &gt; 0 va oyna faol bo‘lganda: narx arzonlashadi (ko‘rsatiladigan VA
        olinadigan summa) + barcha foydalanuvchilarga push yuboriladi.
      </p>
    </div>
  );

  const BasicFields = ({ form }: { form: any }) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Nomi *</label>
          <input {...form.register('name', { required: true })} className={inputCls} placeholder="500 Tanga" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Turi</label>
          <select {...form.register('product_type')} className={inputCls}>
            <option value="coins">coins</option>
            <option value="premium">premium</option>
            <option value="cards">cards</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Tavsif</label>
        <textarea {...form.register('description')} rows={2} className={inputCls} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Coins *</label>
          <input type="number" {...form.register('coins', { valueAsNumber: true })} className={inputCls} placeholder="500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Bonus</label>
          <input type="number" {...form.register('bonus', { valueAsNumber: true })} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Narx (so'm) *</label>
          <input type="number" {...form.register('price_som', { required: true, valueAsNumber: true })} className={inputCls} placeholder="7000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Tartib (sort)</label>
          <input type="number" {...form.register('sort_order', { valueAsNumber: true })} className={inputCls} defaultValue={0} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Holat</label>
          <select {...form.register('is_active')} className={inputCls}>
            <option value="true">Faol</option>
            <option value="false">Faol emas</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Do'kon paketlari</h1>
          <p className="text-gray-600 dark:text-gray-400">App ko'rsatadigan paketlar (product_packages) + Maxsus taklif/chegirma</p>
        </div>
        <Button onClick={() => { createForm.reset({ product_type: 'coins', is_active: 'true', offer_type: 'simple', discount_percent: 0 }); setCreateModal(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Paket qo'shish
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Yuklanmoqda...</div>
        ) : packages.length > 0 ? (
          <Table headers={['Paket', 'Coins', 'Narx (so\'m)', 'Taklif', 'Holat', '']}>
            {packages.map((pkg) => {
              const active = discountActive(pkg);
              const discounted = active ? Math.round((pkg.price_som * (100 - pkg.discount_percent)) / 100) : pkg.price_som;
              return (
                <tr key={pkg.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                        <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                        <div className="text-xs text-gray-500">{pkg.product_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {formatNumber(pkg.package_data?.coins ?? 0)}
                    {pkg.package_data?.bonus ? <span className="text-green-500 text-xs"> +{pkg.package_data.bonus}</span> : null}
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
                      {pkg.offer_type === 'special_offer' && <Badge color="purple">Maxsus taklif</Badge>}
                      {active && (
                        <Badge color="red">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />-{pkg.discount_percent}%</span>
                        </Badge>
                      )}
                      {pkg.offer_type !== 'special_offer' && !active && <span className="text-gray-400 text-sm">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={pkg.is_active ? 'green' : 'gray'}>{pkg.is_active ? 'Faol' : 'Faol emas'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => confirm('O‘chirilsinmi?') && deleteMutation.mutate(pkg.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState message="Paket yo'q. Birinchi paketni yarating." />
        )}
      </div>

      {/* Create */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Paket qo'shish" size="lg">
        <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <BasicFields form={createForm} />
          <OfferFields form={createForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>Bekor</Button>
            <Button type="submit" loading={createMutation.isPending}>Yaratish</Button>
          </div>
        </form>
      </Modal>

      {/* Edit */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title="Paketni tahrirlash" size="lg">
        <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
          <BasicFields form={editForm} />
          <OfferFields form={editForm} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>Bekor</Button>
            <Button type="submit" loading={updateMutation.isPending}>Saqlash</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
