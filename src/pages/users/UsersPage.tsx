import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, DollarSign } from 'lucide-react';
import { usersApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, Input, EmptyState } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';
import type { User } from '../../types';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [balanceModal, setBalanceModal] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.getAll({ page, limit, search: search || undefined }).then(r => r.data),
  });

  const { register: regBal, handleSubmit: submitBal, reset: resetBal } = useForm<{ amount: number; description: string }>();

  const balMutation = useMutation({
    mutationFn: (d: { amount: number; description: string }) => usersApi.updateBalance(selected!.id, d),
    onSuccess: () => { toast.success('Balance updated'); setBalanceModal(false); resetBal(); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to update balance'),
  });

  const users: User[] = Array.isArray((data as any)?.data?.data) ? (data as any).data.data : [];
  const total: number = (data as any)?.data?.total ?? 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Users <span className="text-gray-400 font-normal text-base">({formatNumber(total)})</span></h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by username…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Table headers={['ID', 'Username', 'Phone', 'Coins', 'Rating', 'Verified', 'Joined', 'Actions']} loading={isLoading}>
        {users.length === 0 && !isLoading ? (
          <tr><td colSpan={8}><EmptyState message="No users found" /></td></tr>
        ) : users.map(u => (
          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            <td className="px-4 py-3 text-gray-500 text-xs">#{u.id}</td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                  {u.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.username}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.phone || '—'}</td>
            <td className="px-4 py-3 text-sm font-medium text-yellow-600 dark:text-yellow-400">{formatNumber(u.coins ?? 0)} 🪙</td>
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{u.rating ?? 0}</td>
            <td className="px-4 py-3"><Badge color={u.is_verified ? 'green' : 'red'}>{u.is_verified ? 'Yes' : 'No'}</Badge></td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button onClick={() => { setSelected(u); setBalanceModal(true); }} title="Edit Balance"
                  className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 transition">
                  <DollarSign className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      {/* Balance Modal */}
      <Modal open={balanceModal} onClose={() => setBalanceModal(false)} title={`Adjust Balance — ${selected?.username}`}>
        <form onSubmit={submitBal(d => balMutation.mutate(d))} className="space-y-4">
          <Input label="Amount (negative to deduct)" type="number" {...regBal('amount', { valueAsNumber: true, required: true })} />
          <Input label="Description" placeholder="Admin adjustment…" {...regBal('description', { required: true })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setBalanceModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={balMutation.isPending} className="flex-1">Update Balance</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
