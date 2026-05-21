import { Menu, Moon, Sun, Bell } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Dashboard', '/users': 'Users', '/questions': 'Questions',
  '/subjects': 'Subjects', '/topics': 'Topics', '/cards': 'Cards',
  '/avatars': 'Avatars', '/duels': 'Duels', '/friends': 'Friends',
  '/regions': 'Regions', '/notifications': 'Notifications', '/audit-logs': 'Audit Logs',
};

export default function Header() {
  const { toggleSidebar, toggleDarkMode, darkMode } = useUIStore();
  const { admin } = useAuthStore();
  const { pathname } = useLocation();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{titles[pathname] || 'Admin'}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleDarkMode} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition relative">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {admin?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{admin?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{admin?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
