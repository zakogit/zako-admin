import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('adminRefreshToken');
      if (refresh) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/admin/refresh`, { refreshToken: refresh });
          if (data.success) {
            localStorage.setItem('adminToken', data.accessToken);
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(original);
          }
        } catch {
          // fall through to logout
        }
      }
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
