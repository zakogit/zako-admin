import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Swords, Layers, Activity, RefreshCw } from 'lucide-react';
import { dashboardApi } from '../../api/services';
import { StatCard, Card, Badge } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/helpers';

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data.data),
    refetchInterval: 30000,
  });
  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getActivity().then(r => r.data.data),
    refetchInterval: 60000,
  });
  // Real 7-kunlik grafik (avval Math.random mock edi)
  const { data: chartData } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => dashboardApi.getChart().then(r => r.data.data),
    refetchInterval: 60000,
  });
  // Real system health (avval hardcoded "Online" edi)
  const { data: health } = useQuery({
    queryKey: ['dashboard-health'],
    queryFn: () => dashboardApi.getHealth().then(r => r.data.data),
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Real-time platform statistics</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={isLoading ? '—' : formatNumber(data?.totalUsers ?? 0)} icon={<Users className="w-6 h-6" />} color="bg-primary-600" subtitle="Verified accounts" />
        <StatCard title="Online Now" value={isLoading ? '—' : formatNumber(data?.onlineUsers ?? 0)} icon={<Activity className="w-6 h-6" />} color="bg-green-600" subtitle="Active sessions" />
        <StatCard title="Active Duels" value={isLoading ? '—' : formatNumber(data?.activeDuels ?? 0)} icon={<Swords className="w-6 h-6" />} color="bg-orange-600" subtitle="Live games" />
        <StatCard title="Cards Sold" value={isLoading ? '—' : formatNumber(data?.cardsSold ?? 0)} icon={<Layers className="w-6 h-6" />} color="bg-purple-600" subtitle="Total inventory" />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activity Overview</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-primary-500 inline-block rounded"></span>Users</span>
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded"></span>Duels</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData ?? []}>
              <defs>
                <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDuels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }} />
              <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#gUsers)" />
              <Area type="monotone" dataKey="duels" stroke="#f97316" strokeWidth={2} fill="url(#gDuels)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(activity ?? []).slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.type?.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.user1 || item.user || '—'}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.timestamp ? formatDate(item.timestamp).split(',')[1]?.trim() : ''}</span>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'API Server', key: 'api' as const },
            { label: 'Database', key: 'database' as const },
            { label: 'Redis Cache', key: 'redis' as const },
            { label: 'WebSocket', key: 'websocket' as const },
          ].map(s => {
            const state = health?.[s.key];
            const online = state === 'online';
            return (
              <div key={s.label} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                <Badge color={!health ? 'gray' : online ? 'green' : 'red'}>
                  {!health ? '—' : online ? 'Online' : 'Offline'}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
