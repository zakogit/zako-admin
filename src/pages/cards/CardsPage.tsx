import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, BarChart3 } from 'lucide-react';
import { cardsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, formatNumber, getStaticFileUrl } from '../../utils/helpers';
import type { CardType } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function CardsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CardType | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const limit = 20;

  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['admin-cards', page, search],
    queryFn: () => cardsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['cards-stats'],
    queryFn: () => cardsApi.getStats().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      toast.success('Card created successfully');
      setEditModal(false);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: () => toast.error('Failed to create card'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => cardsApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Card updated successfully');
      setEditModal(false);
      setSelected(null);
      reset();
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: () => toast.error('Failed to update card'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cardsApi.delete(id),
    onSuccess: () => {
      toast.success('Card deleted successfully');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-cards'] });
    },
    onError: () => toast.error('Failed to delete card'),
  });

  const cards: CardType[] = Array.isArray((cardsData as any)?.data?.data) ? (cardsData as any).data.data : [];
  const total: number = (cardsData as any)?.data?.total ?? 0;
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const openEditModal = (card?: CardType) => {
    setSelected(card || null);
    if (card) {
      setValue('name', card.name);
      setValue('description', card.description);
      setValue('effect_type', card.effect_type);
      setValue('effect_value', card.effect_value);
      setValue('price_coins', card.price_coins);
      setValue('duration_duels', card.duration_duels);
      setValue('gradient_start', card.gradient_start ?? '');
      setValue('gradient_end', card.gradient_end ?? '');
      setValue('border_color', card.border_color ?? '');
      setValue('is_active', card.is_active);
    } else {
      reset();
    }
    setEditModal(true);
  };

  const onSubmit = (data: any) => {
    if (selected) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Cards <span className="text-gray-400 font-normal text-base">({formatNumber(total)})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search cards..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <Button onClick={() => openEditModal()} className="whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : cards.length === 0 ? (
          <EmptyState message="No cards found" />
        ) : (
          <>
            <Table headers={['Card', 'Type', 'Effect', 'Price', 'Duration', 'Status', 'Created', '']}>
              {cards.map((card) => (
                <tr key={card.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {card.icon && (
                          <div className="relative group">
                            <img 
                              src={getStaticFileUrl(card.icon)} 
                              alt={`${card.name} icon`} 
                              className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Icon
                            </div>
                          </div>
                        )}
                        {card.image && (
                          <div className="relative group">
                            <img 
                              src={getStaticFileUrl(card.image)} 
                              alt={`${card.name} image`} 
                              className="w-8 h-8 rounded object-cover border border-gray-200 dark:border-gray-700"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Image
                            </div>
                          </div>
                        )}
                        {(card.gradient_start || card.border_color) && (
                          <div
                            className="w-8 h-8 rounded"
                            title="Card colors"
                            style={{
                              backgroundImage: card.gradient_start
                                ? `linear-gradient(to bottom right, ${card.gradient_start}, ${card.gradient_end || card.gradient_start})`
                                : undefined,
                              border: card.border_color
                                ? `1.5px solid ${card.border_color}`
                                : '1px solid rgb(229 231 235)',
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{card.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{card.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{card.effect_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {card.effect_value && (
                      <span className="text-sm">+{card.effect_value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{formatNumber(card.price_coins)} coins</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="purple">
                      {card.duration_duels} duels
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={card.is_active ? 'green' : 'red'}>
                      {card.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(card.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(card)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => { setSelected(card); setDeleteModal(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            <Pagination 
              page={page} 
              total={total} 
              limit={limit} 
              onChange={setPage} 
            />
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => { setEditModal(false); setSelected(null); }} title={selected ? 'Edit Card' : 'Create Card'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Card Name</label>
              <input 
                {...register('name', { required: 'Card name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{String(errors.name.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Effect Type</label>
              <select 
                {...register('effect_type', { required: 'Effect type is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Select Type</option>
                <option value="loss_reduction">Loss Reduction</option>
                <option value="loss_protection">Loss Protection</option>
                <option value="win_boost">Win Boost</option>
              </select>
              {errors.effect_type && <p className="text-red-500 text-xs mt-1">{String(errors.effect_type.message)}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea 
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Effect Value</label>
              <input 
                type="number"
                {...register('effect_value')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price (coins)</label>
              <input 
                type="number"
                {...register('price_coins', { required: 'Price is required', min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.price_coins && <p className="text-red-500 text-xs mt-1">{String(errors.price_coins.message)}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration (duels)</label>
              <input 
                type="number"
                {...register('duration_duels', { required: 'Duration is required', min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
              {errors.duration_duels && <p className="text-red-500 text-xs mt-1">{String(errors.duration_duels.message)}</p>}
            </div>
          </div>

          {/* Card colors — rendered as the gradient background + border in the
              mobile boost carousel. Leave blank to fall back to the default. */}
          <div>
            <label className="block text-sm font-medium mb-2">Card Colors</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ColorInput
                label="Gradient Start"
                name="gradient_start"
                value={watch('gradient_start')}
                register={register}
                setValue={setValue}
              />
              <ColorInput
                label="Gradient End"
                name="gradient_end"
                value={watch('gradient_end')}
                register={register}
                setValue={setValue}
              />
              <ColorInput
                label="Border Color"
                name="border_color"
                value={watch('border_color')}
                register={register}
                setValue={setValue}
              />
            </div>
            <CardColorPreview
              start={watch('gradient_start')}
              end={watch('gradient_end')}
              border={watch('border_color')}
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {selected ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Card">
        <div className="space-y-4">
          <p>Are you sure you want to delete this card? This action cannot be undone.</p>
          {selected && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-medium">{selected.name}</p>
              <p className="text-sm text-gray-500 truncate">{selected.description}</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Normalise any stored hex (`#RRGGBB`/`#AARRGGBB`/no-hash) to the 7-char form
 *  that `<input type="color">` requires; alpha is dropped for the picker. */
function toPickerHex(value?: string): string {
  if (!value) return '#000000';
  let s = value.trim().replace(/^#/, '');
  if (s.length === 8) s = s.slice(2); // #AARRGGBB -> RRGGBB
  return /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : '#000000';
}

/** A native colour picker paired with a free-text hex field (so the value can
 *  be cleared to fall back to the app default). Both edit the same RHF field. */
function ColorInput({ label, name, value, register, setValue }: {
  label: string;
  name: string;
  value?: string;
  register: any;
  setValue: any;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toPickerHex(value)}
          onChange={(e) => setValue(name, e.target.value, { shouldDirty: true })}
          className="w-10 h-9 shrink-0 rounded border border-gray-300 dark:border-gray-700 bg-transparent cursor-pointer p-0.5"
        />
        <input
          type="text"
          {...register(name)}
          placeholder="#RRGGBB"
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
        />
      </div>
    </div>
  );
}

/** Live preview of how the gradient + border render on the mobile card. */
function CardColorPreview({ start, end, border }: { start?: string; end?: string; border?: string }) {
  const s = start?.trim() || '#DE5D1E';
  const e = end?.trim() || '#A12C09';
  const b = border?.trim();
  return (
    <div
      className="mt-3 h-12 rounded-lg flex items-center px-3 text-white text-sm font-semibold"
      style={{
        backgroundImage: `linear-gradient(to right, ${s}, ${e})`,
        border: b ? `1.5px solid ${b}` : undefined,
      }}
    >
      Preview
    </div>
  );
}