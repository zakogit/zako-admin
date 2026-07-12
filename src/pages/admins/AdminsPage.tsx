import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ShieldCheck, Plus, KeyRound, Power, Trash2 } from 'lucide-react';
import { Table, Badge, Button, Modal, EmptyState, Spinner } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import { adminsApi, type AdminUser } from '../../api/services';
import { useAuthStore } from '../../store/authStore';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'purple' as const },
  { value: 'moderator', label: 'Moderator', color: 'blue' as const },
  { value: 'viewer', label: 'Viewer', color: 'gray' as const },
];
/**
 * Admin akkauntlarni boshqarish (admin_users). Faqat super_admin. Qo'shish,
 * rol/holat o'zgartirish, parol tiklash, o'chirish (deaktivatsiya).
 */
export default function AdminsPage() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.admin) as { id?: number } | null;
  const [createModal, setCreateModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const createForm = useForm<{ username: string; password: string; role: string }>();
  const pwForm = useForm<{ new_password: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.getAll().then((r) => r.data.data),
  });
  const admins: AdminUser[] = Array.isArray(data) ? data : [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admins'] });
  const onErr = (e: any) => toast.error(e?.response?.data?.message || 'Xatolik');

  const createMut = useMutation({
    mutationFn: (b: any) => adminsApi.create(b).then((r) => r.data),
    onSuccess: () => { toast.success('Admin yaratildi'); setCreateModal(false); createForm.reset(); invalidate(); },
    onError: onErr,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...b }: any) => adminsApi.update(id, b).then((r) => r.data),
    onSuccess: () => { toast.success('Saqlandi'); invalidate(); },
    onError: onErr,
  });
  const pwMut = useMutation({
    mutationFn: ({ id, new_password }: any) => adminsApi.resetPassword(id, { new_password }).then((r) => r.data),
    onSuccess: () => { toast.success('Parol o‘zgartirildi'); setPwModal(false); pwForm.reset(); setSelected(null); },
    onError: onErr,
  });
  const delMut = useMutation({
    mutationFn: (id: number) => adminsApi.remove(id).then((r) => r.data),
    onSuccess: () => { toast.success('O‘chirildi'); invalidate(); },
    onError: onErr,
  });

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Adminlar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Admin panel foydalanuvchilari (super_admin boshqaradi)</p>
          </div>
        </div>
        <Button onClick={() => { createForm.reset({ role: 'moderator' }); setCreateModal(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Admin qo'shish
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {admins.length === 0 ? (
          <EmptyState message="Admin yo'q" />
        ) : (
          <Table headers={['Username', 'Rol', 'Holat', 'MFA', 'Yaratilgan', '']}>
            {admins.map((a) => {
              const isSelf = me?.id === a.id;
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {a.username} {isSelf && <span className="text-xs text-gray-400">(siz)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.role}
                      disabled={updateMut.isPending}
                      onChange={(e) => updateMut.mutate({ id: a.id, role: e.target.value })}
                      className="px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Faol' : 'O‘chirilgan'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={a.mfa_enabled ? 'green' : 'gray'}>{a.mfa_enabled ? 'Yoqilgan' : '—'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" title="Parol o'zgartirish" onClick={() => { setSelected(a); pwForm.reset(); setPwModal(true); }}>
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" title={a.is_active ? 'O‘chirish' : 'Faollashtirish'}
                        disabled={isSelf}
                        onClick={() => updateMut.mutate({ id: a.id, is_active: !a.is_active })}
                        className={a.is_active ? 'text-amber-600' : 'text-green-600'}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" title="O‘chirish (deaktivatsiya)"
                        disabled={isSelf}
                        onClick={() => { if (confirm(`${a.username} o‘chirilsinmi?`)) delMut.mutate(a.id); }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>

      {/* Create */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Admin qo'shish">
        <form onSubmit={createForm.handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Username *</label>
            <input {...createForm.register('username', { required: true })} className={inputCls} placeholder="admin2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Parol * (kamida 6 belgi)</label>
            <input type="text" {...createForm.register('password', { required: true, minLength: 6 })} className={inputCls} placeholder="••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Rol</label>
            <select {...createForm.register('role')} className={inputCls}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)}>Bekor</Button>
            <Button type="submit" loading={createMut.isPending}>Yaratish</Button>
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal open={pwModal} onClose={() => { setPwModal(false); setSelected(null); }} title={selected ? `Parol: ${selected.username}` : 'Parol'}>
        <form onSubmit={pwForm.handleSubmit((v) => selected && pwMut.mutate({ id: selected.id, new_password: v.new_password }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Yangi parol (kamida 6 belgi)</label>
            <input type="text" {...pwForm.register('new_password', { required: true, minLength: 6 })} className={inputCls} placeholder="••••••" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setPwModal(false)}>Bekor</Button>
            <Button type="submit" loading={pwMut.isPending}>O‘zgartirish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
