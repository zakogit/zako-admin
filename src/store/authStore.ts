import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '../types';

interface AuthStore {
  token: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  login: (data: { accessToken: string; refreshToken: string; sessionId: string; adminId: number; role: string; username?: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      sessionId: null,
      admin: null,
      isAuthenticated: false,
      login: (data) => {
        localStorage.setItem('adminToken', data.accessToken);
        localStorage.setItem('adminRefreshToken', data.refreshToken);
        set({
          token: data.accessToken,
          refreshToken: data.refreshToken,
          sessionId: data.sessionId,
          admin: { adminId: data.adminId, username: data.username || '', email: '', role: data.role as any },
          isAuthenticated: true,
        });
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        set({ token: null, refreshToken: null, sessionId: null, admin: null, isAuthenticated: false });
      },
    }),
    { name: 'zako-admin-auth', partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, sessionId: s.sessionId, admin: s.admin, isAuthenticated: s.isAuthenticated }) }
  )
);
