import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { Search, Filter, Eye, XCircle, CheckCircle, Clock, DollarSign, TestTube } from 'lucide-react';
import { paymentsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function PaymentsPage() {
  const { t } = useTranslation('payments');
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'transactions' | 'webhooks' | 'stats' | 'test'>('orders');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    product_type: '',
    payment_method: '',
    date_from: '',
    date_to: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderDetailModal, setOrderDetailModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [testOrderModal, setTestOrderModal] = useState(false);
  const limit = 20;

  // Separate forms for each modal
  const cancelForm = useForm();
  const completeForm = useForm(); 
  const testForm = useForm();

  // Orders query
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders', page, search, filters],
    queryFn: () => paymentsApi.getOrders({ 
      page, 
      limit, 
      search: search || undefined,
      ...filters 
    }).then(r => r.data),
    enabled: activeTab === 'orders'
  });

  // Statistics queries
  const { data: statsData } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => paymentsApi.getStats().then(r => r.data),
    enabled: activeTab === 'stats'
  });


  // Transactions query
  const { data: transactionsData } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => paymentsApi.getTransactions(50).then(r => r.data),
    enabled: activeTab === 'transactions'
  });

  // Webhooks query
  const { data: webhooksData } = useQuery({
    queryKey: ['payment-webhooks', page],
    queryFn: () => paymentsApi.getWebhooks({ page, limit: 50 }).then(r => r.data),
    enabled: activeTab === 'webhooks'
  });

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => paymentsApi.cancelOrder(id, reason),
    onSuccess: () => {
      toast.success(t('toast.cancelled'));
      setCancelModal(false);
      setSelectedOrder(null);
      cancelForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error(t('toast.cancelError'))
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => paymentsApi.completeOrder(id, notes),
    onSuccess: () => {
      toast.success(t('toast.completed'));
      setCompleteModal(false);
      setSelectedOrder(null);
      completeForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error(t('toast.completeError'))
  });

  const createTestOrderMutation = useMutation({
    mutationFn: ({ package_id, user_id }: { package_id: number; user_id: number }) => paymentsApi.createTestOrder(package_id, user_id),
    onSuccess: (data) => {
      toast.success(t('toast.testOrderCreated'));
      setTestOrderModal(false);
      testForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      // Test order yaratilgandan keyin payment URL'ini ko'rsatish
      if (data.data?.payment_url) {
        window.open(data.data.payment_url, '_blank');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('toast.testOrderError');
      toast.error(message);
    }
  });

  // Payme integration test queries and mutations
  const { data: paymeTestData, isLoading: paymeTestLoading } = useQuery({
    queryKey: ['payme-test'],
    queryFn: () => paymentsApi.testPaymeIntegration().then(r => r.data),
    enabled: activeTab === 'test'
  });

  const createPaymeTestOrderMutation = useMutation({
    mutationFn: ({ user_id, amount, description }: { user_id: number; amount: number; description: string }) => 
      paymentsApi.createPaymeTestOrder(user_id, amount, description),
    onSuccess: () => {
      toast.success(t('toast.paymeTestCreated'));
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['payme-test'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('toast.paymeTestError');
      toast.error(message);
    }
  });

  // Click.uz integration test queries and mutations
  const { data: clickTestData, isLoading: clickTestLoading } = useQuery({
    queryKey: ['click-test'],
    queryFn: () => paymentsApi.testClickIntegration().then(r => r.data),
    enabled: activeTab === 'test'
  });

  const createClickTestOrderMutation = useMutation({
    mutationFn: ({ user_id, amount, description }: { user_id: number; amount: number; description: string }) => 
      paymentsApi.createClickTestOrder(user_id, amount, description),
    onSuccess: (data) => {
      toast.success(t('toast.clickTestCreated'));
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['click-test'] });
      
      // Test order yaratilgandan keyin payment URL'larini ko'rsatish
      if (data.data?.payment_urls) {
        const { click_button_url, click_card_url } = data.data.payment_urls;
        const confirmResult = window.confirm(t('confirm.clickUrls'));
        
        if (confirmResult) {
          window.open(click_button_url, '_blank');
        } else {
          window.open(click_card_url, '_blank');
        }
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || t('toast.clickTestError');
      toast.error(message);
    }
  });

  const orders = ordersData?.data?.orders || [];
  const total = ordersData?.data?.total || 0;

  // Backend enum value -> translated label (values we don't know are shown as returned)
  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('common:status.pending');
      case 'processing': return t('common:status.processing');
      case 'paid': return t('status.paid');
      case 'cancelled': return t('common:status.cancelled');
      case 'expired': return t('common:status.expired');
      case 'failed': return t('common:status.failed');
      case 'refunded': return t('status.refunded');
      default: return status;
    }
  };

  const productTypeLabel = (type: string) => t(`productTypes.${type}`, { defaultValue: type });

  // Payme `overall_status` ('READY' | 'NOT_CONFIGURED') -> translated label
  const overallStatusLabel = (status?: string) => {
    if (status === 'READY') return t('test.overall.ready');
    if (status === 'NOT_CONFIGURED') return t('test.overall.notConfigured');
    return status || t('common:status.unknown');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge color="yellow"><Clock className="w-3 h-3 mr-1" />{statusLabel(status)}</Badge>;
      case 'paid': return <Badge color="green"><CheckCircle className="w-3 h-3 mr-1" />{statusLabel(status)}</Badge>;
      case 'cancelled': return <Badge color="red"><XCircle className="w-3 h-3 mr-1" />{statusLabel(status)}</Badge>;
      case 'expired': return <Badge color="gray"><XCircle className="w-3 h-3 mr-1" />{statusLabel(status)}</Badge>;
      default: return <Badge color="gray">{statusLabel(status)}</Badge>;
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'coins': return <Badge color="blue">🪙 {t('productTypes.coins')}</Badge>;
      case 'premium': return <Badge color="purple">💎 {t('productTypes.premium')}</Badge>;
      case 'cards': return <Badge color="pink">🎴 {t('productTypes.cards')}</Badge>;
      default: return <Badge color="gray">{productTypeLabel(type)}</Badge>;
    }
  };

  const handleCancel = (data: any) => {
    console.log('Cancelling order:', data);
    cancelMutation.mutate({ id: selectedOrder.id, reason: data.reason });
  };

  const handleComplete = (data: any) => {
    console.log('Completing order:', data);
    completeMutation.mutate({ id: selectedOrder.id, notes: data.notes });
  };

  const handleCreateTestOrder = (data: any) => {
    console.log('Creating test order with data:', data);
    createTestOrderMutation.mutate({ 
      package_id: data.package_id, 
      user_id: data.user_id 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'orders', label: t('tabs.orders'), icon: DollarSign },
            { key: 'transactions', label: t('tabs.transactions'), icon: Clock },
            { key: 'webhooks', label: t('tabs.webhooks'), icon: Eye },
            { key: 'stats', label: t('tabs.stats'), icon: Filter },
            { key: 'test', label: t('tabs.test'), icon: TestTube }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('filters.searchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Status Filter */}
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="pending">{t('common:status.pending')}</option>
                <option value="paid">{t('status.paid')}</option>
                <option value="cancelled">{t('common:status.cancelled')}</option>
                <option value="expired">{t('common:status.expired')}</option>
              </select>

              {/* Product Type Filter */}
              <select 
                value={filters.product_type}
                onChange={(e) => setFilters({...filters, product_type: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('filters.allProducts')}</option>
                <option value="coins">{t('productTypes.coins')}</option>
                <option value="premium">{t('productTypes.premium')}</option>
                <option value="cards">{t('productTypes.cards')}</option>
              </select>

              {/* Date From */}
              <input 
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              {/* Date To */}
              <input 
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearch('');
                  setFilters({ status: '', product_type: '', payment_method: '', date_from: '', date_to: '' });
                }}
              >
                {t('common:actions.clear')}
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {ordersLoading ? (
              <div className="p-8 text-center">{t('common:state.loading')}</div>
            ) : orders.length === 0 ? (
              <EmptyState message={t('empty.orders')} />
            ) : (
              <>
                <Table
                  headers={[
                    t('table.order'),
                    t('common:table.user'),
                    t('table.product'),
                    t('common:table.amount'),
                    t('common:table.status'),
                    t('common:table.date'),
                    t('common:table.actions')
                  ]}
                >
                  {orders.map((order: any) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm">{order.order_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{order.username}</div>
                          <div className="text-sm text-gray-500">{order.first_name} {order.last_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {getProductTypeBadge(order.product_type)}
                          <div className="text-sm text-gray-500 mt-1">{order.package_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{formatNumber(order.amount_som)} {t('common:units.som')}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setSelectedOrder(order);
                              setOrderDetailModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="danger"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCancelModal(true);
                                }}
                              >
                                {t('actions.cancel')}
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCompleteModal(true);
                                }}
                              >
                                {t('actions.complete')}
                              </Button>
                            </>
                          )}
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
        </>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsData && statsData.data && statsData.data.map((stat: any, idx: number) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-2">{productTypeLabel(stat.product_type)} - {statusLabel(stat.status)}</h3>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-gray-500">
                {t('stats.total', { amount: formatNumber(stat.total_amount), currency: t('common:units.som') })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {transactionsData && transactionsData.data ? (
            <Table
              headers={[
                t('table.transactionId'),
                t('table.order'),
                t('common:table.user'),
                t('common:table.amount'),
                t('table.provider'),
                t('common:table.status'),
                t('common:table.date')
              ]}
            >
              {transactionsData.data.map((tx: any) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 font-mono text-sm">{tx.provider_transaction_id || tx.id}</td>
                  <td className="px-4 py-3 font-mono text-sm">{tx.order_number}</td>
                  <td className="px-4 py-3">{tx.username}</td>
                  <td className="px-4 py-3">{formatNumber(tx.amount)} {t('units.tiyin')}</td>
                  <td className="px-4 py-3">
                    <Badge color="blue">{tx.provider}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(tx.created_at)}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState message={t('empty.transactions')} />
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {webhooksData?.data?.webhooks ? (
            <Table
              headers={[
                t('table.provider'),
                t('table.transactionId'),
                t('common:table.status'),
                t('table.request'),
                t('table.response'),
                t('common:table.date')
              ]}
            >
              {webhooksData.data.webhooks.map((webhook: any) => (
                <tr key={webhook.id}>
                  <td className="px-4 py-3">
                    <Badge color="blue">{webhook.provider}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{webhook.transaction_id}</td>
                  <td className="px-4 py-3">
                    <Badge color={webhook.status_code === 200 ? 'green' : 'red'}>
                      {webhook.status_code}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 dark:text-blue-400">{t('webhooks.viewRequest')}</summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(webhook.request_body, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-4 py-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 dark:text-blue-400">{t('webhooks.viewResponse')}</summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(webhook.response_body, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(webhook.processed_at)}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState message={t('empty.webhooks')} />
          )}
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          {/* Payme Integration Status */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('payme.title')}</h2>
            
            {paymeTestLoading ? (
              <div className="text-center py-4">{t('test.loadingStatus')}</div>
            ) : paymeTestData ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  paymeTestData.data?.overall_status === 'READY' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
                }`}>
                  <h3 className={`font-medium ${
                    paymeTestData.data?.overall_status === 'READY' 
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {t('test.statusLine', { status: overallStatusLabel(paymeTestData.data?.overall_status) })}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    paymeTestData.data?.overall_status === 'READY' 
                      ? 'text-green-600 dark:text-green-300'
                      : 'text-red-600 dark:text-red-300'
                  }`}>
                    {paymeTestData.data?.overall_status === 'READY' 
                      ? t('payme.ready')
                      : t('payme.needsConfig')
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('test.configuration')}</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex justify-between">
                        <span>{t('test.merchantId')}:</span>
                        <span className={paymeTestData.data?.config?.merchant_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.config?.merchant_id !== 'NOT_SET' ? t('test.set') : t('test.notSet')}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>{t('test.secretKey')}:</span>
                        <span className={paymeTestData.data?.config?.secret_key !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.config?.secret_key !== 'NOT_SET' ? t('test.set') : t('test.notSet')}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>{t('test.testMode')}:</span>
                        <span>{paymeTestData.data?.config?.test_mode || t('common:status.unknown')}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('test.database')}</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex justify-between">
                        <span>{t('test.ordersTable')}:</span>
                        <span className={paymeTestData.data?.database?.orders_table_exists ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.database?.orders_table_exists ? t('test.exists') : t('test.missing')}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>{t('test.recentOrders24h')}:</span>
                        <span>{paymeTestData.data?.database?.recent_orders_24h || 0}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Test Order Creation */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('payme.testTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('payme.testDescription')}
            </p>
            
            <div className="flex gap-3">
              <Button onClick={() => setTestOrderModal(true)} className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                {t('actions.createTestOrder')}
              </Button>
              
              <Button 
                onClick={() => {
                  const userId = prompt(t('prompts.userId'));
                  const amount = prompt(t('prompts.amount'));
                  if (userId && amount) {
                    createPaymeTestOrderMutation.mutate({
                      user_id: parseInt(userId),
                      amount: parseFloat(amount) * 100, // Convert to tiyin
                      // i18n-ignore: order description stored by the API, not UI text
                      description: 'Admin Payme Test Order'
                    });
                  }
                }}
                variant="outline"
                loading={createPaymeTestOrderMutation.isPending}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {t('actions.createPaymeTest')}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">{t('payme.instructionsTitle')}:</h3>
            <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>{t('payme.steps.step1', { button: t('actions.createTestOrder') })}</li>
              <li>{t('payme.steps.step2')}</li>
              <li>{t('payme.steps.step3')}</li>
              <li>{t('payme.steps.step4')}</li>
              <li>{t('payme.steps.step5')}</li>
              <li>{t('payme.steps.step6', { status: t('status.paid') })}</li>
            </ol>
          </div>
        </div>
      )}

      {/* Click.uz Integration Test Tab (if needed) */}
      {activeTab === 'test' && (
        <div>
        {/* Click.uz Integration Section */}
        <div className="space-y-6">
          {/* Click.uz Integration Status */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('click.title')}</h2>
            
            {clickTestLoading ? (
              <div className="text-center py-4">{t('test.loadingStatus')}</div>
            ) : clickTestData?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('test.serviceId')}</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.service_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.service_id !== 'NOT_SET' ? t('test.set') : t('test.notSet')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('test.merchantId')}</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.merchant_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.merchant_id !== 'NOT_SET' ? t('test.set') : t('test.notSet')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('test.secretKey')}</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.secret_key !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.secret_key !== 'NOT_SET' ? t('test.set') : t('test.notSet')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('test.database')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.database_status === 'Connected' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.database_status === 'Connected' ? t('test.connected') : t('test.disconnected')}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('test.integrationStatus')}: {' '}
                    <span className={
                      clickTestData.data?.config?.service_id !== 'NOT_SET' && 
                      clickTestData.data?.config?.merchant_id !== 'NOT_SET' &&
                      clickTestData.data?.config?.secret_key !== 'NOT_SET'
                      ? 'text-green-600' 
                      : 'text-amber-600'
                    }>
                      {clickTestData.data?.config?.service_id !== 'NOT_SET' && 
                       clickTestData.data?.config?.merchant_id !== 'NOT_SET' &&
                       clickTestData.data?.config?.secret_key !== 'NOT_SET'
                        ? t('click.ready')
                        : t('click.needsConfig')
                      }
                    </span>
                  </p>
                </div>

                {/* Integration Recommendations */}
                {clickTestData.data?.recommendations && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">{t('test.recommendations')}:</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      {clickTestData.data.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-red-600">{t('test.loadError')}</div>
            )}
          </div>

          {/* Click.uz Test Payment Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('click.testTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('click.testDescription')}
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const userId = prompt(t('prompts.userId'));
                  const amount = prompt(t('prompts.amount'));
                  if (userId && amount) {
                    createClickTestOrderMutation.mutate({
                      user_id: parseInt(userId),
                      amount: parseFloat(amount),
                      // i18n-ignore: order description stored by the API, not UI text
                      description: 'Admin Click.uz Test Order'
                    });
                  }
                }}
                variant="outline"
                loading={createClickTestOrderMutation.isPending}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                {t('actions.createClickTest')}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">{t('click.instructionsTitle')}:</h3>
            <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>{t('click.steps.step1', { button: t('actions.createClickTest') })}</li>
              <li>{t('click.steps.step2')}</li>
              <li>{t('click.steps.step3')}</li>
              <li>{t('click.steps.step4')}</li>
              <li>{t('click.steps.step5')}</li>
              <li>{t('click.steps.step6')}</li>
              <li>{t('click.steps.step7', { status: t('status.paid') })}</li>
            </ol>
          </div>
        </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal open={orderDetailModal} onClose={() => setOrderDetailModal(false)} title={t('modal.orderDetails')}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('modal.orderNumber')}</label>
                <div className="font-mono text-gray-900 dark:text-white">{selectedOrder.order_number}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('common:table.status')}</label>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('table.product')}</label>
                {getProductTypeBadge(selectedOrder.product_type)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">{t('common:table.amount')}</label>
                <div className="text-gray-900 dark:text-white">{formatNumber(selectedOrder.amount_som)} {t('common:units.som')}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title={t('actions.cancelOrder')}>
        <form onSubmit={cancelForm.handleSubmit(handleCancel)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{t('modal.cancelReason')}</label>
            <textarea 
              {...cancelForm.register('reason', { required: true })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('modal.cancelReasonPlaceholder')}
            />
            {cancelForm.formState.errors.reason && (
              <p className="text-xs text-red-500 mt-1">{t('validation.reasonRequired')}</p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCancelModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
              {t('actions.cancelOrder')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Order Modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title={t('actions.completeOrder')}>
        <form onSubmit={completeForm.handleSubmit(handleComplete)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{t('modal.notesOptional')}</label>
            <textarea 
              {...completeForm.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder={t('modal.notesPlaceholder')}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCompleteModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" loading={completeMutation.isPending}>
              {t('actions.completeOrder')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Order Modal */}
      <Modal open={testOrderModal} onClose={() => setTestOrderModal(false)} title={t('actions.createTestOrder')}>
        <form onSubmit={testForm.handleSubmit(handleCreateTestOrder)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{t('modal.packageId')}</label>
            <input 
              {...testForm.register('package_id', { required: true, valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('modal.packageIdPlaceholder')}
            />
            {testForm.formState.errors.package_id && (
              <p className="text-xs text-red-500 mt-1">{t('validation.packageIdRequired')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{t('modal.packageIdHint')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{t('modal.userId')}</label>
            <input 
              {...testForm.register('user_id', { required: true, valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('modal.userIdPlaceholder')}
            />
            {testForm.formState.errors.user_id && (
              <p className="text-xs text-red-500 mt-1">{t('validation.userIdRequired')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{t('modal.userIdHint')}</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Trans i18nKey="payments:modal.testNote" components={{ b: <strong /> }} />
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setTestOrderModal(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" loading={createTestOrderMutation.isPending}>
              {t('actions.createTestOrder')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}