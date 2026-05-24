import { cn } from '../../utils/helpers';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 focus:ring-gray-400',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-400',
      outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-400',
    };
    const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2' };

    return (
      <button ref={ref} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading && <svg className="animate-spin -ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

interface BadgeProps { children: React.ReactNode; color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'pink' | 'orange'; size?: 'sm' | 'md'; }
export function Badge({ children, color = 'gray', size = 'md' }: BadgeProps) {
  const colors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
  };
  return <span className={cn('inline-flex items-center rounded-full font-medium', colors[color], sizes[size])}>{children}</span>;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
    <input ref={ref} className={cn('block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition', error && 'border-red-500', className)} {...props} />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className, children, ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
    <select ref={ref} className={cn('block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition', error && 'border-red-500', className)} {...props}>{children}</select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
Select.displayName = 'Select';

interface CardProps { children: React.ReactNode; className?: string; }
export function Card({ children, className }: CardProps) {
  return <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm', className)}>{children}</div>;
}

interface StatCardProps { title: string; value: string | number; icon: React.ReactNode; color?: string; subtitle?: string; }
export function StatCard({ title, value, icon, color = 'bg-primary-500', subtitle }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-xl text-white', color)}>{icon}</div>
      </div>
    </Card>
  );
}

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl animate-slide-in', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return <svg className={cn('animate-spin text-primary-600', s[size])} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>;
}

export function EmptyState({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

interface TableProps { headers: string[]; children: React.ReactNode; loading?: boolean; }
export function Table({ headers, children, loading }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>{headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {loading ? (
            <tr><td colSpan={headers.length} className="py-12 text-center"><div className="flex justify-center"><Spinner /></div></td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps { page: number; total: number; limit: number; onChange: (p: number) => void; }
export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">Showing {Math.min((page-1)*limit+1, total)}–{Math.min(page*limit, total)} of {total}</p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => onChange(page-1)} disabled={page <= 1}>← Prev</Button>
        <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{page} / {pages}</span>
        <Button variant="outline" size="sm" onClick={() => onChange(page+1)} disabled={page >= pages}>Next →</Button>
      </div>
    </div>
  );
}

// Export LazyImage component  
export { LazyImage } from './LazyImage';
