import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  DollarSign, 
  Eye, 
  Ban, 
  Shield, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Trash2,
  Calendar,
  Users,
  UserPlus,
  AlertTriangle,
  Edit,
  KeyRound,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Swords,
  Smartphone
} from 'lucide-react';
import { usersApi, regionsApi } from '../../api/services';
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
  
  // Advanced filters
  const [verificationFilter, setVerificationFilter] = useState('');
  const [banFilter, setBanFilter] = useState('');
  const [premiumFilter, setPremiumFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [balanceModal, setBalanceModal] = useState(false);
  const [banModal, setBanModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [userDetailModal, setUserDetailModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [xpModal, setXpModal] = useState(false);
  const [action, setAction] = useState<'ban' | 'unban' | 'verify' | 'unverify' | 'delete' | null>(null);
  const limit = 20;

  // Get users data with advanced filters
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, verificationFilter, banFilter, premiumFilter, regionFilter, dateFromFilter, dateToFilter, onlineFilter],
    queryFn: () => usersApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      is_verified: verificationFilter || undefined,
      is_banned: banFilter || undefined,
      is_premium: premiumFilter || undefined,
      region_id: regionFilter || undefined,
      date_from: dateFromFilter || undefined,
      date_to: dateToFilter || undefined,
      is_online: onlineFilter || undefined
    }).then(r => r.data),
  });

  // Get users stats
  const { data: stats } = useQuery({
    queryKey: ['users-stats'],
    queryFn: () => usersApi.getStats().then(r => r.data.data),
  });

  // Get user details for modal
  const { data: userDetails } = useQuery({
    queryKey: ['user-details', selected?.id],
    queryFn: () => selected ? usersApi.getById(selected.id).then(r => r.data.data) : null,
    enabled: !!selected && userDetailModal,
  });

  // Duel tarixi va qurilmalar — detail modal ochilganda
  const { data: userDuels } = useQuery({
    queryKey: ['user-duels', selected?.id],
    queryFn: () => usersApi.getDuels(selected!.id, { limit: 15 }).then(r => r.data.data),
    enabled: !!selected && userDetailModal,
  });
  const { data: userDevices } = useQuery({
    queryKey: ['user-devices', selected?.id],
    queryFn: () => usersApi.getDevices(selected!.id).then(r => r.data.data),
    enabled: !!selected && userDetailModal,
  });

  // Get regions for create/edit forms
  const { data: regionsData } = useQuery({
    queryKey: ['regions-dropdown'],
    queryFn: () => regionsApi.getAll({ limit: 1000 }).then(r => r.data.data.data),
  });

  // Forms
  const { register: regBal, handleSubmit: submitBal, reset: resetBal } = useForm<{ amount: number; description: string }>();
  const { register: regBan, handleSubmit: submitBan, reset: resetBan } = useForm<{ reason: string }>();
  const { register: regCreate, handleSubmit: submitCreate, reset: resetCreate, formState: { errors: errCreate } } = useForm();
  const { register: regEdit, handleSubmit: submitEdit, reset: resetEdit, setValue: setEditValue } = useForm();
  const { register: regPass, handleSubmit: submitPass, reset: resetPass } = useForm<{ new_password: string }>();
  const { register: regXp, handleSubmit: submitXp, reset: resetXp } = useForm<{ delta: number; description: string }>();

  // Mutations
  const balMutation = useMutation({
    mutationFn: (d: { amount: number; description: string }) => usersApi.updateBalance(selected!.id, d),
    onSuccess: () => { 
      toast.success('Balance yangilandi'); 
      setBalanceModal(false); 
      resetBal(); 
      qc.invalidateQueries({ queryKey: ['users'] }); 
    },
    onError: () => toast.error('Balance yangilashda xatolik'),
  });

  const banMutation = useMutation({
    mutationFn: (d: { reason: string }) => usersApi.ban(selected!.id, d),
    onSuccess: () => { 
      toast.success('Foydalanuvchi bloklandi'); 
      setBanModal(false); 
      resetBan(); 
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['users'] }); 
    },
    onError: () => toast.error('Bloklashda xatolik'),
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      toast.success('Foydalanuvchi yaratildi');
      setCreateModal(false);
      resetCreate();
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-stats'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Foydalanuvchi yaratishda xatolik'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.update(selected!.id, data),
    onSuccess: () => {
      toast.success('Foydalanuvchi yangilandi');
      setEditModal(false);
      setSelected(null);
      resetEdit();
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Yangilashda xatolik'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { new_password: string }) => usersApi.resetPassword(selected!.id, data),
    onSuccess: () => {
      toast.success('Parol o\'zgartirildi');
      setPasswordModal(false);
      resetPass();
      setSelected(null);
    },
    onError: () => toast.error('Parol o\'zgartirishda xatolik'),
  });

  const xpMutation = useMutation({
    mutationFn: (d: { delta: number; description: string }) =>
      usersApi.adjustXp(selected!.id, { delta: Number(d.delta), description: d.description }).then(r => r.data),
    onSuccess: (res) => {
      toast.success(`XP: ${formatNumber(res.data.previous_xp)} → ${formatNumber(res.data.xp)}`);
      setXpModal(false);
      resetXp();
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user-details'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'XP o\'zgartirishda xatolik'),
  });


  const actionMutation = useMutation({
    mutationFn: async (actionType: 'unban' | 'verify' | 'unverify' | 'delete') => {
      if (!selected) throw new Error('No user selected');
      
      switch (actionType) {
        case 'unban':
          return usersApi.unban(selected.id);
        case 'verify':
          return usersApi.verify(selected.id);
        case 'unverify':
          return usersApi.unverify(selected.id);
        case 'delete':
          return usersApi.delete(selected.id);
        default:
          throw new Error('Unknown action');
      }
    },
    onSuccess: (_, actionType) => {
      const messages = {
        unban: 'Foydalanuvchi blokdan chiqarildi',
        verify: 'Foydalanuvchi tasdiqlandi',
        unverify: 'Foydalanuvchi tasdiq bekor qilindi',
        delete: 'Foydalanuvchi o\'chirildi'
      };
      
      toast.success(messages[actionType]);
      setSelected(null);
      setAction(null);
      setDeleteModal(false);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-stats'] });
    },
    onError: () => toast.error('Amalni bajarishda xatolik'),
  });

  const handleAction = (user: User, actionType: typeof action) => {
    setSelected(user);
    setAction(actionType);
    
    if (actionType === 'ban') {
      setBanModal(true);
    } else if (actionType === 'delete') {
      setDeleteModal(true);
    } else if (actionType) {
      actionMutation.mutate(actionType);
    }
  };

  const handleEdit = (user: User) => {
    setSelected(user);
    // Populate edit form with current user data
    setEditValue('username', user.username);
    setEditValue('phone_number', user.phone);
    setEditValue('first_name', (user as any).first_name || '');
    setEditValue('last_name', (user as any).last_name || '');
    setEditValue('email', (user as any).email || '');
    setEditValue('region_id', (user as any).region_id || '');
    setEditModal(true);
  };


  const clearFilters = () => {
    setVerificationFilter('');
    setBanFilter('');
    setPremiumFilter('');
    setRegionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setOnlineFilter('');
    setPage(1);
  };

  const hasActiveFilters = verificationFilter || banFilter || premiumFilter || regionFilter || dateFromFilter || dateToFilter || onlineFilter;

  const users: User[] = Array.isArray((data as any)?.data?.data) ? (data as any).data.data : [];
  const total: number = (data as any)?.data?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Foydalanuvchilar
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Barcha foydalanuvchilarni boshqarish va kuzatish
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Yangi foydalanuvchi
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('/api/admin/users/export?format=csv')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Jami</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.total_users)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasdiqlangan</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.verified_users)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Ban className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bloklangan</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.banned_users)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Haftalik</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.new_users_week)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Oylik</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(stats.new_users_month)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Foydalanuvchilar ro'yxati ({formatNumber(total)})
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Username yoki telefon bo'yicha qidiring..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 ${hasActiveFilters ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <Filter className="w-4 h-4" />
              Filtrlar
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {[verificationFilter, banFilter, premiumFilter, regionFilter, dateFromFilter, onlineFilter].filter(Boolean).length}
                </span>
              )}
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
                Tozalash
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Qo'shimcha filtrlar
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Verification Status */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tasdiq holati
                </label>
                <select
                  value={verificationFilter}
                  onChange={e => { setVerificationFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Barchasi</option>
                  <option value="true">✅ Tasdiqlangan</option>
                  <option value="false">⏳ Tasdiqlanmagan</option>
                </select>
              </div>

              {/* Ban Status */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blok holati
                </label>
                <select
                  value={banFilter}
                  onChange={e => { setBanFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Barchasi</option>
                  <option value="false">✅ Faol</option>
                  <option value="true">🚫 Bloklangan</option>
                </select>
              </div>

              {/* Premium Status */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Premium holat
                </label>
                <select
                  value={premiumFilter}
                  onChange={e => { setPremiumFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Barchasi</option>
                  <option value="true">👑 Premium</option>
                  <option value="false">👤 Oddiy</option>
                </select>
              </div>

              {/* Region */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Viloyat
                </label>
                <select
                  value={regionFilter}
                  onChange={e => { setRegionFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Barcha viloyatlar</option>
                  {regionsData?.map((region: any) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Registration Date From */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ro'yxatdan dan
                </label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={e => { setDateFromFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Registration Date To */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ro'yxatdan gacha
                </label>
                <input
                  type="date"
                  value={dateToFilter}
                  onChange={e => { setDateToFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Online Status */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Online holat
                </label>
                <select
                  value={onlineFilter}
                  onChange={e => { setOnlineFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Barchasi</option>
                  <option value="true">🟢 Onlayn</option>
                  <option value="false">⚪ Oflayn</option>
                </select>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="md:col-span-2 lg:col-span-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Faol filtrlar:</h5>
                    <div className="flex flex-wrap gap-1">
                      {verificationFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Tasdiq: {verificationFilter === 'true' ? 'Ha' : 'Yo\'q'}
                          <button onClick={() => setVerificationFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {banFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Blok: {banFilter === 'true' ? 'Ha' : 'Yo\'q'}
                          <button onClick={() => setBanFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {premiumFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Premium: {premiumFilter === 'true' ? 'Ha' : 'Yo\'q'}
                          <button onClick={() => setPremiumFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {regionFilter && regionsData && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Viloyat: {regionsData.find((r: any) => r.id == regionFilter)?.name}
                          <button onClick={() => setRegionFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {dateFromFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Dan: {dateFromFilter}
                          <button onClick={() => setDateFromFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {dateToFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Gacha: {dateToFilter}
                          <button onClick={() => setDateToFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {onlineFilter && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs">
                          Online: {onlineFilter === 'true' ? 'Ha' : 'Yo\'q'}
                          <button onClick={() => setOnlineFilter('')} className="hover:bg-blue-200 dark:hover:bg-blue-700 rounded">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table 
          headers={['ID', 'Foydalanuvchi', 'Telefon', 'Tangalar', 'Reyting', 'Holati', 'Qo\'shilgan', 'Amallar']} 
          loading={isLoading}
        >
          {users.length === 0 && !isLoading ? (
            <tr><td colSpan={8}><EmptyState message="Foydalanuvchilar topilmadi" /></td></tr>
          ) : users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
              <td className="px-4 py-3 text-gray-500 text-xs">#{u.id}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-bold flex-shrink-0">
                    {u.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.username}</span>
                    {(u as any).status === 'online' && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Onlayn
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.phone || '—'}</td>
              <td className="px-4 py-3">
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  {formatNumber(u.coins ?? 0)} 🪙
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{u.rating ?? 0}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Badge color={u.is_verified ? 'green' : 'yellow'}>
                    {u.is_verified ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
                  </Badge>
                  {(u as any).is_banned && (
                    <Badge color="red">Bloklangan</Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{formatDate(u.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button 
                    onClick={() => {setSelected(u); setUserDetailModal(true);}} 
                    title="Ko'rish"
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(u)} 
                    title="Tahrirlash"
                    className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setSelected(u); setPasswordModal(true); }} 
                    title="Parol o'zgartirish"
                    className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 transition"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setSelected(u); setBalanceModal(true); }} 
                    title="Balansni o'zgartirish"
                    className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 transition"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setSelected(u); setXpModal(true); }}
                    title="XP o'zgartirish"
                    className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  {!(u as any).is_banned ? (
                    <button 
                      onClick={() => handleAction(u, 'ban')} 
                      title="Bloklash"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction(u, 'unban')} 
                      title="Blokdan chiqarish"
                      className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  {!u.is_verified ? (
                    <button 
                      onClick={() => handleAction(u, 'verify')} 
                      title="Tasdiqlash"
                      className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction(u, 'unverify')} 
                      title="Tasdiqni bekor qilish"
                      className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 transition"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleAction(u, 'delete')} 
                    title="O'chirish"
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </div>

      <Pagination page={page} total={total} limit={limit} onChange={setPage} />

      {/* Balance Modal */}
      <Modal open={balanceModal} onClose={() => setBalanceModal(false)} title={`Balansni o'zgartirish — ${selected?.username}`}>
        <form onSubmit={submitBal(d => balMutation.mutate(d))} className="space-y-4">
          <Input 
            label="Miqdor (manfiy son ayirish uchun)" 
            type="number" 
            {...regBal('amount', { valueAsNumber: true, required: true })} 
          />
          <Input 
            label="Tavsif" 
            placeholder="Admin tomonidan o'zgartirildi..." 
            {...regBal('description', { required: true })} 
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setBalanceModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={balMutation.isPending} className="flex-1">
              Yangilash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ban Modal */}
      <Modal open={banModal} onClose={() => setBanModal(false)} title={`Foydalanuvchini bloklash — ${selected?.username}`}>
        <form onSubmit={submitBan(d => banMutation.mutate(d))} className="space-y-4">
          <Input 
            label="Bloklash sababi" 
            placeholder="Qoidalarni buzgani uchun..." 
            {...regBan('reason', { required: true })} 
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setBanModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={banMutation.isPending} className="flex-1" variant="danger">
              Bloklash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Foydalanuvchini o'chirish">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">
                Ogoh bo'ling!
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>{selected?.username}</strong> foydalanuvchisini butunlay o'chirmoqchimisiz? 
                Bu amal qaytarib bo'lmaydi!
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setDeleteModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button 
              onClick={() => actionMutation.mutate('delete')} 
              loading={actionMutation.isPending} 
              className="flex-1" 
              variant="danger"
            >
              O'chirish
            </Button>
          </div>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <Modal 
        open={userDetailModal} 
        onClose={() => setUserDetailModal(false)} 
        title={`Foydalanuvchi ma'lumotlari — ${selected?.username}`}
        size="lg"
      >
        {userDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Username</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telefon</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.phone_number || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Ism</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.first_name || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Familiya</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.last_name || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.email || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Viloyat</label>
                <p className="text-gray-900 dark:text-gray-100">{userDetails.region_name || '—'}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatNumber(userDetails.coins)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tangalar</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userDetails.rating}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reyting</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{userDetails.xp}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">XP</p>
                {userDetails.league && <Badge color="purple" size="sm">{userDetails.league}</Badge>}
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {userDetails.activity?.is_online ? 'Onlayn' : 'Oflayn'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Holat</p>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userDetails.total_duels}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Jami duellar</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userDetails.won_duels}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Yutgan duellar</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userDetails.total_exams}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Imtihonlar</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userDetails.activity?.total_friends}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Do'stlar</p>
              </div>
            </div>

            {/* Duel tarixi (spec: "duel history ko'rish") */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Swords className="w-4 h-4 text-orange-500" />
                Duel tarixi
                {userDuels && <span className="text-xs text-gray-400 font-normal">jami {formatNumber(userDuels.total)}</span>}
              </h4>
              {!userDuels ? (
                <p className="text-sm text-gray-400">Yuklanmoqda…</p>
              ) : userDuels.data.length === 0 ? (
                <p className="text-sm text-gray-400">Duellar yo'q</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <Table headers={['#', 'Raqib', 'Fan', 'Ball', 'Natija', 'XP', 'Sana']}>
                    {userDuels.data.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-2 text-xs text-gray-400">{d.id}</td>
                        <td className="px-4 py-2 text-sm">
                          {d.opponent_username ?? '—'}
                          {d.is_bot_game && <Badge color="orange" size="sm">bot</Badge>}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{d.subject_name ?? '—'}</td>
                        <td className="px-4 py-2 text-sm font-medium">{d.my_score} : {d.opponent_score}</td>
                        <td className="px-4 py-2">
                          {d.result === 'won' && <Badge color="green" size="sm">Yutdi</Badge>}
                          {d.result === 'lost' && <Badge color="red" size="sm">Yutqazdi</Badge>}
                          {d.result === 'draw' && <Badge color="gray" size="sm">Durang</Badge>}
                          {!d.result && <Badge color="blue" size="sm">{d.status}</Badge>}
                        </td>
                        <td className={`px-4 py-2 text-sm font-semibold ${d.xp_change == null ? 'text-gray-400' : d.xp_change > 0 ? 'text-green-600' : d.xp_change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {d.xp_change == null ? '—' : `${d.xp_change > 0 ? '+' : ''}${d.xp_change}`}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{formatDate(d.created_at)}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
            </div>

            {/* Qurilmalar (spec: "device info") */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                Qurilmalar
                {userDevices && <span className="text-xs text-gray-400 font-normal">{userDevices.length} ta</span>}
              </h4>
              {!userDevices ? (
                <p className="text-sm text-gray-400">Yuklanmoqda…</p>
              ) : userDevices.length === 0 ? (
                <p className="text-sm text-gray-400">Push uchun ro'yxatdan o'tgan qurilma yo'q</p>
              ) : (
                <div className="space-y-2">
                  {userDevices.map(dev => {
                    const info = (dev.device_info || {}) as Record<string, any>;
                    const model = info.model || info.device || info.name || null;
                    const os = info.os_version || info.osVersion || info.system_version || null;
                    return (
                      <div key={dev.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            <Badge color={dev.platform === 'ios' ? 'gray' : 'green'} size="sm">{dev.platform || '?'}</Badge>
                            <span className="ml-2">v{dev.app_version || '—'}</span>
                            {model && <span className="ml-2 text-gray-500">{model}{os ? ` · ${os}` : ''}</span>}
                          </p>
                          <p className="text-xs text-gray-400">token {dev.token_preview}</p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">so'nggi: {formatDate(dev.updated_at)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            {userDetails.recent_transactions && userDetails.recent_transactions.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">So'nggi tranzaksiyalar</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userDetails.recent_transactions.map((tx: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{tx.description}</span>
                      <span className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => {setUserDetailModal(false); setBalanceModal(true);}}
                className="flex-1"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Balansni o'zgartirish
              </Button>
              <Button
                variant="outline"
                onClick={() => {setUserDetailModal(false); setXpModal(true);}}
                className="flex-1"
              >
                <Zap className="w-4 h-4 mr-2" />
                XP o'zgartirish
              </Button>
              <Button variant="outline" onClick={() => setUserDetailModal(false)} className="flex-1">
                Yopish
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </Modal>

      {/* XP Modal (spec: "XP o'zgartirish") */}
      <Modal open={xpModal} onClose={() => { setXpModal(false); resetXp(); }} title={`XP o'zgartirish — ${selected?.username}`}>
        <form onSubmit={submitXp(d => xpMutation.mutate(d))} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Musbat son XP qo'shadi, manfiy son ayiradi. Natija 0 dan pastga tushmaydi. Musbat o'zgarish haftalik/kunlik XP hisobiga ham qo'shiladi.
          </p>
          <Input
            label="XP o'zgarishi (masalan 100 yoki -50)"
            type="number"
            {...regXp('delta', { required: true, validate: v => Number(v) !== 0 })}
          />
          <Input
            label="Izoh (audit uchun)"
            placeholder="Nega o'zgartirildi"
            {...regXp('description')}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setXpModal(false); resetXp(); }} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={xpMutation.isPending} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Yangi foydalanuvchi yaratish" size="lg">
        <form onSubmit={submitCreate(d => createMutation.mutate(d as any))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Username" 
              {...regCreate('username', { required: 'Username majburiy' })} 
              error={errCreate.username?.message as string}
            />
            <Input 
              label="Telefon raqam" 
              placeholder="+998901234567"
              {...regCreate('phone_number', { required: 'Telefon raqam majburiy' })} 
              error={errCreate.phone_number?.message as string}
            />
            <Input 
              label="Parol" 
              type="password"
              {...regCreate('password', { required: 'Parol majburiy', minLength: { value: 6, message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' } })} 
              error={errCreate.password?.message as string}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Viloyat
              </label>
              <select 
                {...regCreate('region_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Viloyatni tanlang</option>
                {regionsData?.map((region: any) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <Input 
              label="Ism" 
              {...regCreate('first_name')} 
            />
            <Input 
              label="Familiya" 
              {...regCreate('last_name')} 
            />
            <Input 
              label="Email" 
              type="email"
              {...regCreate('email')} 
            />
            <div className="flex items-center">
              <input 
                type="checkbox"
                {...regCreate('is_verified')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Darhol tasdiqlash
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={createMutation.isPending} className="flex-1">
              Yaratish
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={`Foydalanuvchini tahrirlash — ${selected?.username}`} size="lg">
        <form onSubmit={submitEdit(d => updateMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Username" 
              {...regEdit('username')} 
            />
            <Input 
              label="Telefon raqam" 
              {...regEdit('phone_number')} 
            />
            <Input 
              label="Ism" 
              {...regEdit('first_name')} 
            />
            <Input 
              label="Familiya" 
              {...regEdit('last_name')} 
            />
            <Input 
              label="Email" 
              type="email"
              {...regEdit('email')} 
            />
            <Input 
              label="Tug'ilgan kun" 
              type="date"
              {...regEdit('birthday')} 
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Viloyat
              </label>
              <select 
                {...regEdit('region_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Viloyatni tanlang</option>
                {regionsData?.map((region: any) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={updateMutation.isPending} className="flex-1">
              Yangilash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal open={passwordModal} onClose={() => setPasswordModal(false)} title={`Parol o'zgartirish — ${selected?.username}`}>
        <form onSubmit={submitPass(d => passwordMutation.mutate(d))} className="space-y-4">
          <Input 
            label="Yangi parol" 
            type="password"
            placeholder="Kamida 6 ta belgi"
            {...regPass('new_password', { required: true, minLength: 6 })} 
          />
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Foydalanuvchi yangi parol bilan tizimga kirishga majbur bo'ladi.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setPasswordModal(false)} className="flex-1">
              Bekor qilish
            </Button>
            <Button type="submit" loading={passwordMutation.isPending} className="flex-1">
              O'zgartirish
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}