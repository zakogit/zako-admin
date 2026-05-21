import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode;
        document.documentElement.classList.toggle('dark', next);
        return { darkMode: next };
      }),
    }),
    { name: 'zako-admin-ui' }
  )
);
