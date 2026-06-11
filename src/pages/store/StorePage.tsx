import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Coins, DollarSign, Eye } from 'lucide-react';
import { Table, Badge, Button, Modal, EmptyState } from '../../components/ui';
import { formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import api from '../../api/client';

interface CoinPackage {
  id: number;
  coin_amount: number;
  price_sum: number;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  purchase_count?: number;
  total_revenue?: number;
}

export default function StorePage() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [ordersModal, setOrdersModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);

  const createForm = useForm();
  const editForm = useForm();

  // Queries
  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['coin-packages'],
    queryFn: () => api.get('/admin/coin-packages').then(r => r.data)
  });


  const { data: packageOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['package-orders', selectedPackage?.id],
    queryFn: () => selectedPackage ? api.get(`/admin/coin-packages/${selectedPackage.id}/orders`).then(r => r.data) : null,
    enabled: !!selectedPackage && ordersModal
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/admin/coin-packages', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Coin paketi muvaffaqiyatli yaratildi');
      setCreateModal(false);
      createForm.reset();
      qc.invalidateQueries({ queryKey: ['coin-packages'] });
    },
    onError: () => toast.error('Coin paketi yaratishda xatolik')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/admin/coin-packages/${id}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('Coin paketi yangilandi');
      setEditModal(false);
      editForm.reset();
      setSelectedPackage(null);
      qc.invalidateQueries({ queryKey: ['coin-packages'] });
    },
    onError: () => toast.error('Coin paketi yangilashda xatolik')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/coin-packages/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Coin paketi o\'chirildi');
      qc.invalidateQueries({ queryKey: ['coin-packages'] });
    },
    onError: () => toast.error('Coin paketi o\'chirishda xatolik')
  });

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleEdit = (packageItem: CoinPackage) => {
    setSelectedPackage(packageItem);
    editForm.reset(packageItem);
    setEditModal(true);
  };

  const handleUpdate = (data: any) => {
    if (selectedPackage) {
      updateMutation.mutate({ id: selectedPackage.id, ...data });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this package?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewOrders = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
    setOrdersModal(true);
  };


  const packages: CoinPackage[] = Array.isArray(packagesData?.data) ? packagesData.data : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Coin Packages
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage coin packages for purchase
          </p>
        </div>
        
        <Button onClick={() => setCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Coin Package
        </Button>
      </div>

      {/* Coin Packages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading coin packages...</div>
        ) : packages.length > 0 ? (
          <Table headers={['Package', 'Coin Amount', 'Price (so\'m)', 'Status', 'Actions']}>
            {packages.map((pkg: CoinPackage) => (
              <tr key={pkg.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                      <div className="text-sm text-gray-500">{pkg.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-900 dark:text-white font-medium">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    {formatNumber(pkg.coin_amount)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                    <DollarSign className="w-4 h-4" />
                    {formatNumber(pkg.price_sum)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge color={pkg.is_active ? 'green' : 'gray'}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewOrders(pkg)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(pkg)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pkg.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState message="No coin packages found. Create your first coin package to get started." />
        )}
      </div>

      {/* Create Coin Package Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Coin Package">
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Package Name *</label>
              <input 
                {...createForm.register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 500 Tanga"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Coin Amount *</label>
              <input 
                {...createForm.register('coin_amount', { required: 'Coin amount is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Description</label>
            <textarea 
              {...createForm.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Package description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Price (so'm) *</label>
              <input 
                {...createForm.register('price_sum', { required: 'Price is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="7000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Sort Order</label>
              <input 
                {...createForm.register('sort_order', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="1"
                defaultValue={0}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Status</label>
            <select 
              {...createForm.register('is_active')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Coin Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Coin Package Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Coin Package">
        <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Package Name *</label>
              <input 
                {...editForm.register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Coin Amount *</label>
              <input 
                {...editForm.register('coin_amount', { required: 'Coin amount is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Description</label>
            <textarea 
              {...editForm.register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Price (so'm) *</label>
              <input 
                {...editForm.register('price_sum', { required: 'Price is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Sort Order</label>
              <input 
                {...editForm.register('sort_order', { valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Status</label>
            <select 
              {...editForm.register('is_active')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Update Coin Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Package Orders Modal */}
      <Modal 
        open={ordersModal} 
        onClose={() => { setOrdersModal(false); setSelectedPackage(null); }} 
        title={selectedPackage ? `Orders for ${selectedPackage.name}` : 'Package Orders'}
        size="xl"
      >
        <div className="space-y-4">
          {selectedPackage && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{selectedPackage.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(selectedPackage.coin_amount)} coins for {formatNumber(selectedPackage.price_sum)} so'm
                  </p>
                </div>
                <div className="text-right">
                  <Badge color={selectedPackage.is_active ? 'green' : 'gray'}>
                    {selectedPackage.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {ordersLoading ? (
              <div className="p-8 text-center">Loading orders...</div>
            ) : packageOrdersData?.data?.length > 0 ? (
              <Table headers={['User', 'Amount (so\'m)', 'Payment Method', 'Status', 'Date']}>
                {packageOrdersData.data.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{order.user_name || `User #${order.user_id}`}</div>
                        <div className="text-sm text-gray-500">{order.user_phone || 'No phone'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                        {formatNumber(order.amount_som)} so'm
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color="blue">{order.payment_method || 'Unknown'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={order.status === 'completed' ? 'green' : order.status === 'pending' ? 'yellow' : 'red'}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('uz-UZ')}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState message="No orders found for this package." />
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => { setOrdersModal(false); setSelectedPackage(null); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}