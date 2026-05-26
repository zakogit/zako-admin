import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n);
}

export function difficultyColor(d: string) {
  return d === 'easy' ? 'text-green-500' : d === 'medium' ? 'text-yellow-500' : 'text-red-500';
}

export function statusBadge(active: boolean) {
  return active
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

export function formatDuration(startDate: Date, endDate: Date): string {
  const diffInMs = endDate.getTime() - startDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays}d ${diffInHours % 24}h`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h ${diffInMinutes % 60}m`;
  } else {
    return `${diffInMinutes}m`;
  }
}

/**
 * Convert relative URL to absolute URL for static files
 * In development: uses proxy (relative URLs work)
 * In production: uses VITE_BACKEND_URL environment variable
 */
export function getStaticFileUrl(relativePath: string): string {
  // If already absolute URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // Backend should already return /uploads/... paths
  // But if it doesn't, normalize it
  let normalizedPath = relativePath;
  if (!normalizedPath.startsWith('/uploads/')) {
    if (normalizedPath.startsWith('/')) {
      // Already starts with /, just prepend uploads
      normalizedPath = `/uploads${normalizedPath}`;
    } else {
      // No leading /, add both / and uploads/
      normalizedPath = `/uploads/${normalizedPath}`;
    }
  }
  
  // Always use backend URL for uploads
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  return `${backendUrl}${normalizedPath}`;
}
