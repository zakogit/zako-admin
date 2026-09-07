import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Trash2, 
  Bell, 
  Users,
  UserCheck,
  Crown,
  Target,
  Calendar,
  TrendingUp,
  AlertCircle,
  Eye,
  Send,
  Settings,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { notificationsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState, Input } from '../../components/ui';
import { useForm } from 'react-hook-form';
import { formatDate, formatNumber, getStaticFileUrl } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  target_type: 'all' | 'verified' | 'premium' | 'specific';
  target_users?: number[];
  sent_count?: number;
  created_at: string;
  recipient_username?: string;
  created_by_username?: string;
  status: 'read' | 'unread';
  data?: any;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Notification | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [templatesModal, setTemplatesModal] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // photo + text push
  const limit = 20;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['admin-notifications', page, search, statusFilter],
    queryFn: () => notificationsApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      type: statusFilter || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['notifications-stats'],
    queryFn: () => notificationsApi.getStats().then(r => r.data.data),
  });

  const { data: deliveryData } = useQuery({
    queryKey: ['delivery-report', selected?.id],
    queryFn: () => selected ? notificationsApi.getDeliveryReport(selected.id).then(r => r.data.data) : null,
    enabled: !!selected && deliveryModal,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationsApi.getTemplates().then(r => r.data.data),
  });

  // Form hooks
  const { register: regCreate, handleSubmit: submitCreate, reset: resetCreate, watch, setValue, formState: { errors: errCreate } } = useForm();

  const createMutation = useMutation({
    mutationFn: notificationsApi.create,
    onSuccess: (res: any) => {
      const sent = res?.data?.data?.sent_count ?? 0;
      const pushSent = res?.data?.data?.push_sent;
      toast.success(
        `✅ ${formatNumber(sent)} ta foydalanuvchiga yuborildi${pushSent === false ? ' (push o\'chiq - faqat inbox)' : ''}`,
      );
      setCreateModal(false);
      resetCreate();
      setImageUrl(null);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Xabar yuborishda xatolik');
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return notificationsApi.uploadImage(fd).then(r => r.data.data.url);
    },
    onSuccess: (url) => {
      setImageUrl(url);
      toast.success('Rasm yuklandi');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Rasm yuklashda xatolik'),
  });

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Faqat rasm fayllari'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Rasm 5MB dan oshmasligi kerak'); return; }
    uploadImageMutation.mutate(file);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => {
      toast.success('Notification o\'chirildi');
      setDeleteModal(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin-notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Notification o\'chirishda xatolik');
    },
  });

  const notifications: Notification[] = Array.isArray((notificationsData as any)?.data?.data) ? (notificationsData as any).data.data : [];
  const total: number = (notificationsData as any)?.data?.total ?? 0;
  const stats = statsData || {};

  // Watch target_type to show/hide specific user inputs
  const watchedTargetType = watch('target_type');

  // Helper function to fill form from template
  const useTemplate = (template: any) => {
    setValue('title', template.template_title);
    setValue('message', template.template_message);
    setValue('type', template.type);
  };

  const onSendSubmit = (d: any) => {
    const targetUsers: number[] =
      typeof d.target_users === 'string' && d.target_users.trim() !== ''
        ? d.target_users
            .split(',')
            .map((s: string) => Number(s.trim()))
            .filter((n: number) => Number.isInteger(n) && n > 0)
        : [];
    if (d.target_type === 'specific' && targetUsers.length === 0) {
      toast.error("Kamida bitta to'g'ri user ID kiriting");
      return;
    }
    createMutation.mutate({
      title: d.title,
      message: d.message,
      type: d.type,
      target_type: d.target_type,
      target_users: targetUsers,
      data: {},
      image_url: imageUrl,
    } as any);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WELCOME': return 'green';
      case 'BIRTHDAY_GIFT': return 'purple';
      case 'ADMIN_MESSAGE': return 'blue';
      case 'BROADCAST': return 'orange';
      case 'SYSTEM': return 'gray';
      default: return 'blue';
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'verified': return <UserCheck className="w-4 h-4" />;
      case 'premium': return <Crown className="w-4 h-4" />;
      case 'specific': return <Target className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getTargetLabel = (targetType: string) => {
    switch (targetType) {
      case 'all': return 'Barcha foydalanuvchilar';
      case 'verified': return 'Tasdiqlangan foydalanuvchilar';
      case 'premium': return 'Premium foydalanuvchilar';
      case 'specific': return 'Tanlangan foydalanuvchilar';
      default: return targetType;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Jami Notifications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatNumber(stats.total_notifications || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">O'qilmagan</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {formatNumber(stats.unread_notifications || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bugungi</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatNumber(stats.notifications_today || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Haftalik</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {formatNumber(stats.notifications_this_week || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📢 Notification Boshqaruvi
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Barcha foydalanuvchilar uchun notification yuborish va boshqarish
              <span className="ml-2 text-sm font-medium">({formatNumber(total)} ta notification)</span>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Xabar yuborish
            </Button>
            <Button
              variant="outline"
              onClick={() => setTemplatesModal(true)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Templatelar
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Notification qidiring (sarlavha yoki matn bo'yicha)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          
          <div className="flex gap-2">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">🏷️ Barcha turlar</option>
              <option value="WELCOME">🎉 Xush kelibsiz</option>
              <option value="BIRTHDAY_GIFT">🎂 Tug'ilgan kun</option>
              <option value="ADMIN_MESSAGE">👤 Admin xabari</option>
              <option value="BROADCAST">📢 Broadcast</option>
              <option value="SYSTEM">⚙️ Tizim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table 
          headers={['📬 Notification', '🏷️ Turi', '🎯 Maqsad', '📊 Qabul qilinganlar', '📅 Yaratilgan', '⚡ Amallar']} 
          loading={isLoading}
        >
          {notifications.length === 0 && !isLoading ? (
            <tr><td colSpan={6}>
              <EmptyState 
                message="Hech qanday notification topilmadi" 
              />
            </td></tr>
          ) : notifications.map((notification) => (
            <tr key={notification.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-5">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    {notification.recipient_username && (
                      <p className="text-xs text-gray-500 mt-1">
                        Qabul qiluvchi: {notification.recipient_username}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge color={getTypeColor(notification.type)}>
                  {notification.type === 'WELCOME' && '🎉 Xush kelibsiz'}
                  {notification.type === 'BIRTHDAY_GIFT' && '🎂 Tug\'ilgan kun'}
                  {notification.type === 'ADMIN_MESSAGE' && '👤 Admin'}
                  {notification.type === 'BROADCAST' && '📢 Broadcast'}
                  {notification.type === 'SYSTEM' && '⚙️ Tizim'}
                  {!['WELCOME', 'BIRTHDAY_GIFT', 'ADMIN_MESSAGE', 'BROADCAST', 'SYSTEM'].includes(notification.type) && notification.type}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {getTargetIcon(notification.target_type)}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getTargetLabel(notification.target_type)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-center">
                  <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatNumber(notification.sent_count || 0)}
                  </span>
                  <p className="text-xs text-gray-500">foydalanuvchi</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>{formatDate(notification.created_at)}</div>
                  {notification.created_by_username && (
                    <div className="text-xs text-gray-500 mt-1">
                      {notification.created_by_username} tomonidan
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-1">
                  <button 
                    onClick={() => {setSelected(notification); setDeliveryModal(true);}} 
                    title="Delivery hisoboti"
                    className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setSelected(notification); setDeleteModal(true); }} 
                    title="O'chirish"
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>

        {total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination 
              page={page} 
              total={total} 
              limit={limit} 
              onChange={setPage} 
            />
          </div>
        )}
      </div>

      {/* Delivery Report Modal */}
      <Modal 
        open={deliveryModal} 
        onClose={() => setDeliveryModal(false)} 
        title={`📊 Delivery Hisoboti - ${selected?.title}`}
        size="lg"
      >
        <div className="space-y-6">
          {deliveryData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(deliveryData.total)}</p>
                    <p className="text-sm text-blue-700">Jami</p>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatNumber(deliveryData.delivered)}</p>
                    <p className="text-sm text-green-700">Yetkazildi</p>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatNumber(deliveryData.read)}</p>
                    <p className="text-sm text-yellow-700">O'qildi</p>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {deliveryData.total > 0 ? Math.round((deliveryData.read / deliveryData.total) * 100) : 0}%
                    </p>
                    <p className="text-sm text-purple-700">O'qilish foizi</p>
                  </div>
                </div>
              </div>

              {deliveryData.data && deliveryData.data.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Qabul qiluvchilar ro'yxati</h4>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Foydalanuvchi</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Holati</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vaqt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveryData.data.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2 text-sm">{item.username}</td>
                            <td className="px-4 py-2">
                              <Badge color={item.is_read ? 'green' : 'yellow'}>
                                {item.is_read ? 'O\'qildi' : 'O\'qilmagan'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{formatDate(item.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={() => setDeliveryModal(false)}>
              ✅ Yopish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="🗑️ Notification O'chirish">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-900 dark:text-red-100">Ogoh bo'ling!</h3>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">
              Bu amalni qaytarib bo'lmaydi. Notification butunlay o'chirib tashlanadi.
            </p>
          </div>

          {selected && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{selected.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selected.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                Yaratilgan: {formatDate(selected.created_at)} | 
                Yuborilgan: {formatNumber(selected.sent_count || 0)} ta foydalanuvchiga
              </p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)} className="flex-1">
              ❌ Bekor qilish
            </Button>
            <Button 
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              loading={deleteMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              🗑️ O'chirish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Notification Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="📨 Xabar yuborish" size="lg">
        <form onSubmit={submitCreate(onSendSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Sarlavha" 
              placeholder="Notification sarlavhasi"
              {...regCreate('title', { required: 'Sarlavha majburiy' })} 
              error={errCreate.title?.message as string}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Turi
              </label>
              <select 
                {...regCreate('type', { required: 'Turi majburiy' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Turni tanlang</option>
                <option value="ADMIN_MESSAGE">Admin Xabari</option>
                <option value="BROADCAST">Broadcast</option>
                <option value="SYSTEM">Tizim</option>
                <option value="ANNOUNCEMENT">E'lon</option>
                <option value="MAINTENANCE">Texnik Ishlar</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Xabar matni
            </label>
            <textarea 
              {...regCreate('message', { required: 'Xabar majburiy' })}
              rows={4}
              placeholder="Notification xabari..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errCreate.message && (
              <p className="text-sm text-red-600 dark:text-red-400">{String(errCreate.message.message)}</p>
            )}
          </div>

          {/* Rasm (photo + text push). iOS'da rasm Notification Service Extension bo'lsa ko'rinadi. */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rasm (ixtiyoriy)</label>
            {imageUrl ? (
              <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <img src={getStaticFileUrl(imageUrl)} alt="" className="w-20 h-20 rounded object-cover bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{imageUrl}</p>
                  <p className="text-xs text-gray-400">Push va inbox'da ko'rsatiladi</p>
                </div>
                <button type="button" onClick={() => setImageUrl(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Olib tashlash">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <ImageIcon className="w-4 h-4" />
                {uploadImageMutation.isPending ? 'Yuklanmoqda…' : 'Rasm tanlash (JPG/PNG/WEBP, 5MB gacha)'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} disabled={uploadImageMutation.isPending} />
              </label>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kimga yuborish
            </label>
            <select 
              {...regCreate('target_type', { required: 'Target majburiy' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Targetni tanlang</option>
              <option value="all">🌍 Barchaga</option>
              <option value="verified">✅ Tasdiqlanganlarga</option>
              <option value="premium">👑 Premium foydalanuvchilarga</option>
              <option value="specific">🎯 Aniq foydalanuvchilarga</option>
            </select>
          </div>

          {watchedTargetType === 'specific' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Foydalanuvchi ID'lari (vergul bilan ajrating)
              </label>
              <input 
                type="text"
                {...regCreate('target_users')}
                placeholder="1, 2, 3, 4"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">Masalan: 1, 2, 3, 4</p>
            </div>
          )}

          {/* Template Buttons */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Templatelar:</h4>
            <div className="flex flex-wrap gap-2">
              {templatesData?.map((template: any) => (
                <button
                  key={template.type}
                  type="button"
                  onClick={() => useTemplate(template)}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-lg text-sm hover:bg-blue-200 dark:hover:bg-blue-700 transition"
                >
                  {template.type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={createMutation.isPending} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Yuborish
            </Button>
          </div>
        </form>
      </Modal>

      {/* Templates Modal */}
      <Modal open={templatesModal} onClose={() => setTemplatesModal(false)} title="Notification Templatelar" size="lg">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bu yerda mavjud templatelarni ko'rishingiz va tahrirlashingiz mumkin:
            </p>
            
            {templatesData && templatesData.length > 0 ? (
              <div className="space-y-3">
                {templatesData.map((template: any) => (
                  <div key={template.type} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">
                          {template.type}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template.template_title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.template_message}
                        </p>
                      </div>
                      <Badge color={template.is_active ? 'green' : 'red'}>
                        {template.is_active ? 'Faol' : 'Nofaol'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="Template topilmadi" />
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setTemplatesModal(false)} className="flex-1">
              Yopish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}