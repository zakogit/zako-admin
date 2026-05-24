import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, XCircle, CheckCircle, Clock, DollarSign, TestTube } from 'lucide-react';
import { paymentsApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

export default function PaymentsPage() {
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
      toast.success('Order cancelled successfully');
      setCancelModal(false);
      setSelectedOrder(null);
      cancelForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Failed to cancel order')
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) => paymentsApi.completeOrder(id, notes),
    onSuccess: () => {
      toast.success('Order completed successfully');
      setCompleteModal(false);
      setSelectedOrder(null);
      completeForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Failed to complete order')
  });

  const createTestOrderMutation = useMutation({
    mutationFn: ({ package_id, user_id }: { package_id: number; user_id: number }) => paymentsApi.createTestOrder(package_id, user_id),
    onSuccess: (data) => {
      toast.success('Test order created successfully');
      setTestOrderModal(false);
      testForm.reset();
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      // Test order yaratilgandan keyin payment URL'ini ko'rsatish
      if (data.data?.payment_url) {
        window.open(data.data.payment_url, '_blank');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create test order';
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
      toast.success('Payme test order created successfully');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['payme-test'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create Payme test order';
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
      toast.success('Click.uz test order created successfully');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['click-test'] });
      
      // Test order yaratilgandan keyin payment URL'larini ko'rsatish
      if (data.data?.payment_urls) {
        const { click_button_url, click_card_url } = data.data.payment_urls;
        const confirmResult = window.confirm(
          'Test order yaratildi! Payment URL\'larini ochishni xohlaysizmi?\n\n' +
          'OK - Click Button URL\nCancel - Click Pay by Card URL'
        );
        
        if (confirmResult) {
          window.open(click_button_url, '_blank');
        } else {
          window.open(click_card_url, '_blank');
        }
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create Click.uz test order';
      toast.error(message);
    }
  });

  const orders = ordersData?.data?.orders || [];
  const total = ordersData?.data?.total || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge color="yellow"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'paid': return <Badge color="green"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'cancelled': return <Badge color="red"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'expired': return <Badge color="gray"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default: return <Badge color="gray">{status}</Badge>;
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case 'coins': return <Badge color="blue">🪙 Coins</Badge>;
      case 'premium': return <Badge color="purple">💎 Premium</Badge>;
      case 'cards': return <Badge color="pink">🎴 Cards</Badge>;
      default: return <Badge color="gray">{type}</Badge>;
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
          Payments & Orders
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { key: 'orders', label: 'Orders', icon: DollarSign },
            { key: 'transactions', label: 'Transactions', icon: Clock },
            { key: 'webhooks', label: 'Webhooks', icon: Eye },
            { key: 'stats', label: 'Statistics', icon: Filter },
            { key: 'test', label: 'Test', icon: TestTube }
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
                  placeholder="Search orders..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>

              {/* Status Filter */}
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>

              {/* Product Type Filter */}
              <select 
                value={filters.product_type}
                onChange={(e) => setFilters({...filters, product_type: e.target.value})}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Products</option>
                <option value="coins">Coins</option>
                <option value="premium">Premium</option>
                <option value="cards">Cards</option>
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
                Clear
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {ordersLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : orders.length === 0 ? (
              <EmptyState message="No orders found" />
            ) : (
              <>
                <Table headers={['Order', 'User', 'Product', 'Amount', 'Status', 'Date', 'Actions']}>
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
                        <div className="font-medium">{formatNumber(order.amount_som)} so'm</div>
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
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCompleteModal(true);
                                }}
                              >
                                Complete
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
              <h3 className="font-semibold mb-2">{stat.product_type} - {stat.status}</h3>
              <div className="text-2xl font-bold">{stat.count}</div>
              <div className="text-sm text-gray-500">Total: {formatNumber(stat.total_amount)} so'm</div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {transactionsData && transactionsData.data ? (
            <Table headers={['Transaction ID', 'Order', 'User', 'Amount', 'Provider', 'Status', 'Date']}>
              {transactionsData.data.map((tx: any) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 font-mono text-sm">{tx.provider_transaction_id || tx.id}</td>
                  <td className="px-4 py-3 font-mono text-sm">{tx.order_number}</td>
                  <td className="px-4 py-3">{tx.username}</td>
                  <td className="px-4 py-3">{formatNumber(tx.amount)} tiyin</td>
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
            <EmptyState message="No transactions found" />
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {webhooksData?.data?.webhooks ? (
            <Table headers={['Provider', 'Transaction ID', 'Status', 'Request', 'Response', 'Date']}>
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
                      <summary className="text-sm text-blue-600 dark:text-blue-400">View Request</summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(webhook.request_body, null, 2)}
                      </pre>
                    </details>
                  </td>
                  <td className="px-4 py-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-blue-600 dark:text-blue-400">View Response</summary>
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
            <EmptyState message="No webhook logs found" />
          )}
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          {/* Payme Integration Status */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Payme Integration Status</h2>
            
            {paymeTestLoading ? (
              <div className="text-center py-4">Loading integration status...</div>
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
                    Status: {paymeTestData.data?.overall_status || 'Unknown'}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    paymeTestData.data?.overall_status === 'READY' 
                      ? 'text-green-600 dark:text-green-300'
                      : 'text-red-600 dark:text-red-300'
                  }`}>
                    {paymeTestData.data?.overall_status === 'READY' 
                      ? 'Payme integration is properly configured and ready'
                      : 'Payme integration needs configuration'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Configuration</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex justify-between">
                        <span>Merchant ID:</span>
                        <span className={paymeTestData.data?.config?.merchant_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.config?.merchant_id !== 'NOT_SET' ? '✓ Set' : '✗ Not Set'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Secret Key:</span>
                        <span className={paymeTestData.data?.config?.secret_key !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.config?.secret_key !== 'NOT_SET' ? '✓ Set' : '✗ Not Set'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Test Mode:</span>
                        <span>{paymeTestData.data?.config?.test_mode || 'Unknown'}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Database</h4>
                    <ul className="text-sm space-y-1">
                      <li className="flex justify-between">
                        <span>Orders Table:</span>
                        <span className={paymeTestData.data?.database?.orders_table_exists ? 'text-green-600' : 'text-red-600'}>
                          {paymeTestData.data?.database?.orders_table_exists ? '✓ Exists' : '✗ Missing'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Recent Orders (24h):</span>
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
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Test Payment Integration</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create test orders to verify Payme integration. Choose between regular test order or Payme-specific test order.
            </p>
            
            <div className="flex gap-3">
              <Button onClick={() => setTestOrderModal(true)} className="flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Create Test Order
              </Button>
              
              <Button 
                onClick={() => {
                  const userId = prompt('Enter User ID:');
                  const amount = prompt('Enter Amount (in so\'m):');
                  if (userId && amount) {
                    createPaymeTestOrderMutation.mutate({
                      user_id: parseInt(userId),
                      amount: parseFloat(amount) * 100, // Convert to tiyin
                      description: 'Admin Payme Test Order'
                    });
                  }
                }}
                variant="outline"
                loading={createPaymeTestOrderMutation.isPending}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Create Payme Test
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Test Instructions:</h3>
            <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>1. Click "Create Test Order" button</li>
              <li>2. Fill in package ID and user ID</li>
              <li>3. System will create order and open Payme payment URL</li>
              <li>4. Complete payment in Payme test environment</li>
              <li>5. Check webhook logs to verify payment flow</li>
              <li>6. Verify order status changes to "paid"</li>
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
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Click.uz Integration Status</h2>
            
            {clickTestLoading ? (
              <div className="text-center py-4">Loading integration status...</div>
            ) : clickTestData?.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Service ID</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.service_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.service_id !== 'NOT_SET' ? '✓ Set' : '✗ Not Set'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Merchant ID</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.merchant_id !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.merchant_id !== 'NOT_SET' ? '✓ Set' : '✗ Not Set'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Secret Key</label>
                    <p className="text-sm font-mono text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.config?.secret_key !== 'NOT_SET' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.config?.secret_key !== 'NOT_SET' ? '✓ Set' : '✗ Not Set'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Database</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className={clickTestData.data?.database_status === 'Connected' ? 'text-green-600' : 'text-red-600'}>
                        {clickTestData.data?.database_status === 'Connected' ? '✓ Connected' : '✗ Disconnected'}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Integration Status: {' '}
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
                        ? 'Click.uz integration is properly configured and ready'
                        : 'Click.uz integration needs configuration'
                      }
                    </span>
                  </p>
                </div>

                {/* Integration Recommendations */}
                {clickTestData.data?.recommendations && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Recommendations:</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      {clickTestData.data.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-red-600">Failed to load integration status</div>
            )}
          </div>

          {/* Click.uz Test Payment Section */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Test Click.uz Integration</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create test orders to verify Click.uz integration. This will create both Click Button and Click Pay by Card URLs.
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  const userId = prompt('Foydalanuvchi ID kiriting:');
                  const amount = prompt('Miqdor kiriting (so\'mda):');
                  if (userId && amount) {
                    createClickTestOrderMutation.mutate({
                      user_id: parseInt(userId),
                      amount: parseFloat(amount),
                      description: 'Admin Click.uz Test Order'
                    });
                  }
                }}
                variant="outline"
                loading={createClickTestOrderMutation.isPending}
                className="flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Create Click.uz Test
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Click.uz Test Instructions:</h3>
            <ol className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>1. Click "Create Click.uz Test" button</li>
              <li>2. Fill in user ID and amount (in som)</li>
              <li>3. System will create order and show payment URL options</li>
              <li>4. Choose between Click Button URL or Click Pay by Card URL</li>
              <li>5. Complete payment in Click.uz test environment</li>
              <li>6. Check callback logs to verify payment flow</li>
              <li>7. Verify order status changes to "paid"</li>
            </ol>
          </div>
        </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal open={orderDetailModal} onClose={() => setOrderDetailModal(false)} title="Order Details">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Order Number</label>
                <div className="font-mono text-gray-900 dark:text-white">{selectedOrder.order_number}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Status</label>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Product</label>
                {getProductTypeBadge(selectedOrder.product_type)}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">Amount</label>
                <div className="text-gray-900 dark:text-white">{formatNumber(selectedOrder.amount_som)} so'm</div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order">
        <form onSubmit={cancelForm.handleSubmit(handleCancel)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Cancellation Reason</label>
            <textarea 
              {...cancelForm.register('reason', { required: 'Reason is required' })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Enter reason for cancellation..."
            />
            {cancelForm.formState.errors.reason && (
              <p className="text-xs text-red-500 mt-1">{String(cancelForm.formState.errors.reason?.message)}</p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCancelModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={cancelMutation.isPending}>
              Cancel Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Order Modal */}
      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title="Complete Order">
        <form onSubmit={completeForm.handleSubmit(handleComplete)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Notes (Optional)</label>
            <textarea 
              {...completeForm.register('notes')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              placeholder="Add any notes about manual completion..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setCompleteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={completeMutation.isPending}>
              Complete Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Order Modal */}
      <Modal open={testOrderModal} onClose={() => setTestOrderModal(false)} title="Create Test Order">
        <form onSubmit={testForm.handleSubmit(handleCreateTestOrder)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Package ID *</label>
            <input 
              {...testForm.register('package_id', { required: 'Package ID is required', valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter package ID (e.g., 1)"
            />
            {testForm.formState.errors.package_id && (
              <p className="text-xs text-red-500 mt-1">{String(testForm.formState.errors.package_id?.message)}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">ID of the coin/premium package to test</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">User ID *</label>
            <input 
              {...testForm.register('user_id', { required: 'User ID is required', valueAsNumber: true })}
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter user ID (e.g., 1)"
            />
            {testForm.formState.errors.user_id && (
              <p className="text-xs text-red-500 mt-1">{String(testForm.formState.errors.user_id?.message)}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">ID of the user to create order for</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This will create a real order and open Payme payment URL in new tab. 
              Use test credentials in Payme environment.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setTestOrderModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createTestOrderMutation.isPending}>
              Create Test Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}