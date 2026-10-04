import { Menu, Moon, Sun, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import { navKeyForPath } from './navItems';

export default function Header() {
  const { toggleSidebar, toggleDarkMode, darkMode } = useUIStore();
  const { admin } = useAuthStore();
  const { pathname } = useLocation();
  const { t } = useTranslation('layout');

  const navKey = navKeyForPath(pathname);
  const title = navKey ? t(`nav.${navKey}`) : t('fallbackTitle');
  const themeLabel = darkMode ? t('theme.toLight') : t('theme.toDark');
  const roleLabel = admin?.role ? t(`common:roles.${admin.role}`, { defaultValue: admin.role.replace('_', ' ') }) : '';

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} aria-label={t('toggleSidebar')} title={t('toggleSidebar')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <button onClick={toggleDarkMode} aria-label={themeLabel} title={themeLabel} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button aria-label={t('notifications')} title={t('notifications')} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition relative">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {admin?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{admin?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
