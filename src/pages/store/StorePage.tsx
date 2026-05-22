import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Package, DollarSign } from 'lucide-react';
import { Table, Badge, Button, Modal, EmptyState } from '../../components/ui';
import { formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

// Placeholder API - replace with actual store API
const storeApi = {
  getPackages: () => Promise.resolve({ data: { success: true, data: [] } }),
  createPackage: (_data: any) => Promise.resolve({ data: { success: true } }),
  updatePackage: (_id: number, _data: any) => Promise.resolve({ data: { success: true } }),
  deletePackage: (_id: number) => Promise.resolve({ data: { success: true } }),
};

export default function StorePage() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const createForm = useForm();
  const editForm = useForm();

  // Queries
  const { data: packagesData, isLoading } = useQuery({
    queryKey: ['store-packages'],
    queryFn: () => storeApi.getPackages().then(r => r.data)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => storeApi.createPackage(data),
    onSuccess: () => {
      toast.success('Package created successfully');
      setCreateModal(false);
      createForm.reset();
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: () => toast.error('Failed to create package')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => storeApi.updatePackage(id, data),
    onSuccess: () => {
      toast.success('Package updated successfully');
      setEditModal(false);
      editForm.reset();
      setSelectedPackage(null);
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: () => toast.error('Failed to update package')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => storeApi.deletePackage(id),
    onSuccess: () => {
      toast.success('Package deleted successfully');
      qc.invalidateQueries({ queryKey: ['store-packages'] });
    },
    onError: () => toast.error('Failed to delete package')
  });

  const handleCreate = (data: any) => {
    createMutation.mutate(data);
  };

  const handleEdit = (packageItem: any) => {
    setSelectedPackage(packageItem);
    editForm.reset(packageItem);
    setEditModal(true);
  };

  const handleUpdate = (data: any) => {
    updateMutation.mutate({ id: selectedPackage.id, ...data });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this package?')) {
      deleteMutation.mutate(id);
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'coins': return <Badge color="yellow">Coins</Badge>;
      case 'premium': return <Badge color="purple">Premium</Badge>;
      case 'cards': return <Badge color="blue">Cards</Badge>;
      default: return <Badge color="gray">{type}</Badge>;
    }
  };

  const packages = packagesData?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Store Packages
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage coin packages, premium subscriptions, and card bundles
          </p>
        </div>
        
        <Button onClick={() => setCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Package
        </Button>
      </div>

      {/* Packages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading packages...</div>
        ) : packages.length > 0 ? (
          <Table headers={['Package', 'Type', 'Price', 'Content', 'Status', 'Actions']}>
            {packages.map((pkg: any) => (
              <tr key={pkg.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{pkg.name}</div>
                      <div className="text-sm text-gray-500">{pkg.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {getProductTypeBadge(pkg.product_type)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                    <DollarSign className="w-4 h-4" />
                    {formatNumber(pkg.price_som)} so'm
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-white">
                  {pkg.product_type === 'coins' && `${pkg.data?.coins || 0} coins`}
                  {pkg.product_type === 'premium' && `${pkg.data?.duration_days || 0} days`}
                  {pkg.product_type === 'cards' && `${pkg.data?.card_count || 0} cards`}
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
          <EmptyState message="No packages found. Create your first package to get started." />
        )}
      </div>

      {/* Create Package Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Package">
        <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Package Name *</label>
              <input 
                {...createForm.register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., 100 Coins Package"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Product Type *</label>
              <select 
                {...createForm.register('product_type', { required: 'Type is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select type</option>
                <option value="coins">Coins</option>
                <option value="premium">Premium</option>
                <option value="cards">Cards</option>
              </select>
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
                {...createForm.register('price_som', { required: 'Price is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="50000"
              />
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
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Package Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Package">
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
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Product Type *</label>
              <select 
                {...editForm.register('product_type', { required: 'Type is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="coins">Coins</option>
                <option value="premium">Premium</option>
                <option value="cards">Cards</option>
              </select>
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
                {...editForm.register('price_som', { required: 'Price is required', valueAsNumber: true })}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
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
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Update Package
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}