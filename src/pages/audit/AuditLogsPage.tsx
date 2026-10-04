import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Shield, Activity, User, Database } from 'lucide-react';
import { auditApi } from '../../api/services';
import { Table, Badge, Button, Pagination, Modal, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';
import type { AuditLog } from '../../types';
import { useTranslation } from 'react-i18next';

export default function AuditLogsPage() {
  const { t } = useTranslation('audit');
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
    }).then(r => r.data.data),
  });

  const auditLogs: AuditLog[] = Array.isArray(auditData?.data) ? auditData.data : [];
  const total: number = auditData?.total ?? 0;

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
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('title')} <span className="text-gray-400 font-normal text-base">({total})</span>
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Filters */}
          <select 
            value={entityFilter} 
            onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allEntities')}</option>
            <option value="user">{t('entity.user')}</option>
            <option value="question">{t('entity.question')}</option>
            <option value="subject">{t('entity.subject')}</option>
            <option value="topic">{t('entity.topic')}</option>
            <option value="card">{t('entity.card')}</option>
            <option value="region">{t('entity.region')}</option>
            <option value="avatar">{t('entity.avatar')}</option>
          </select>

          <select 
            value={actionFilter} 
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('filters.allActions')}</option>
            <option value="create">{t('action.create')}</option>
            <option value="update">{t('action.update')}</option>
            <option value="delete">{t('action.delete')}</option>
            <option value="login">{t('action.login')}</option>
            <option value="logout">{t('action.logout')}</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center">{t('common:state.loading')}</div>
        ) : auditLogs.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <>
            <Table headers={[t('table.action'), t('table.entity'), t('common:table.admin'), t('common:table.ip'), t('common:table.created'), '']}>
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
                      <span className="font-medium">{log.admin_username || t('system')}</span>
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
      <Modal open={viewModal} onClose={() => { setViewModal(false); setSelected(null); }} title={t('modal.title')}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.logId')}</label>
                <p className="text-sm">{selected.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common:table.admin')}</label>
                <p className="text-sm">{selected.admin_username || t('system')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('table.action')}</label>
                <Badge color={getActionColor(selected.action)}>{selected.action}</Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('table.entity')}</label>
                <p className="text-sm">{selected.entity}</p>
              </div>
            </div>

            {selected.entity_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.entityId')}</label>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                  {selected.entity_id}
                </p>
              </div>
            )}

            {selected.ip_address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common:table.ip')}</label>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                  {selected.ip_address}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.timestamp')}</label>
              <p className="text-sm">{formatDate(selected.created_at)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
