import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  ListChecks,
  AlertTriangle,
  Diamond,
  Coins,
  Search,
  X,
} from 'lucide-react';
import { aiTestsApi } from '../../api/services';
import type { AiTestFilters } from '../../types';
import {
  Table,
  Badge,
  Button,
  Input,
  Select,
  Pagination,
  EmptyState,
  StatCard,
  Card,
} from '../../components/ui';
import {
  STATUS_LABELS,
  ACTIVE_STATUSES,
  MODEL_LABELS,
  SOURCE_LABELS,
  userLabel,
  testDuration,
} from './shared';

const LIMIT = 20;
const EMPTY_FILTERS: AiTestFilters = {};

export default function AiTestsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AiTestFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState('');

  /** Filtr o'zgarsa doim birinchi sahifaga qaytamiz — aks holda bo'sh sahifa chiqadi. */
  const applyFilter = (patch: AiTestFilters) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-tests', page, filters],
    queryFn: () => aiTestsApi.getAll({ ...filters, page, limit: LIMIT }).then((r) => r.data),
    // Navbatdagi/yaratilayotgan test bo'lsa jonli yangilanadi
    refetchInterval: (query) =>
      query.state.data?.data?.some((t) => ACTIVE_STATUSES.includes(t.status)) ? 3000 : false,
  });

  const { data: stats } = useQuery({
    queryKey: ['ai-tests-stats', filters],
    queryFn: () => aiTestsApi.getStats(filters).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const tests = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" /> AI Testlar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Foydalanuvchilar olmosga yaratgan testlar — holati, xarajati va kontenti
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Jami testlar"
            value={stats.totals.total}
            icon={<ListChecks className="w-5 h-5" />}
            subtitle={`${stats.totals.success_rate}% muvaffaqiyatli`}
          />
          <StatCard
            title="Yiqilganlar"
            value={stats.totals.failed}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-500"
            subtitle={`${stats.totals.active} ta jarayonda`}
          />
          <StatCard
            title="Sarflangan olmos"
            value={stats.totals.diamonds_spent}
            icon={<Diamond className="w-5 h-5" />}
            subtitle={`${stats.totals.diamonds_refunded} qaytarilgan`}
          />
          <StatCard
            title="AI xarajati"
            value={`$${stats.totals.cost_usd}`}
            icon={<Coins className="w-5 h-5" />}
            subtitle={`o'rtacha ${stats.totals.avg_seconds}s generatsiya`}
          />
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <form
            className="lg:col-span-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilter({ q: search.trim() || undefined });
            }}
          >
            <Input
              label="Qidiruv"
              placeholder="Fan, mavzu, username yoki ism"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <Select
            label="Status"
            value={filters.status ?? ''}
            onChange={(e) => applyFilter({ status: e.target.value || undefined })}
          >
            <option value="">Barchasi</option>
            {Object.entries(STATUS_LABELS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            label="AI daraja"
            value={filters.model ?? ''}
            onChange={(e) => applyFilter({ model: e.target.value || undefined })}
          >
            <option value="">Barchasi</option>
            {Object.entries(MODEL_LABELS).map(([value, m]) => (
              <option key={value} value={value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select
            label="Manba"
            value={filters.source_type ?? ''}
            onChange={(e) => applyFilter({ source_type: e.target.value || undefined })}
          >
            <option value="">Barchasi</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            label="Sanadan"
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => applyFilter({ from: e.target.value || undefined })}
          />
          <Input
            label="Sanagacha"
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => applyFilter({ to: e.target.value || undefined })}
          />
          <div className="flex items-end gap-2">
            <Button
              variant="secondary"
              onClick={() => applyFilter({ q: search.trim() || undefined })}
            >
              <Search className="w-4 h-4" /> Qidirish
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                <X className="w-4 h-4" /> Tozalash
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Table
        headers={[
          'ID',
          'Foydalanuvchi',
          'Fan / Mavzu',
          'Manba',
          'Daraja',
          'Savol',
          'Status',
          'Olmos',
          'Xarajat',
          'Davomiylik',
          'Sana',
        ]}
        loading={isLoading}
      >
        {tests.length === 0 && !isLoading ? (
          <tr>
            <td colSpan={11}>
              <EmptyState message={hasFilters ? 'Filtrga mos test topilmadi' : 'Hali test yaratilmagan'} />
            </td>
          </tr>
        ) : (
          tests.map((test) => {
            const st = STATUS_LABELS[test.status] ?? { label: test.status, color: 'gray' as const };
            const md = MODEL_LABELS[test.model] ?? { label: test.model, color: 'gray' as const };
            const active = ACTIVE_STATUSES.includes(test.status);
            return (
              <tr
                key={test.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => navigate(`/ai-tests/${test.id}`)}
              >
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">#{test.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {userLabel(test)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                  {test.subject_name ? (
                    <>
                      {test.subject_name}
                      {test.topic_name && (
                        <span className="text-gray-400"> · {test.topic_name}</span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {SOURCE_LABELS[test.source_type] ?? test.source_type}
                </td>
                <td className="px-4 py-3">
                  <Badge color={md.color}>{md.label}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {test.question_count}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge color={st.color}>{st.label}</Badge>
                    {active && <span className="text-xs text-gray-400">{test.progress}%</span>}
                    {test.refunded && <Badge color="orange">qaytarilgan</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {test.diamonds_spent}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  ${test.cost_usd}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {testDuration(test)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(test.created_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })
        )}
      </Table>

      <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
    </div>
  );
}
