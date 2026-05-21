import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Shield, BarChart3, Activity, User, Database } from 'lucide-react';
import { auditApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { AuditLog } from '../../types';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [viewModal, setViewModal] = useState(false);
  const limit = 20;

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, search, entityFilter, actionFilter],
    queryFn: () => auditApi.getAll({ 
      page, 
      limit, 
      search: search || undefined,
      entity: entityFilter || undefined,
      action: actionFilter || undefined
    }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats().then(r => r.data),
  });

  const auditLogs: AuditLog[] = Array.isArray((auditData as any)?.data) ? (auditData as any).data : [];
  const total: number = (auditData as any)?.total ?? 0;
  const stats = Array.isArray((statsData as any)?.data) ? (statsData as any).data : [];

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'green';
      case 'update': return 'blue';
      case 'delete': return 'red';
      case 'login': return 'purple';
      case 'logout': return 'gray';
      default: return 'blue';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return '+';
      case 'update': return '✎';
      case 'delete': return '×';
      case 'login': return '↵';
      case 'logout': return '↗';
      default: return '•';
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'user': return <User className="w-4 h-4" />;
      case 'question': return <Activity className="w-4 h-4" />;
      case 'subject': return <Database className="w-4 h-4" />;
      case 'card': return <Shield className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
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
          Audit Logs <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={entityFilter} 
            onChange={e => setEntityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Entities</option>
            <option value="user">User</option>
            <option value="question">Question</option>
            <option value="subject">Subject</option>
            <option value="topic">Topic</option>
            <option value="card">Card</option>
            <option value="region">Region</option>
            <option value="avatar">Avatar</option>
          </select>

          <select 
            value={actionFilter} 
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search audit logs..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : auditLogs.length === 0 ? (
          <EmptyState message="No audit logs found" />
        ) : (
          <>
            <Table headers={['Action', 'Entity', 'Admin', 'IP Address', 'Created', '']}>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">
                        {getActionIcon(log.action)}
                      </span>
                      <Badge color={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getEntityIcon(log.entity)}
                      <div>
                        <div className="font-medium">{log.entity}</div>
                        {log.entity_id && (
                          <div className="text-sm text-gray-500">ID: {log.entity_id}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{log.admin_username || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {log.ip_address || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => { setSelected(log); setViewModal(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
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

      {/* View Modal */}
      <Modal open={viewModal} onClose={() => { setViewModal(false); setSelected(null); }} title="Audit Log Details">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Log ID</label>
                <p className="text-sm">{selected.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin</label>
                <p className="text-sm">{selected.admin_username || 'System'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                <Badge color={getActionColor(selected.action)}>{selected.action}</Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Entity</label>
                <p className="text-sm">{selected.entity}</p>
              </div>
            </div>

            {selected.entity_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Entity ID</label>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                  {selected.entity_id}
                </p>
              </div>
            )}

            {selected.ip_address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</label>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                  {selected.ip_address}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
              <p className="text-sm">{formatDate(selected.created_at)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
