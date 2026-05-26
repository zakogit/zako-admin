import api from './client';
import type { AuthState, DashboardStats, User, Question, Subject, Topic, CardType, Avatar, Region, Duel, Friendship, AuditLog, PaginatedResponse } from '../types';

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login: (body: { username: string; password: string }) =>
    api.post<{ success: boolean } & AuthState>('/admin/login', body),
  loginMfa: (body: { adminId: number; token: string }) =>
    api.post<{ success: boolean } & AuthState>('/admin/login/mfa', body),
  logout: (sessionId: string) =>
    api.post('/admin/logout', { sessionId }),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard'),
  getActivity: () => api.get<{ success: boolean; data: any[] }>('/admin/activity'),
};

// ── Users ─────────────────────────────────────────────
export const usersApi = {
  getAll: (params: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; data: User[] }>('/admin/users', { params }),
  updateBalance: (id: number, body: { amount: number; description: string }) =>
    api.put(`/admin/users/${id}/balance`, body),
  ban: (id: number, body: { reason: string }) =>
    api.put(`/admin/users/${id}/ban`, body),
};

// ── Subjects ──────────────────────────────────────────
export const subjectsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; include_inactive?: boolean }) =>
    api.get<{ success: boolean; data: Subject[] }>('/admin/admin-subjects', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/admin-subjects/stats'),
  getById: (id: number) => api.get<{ success: boolean; data: Subject }>(`/admin/admin-subjects/${id}`),
  create: (body: Partial<Subject>) => api.post('/admin/admin-subjects', body),
  update: (id: number, body: Partial<Subject>) => api.put(`/admin/admin-subjects/${id}`, body),
  delete: (id: number) => api.delete(`/admin/admin-subjects/${id}`),
  getAllForDropdown: () => api.get<{ success: boolean; data: Subject[] }>('/admin/admin-subjects'),
};

// ── Topics ────────────────────────────────────────────
export const topicsApi = {
  getAll: (params?: { subject_id?: number; page?: number; limit?: number; search?: string; include_inactive?: boolean }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Topic> }>('/admin/admin-topics', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/admin-topics/stats'),
  getById: (id: number) => api.get<{ success: boolean; data: Topic }>(`/admin/admin-topics/${id}`),
  create: (body: Partial<Topic>) => api.post('/admin/admin-topics', body),
  update: (id: number, body: Partial<Topic>) => api.put(`/admin/admin-topics/${id}`, body),
  delete: (id: number) => api.delete(`/admin/admin-topics/${id}`),
  bulkDelete: (ids: number[]) => api.post('/admin/admin-topics/bulk-delete', { ids }),
  reorder: (orders: { id: number; order_index: number }[]) =>
    api.put('/admin/admin-topics/reorder', { orders }),
  getBySubject: (subjectId: number) =>
    api.get<{ success: boolean; data: PaginatedResponse<Topic> }>(`/admin/admin-topics?subject_id=${subjectId}`),
};

// ── Questions ─────────────────────────────────────────
export const questionsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; subject_id?: number; topic_id?: number; difficulty?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Question> }>('/admin/admin-questions', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/admin-questions/stats'),
  getById: (id: number) => api.get<{ success: boolean; data: Question }>(`/admin/admin-questions/${id}`),
  create: (body: Partial<Question>) => api.post('/admin/admin-questions', body),
  update: (id: number, body: Partial<Question>) => api.put(`/admin/admin-questions/${id}`, body),
  delete: (id: number) => api.delete(`/admin/admin-questions/${id}`),
  bulkDelete: (ids: number[]) => api.post('/admin/admin-questions/bulk-delete', { ids }),
};

// ── Cards ─────────────────────────────────────────────
export const cardsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<CardType> }>('/admin/cards', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/cards/stats'),
  getById: (id: number) => api.get<{ success: boolean; data: CardType }>(`/admin/cards/${id}`),
  create: (body: Partial<CardType>) => api.post('/admin/cards', body),
  update: (id: number, body: Partial<CardType>) => api.put(`/admin/cards/${id}`, body),
  delete: (id: number) => api.delete(`/admin/cards/${id}`),
};

// ── Avatars ───────────────────────────────────────────
export const avatarsApi = {
  getAll: (params?: { page?: number; limit?: number; gender?: string; is_premium?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Avatar> }>('/admin/avatars', { params }),
  getSummary: () => api.get<{ success: boolean; data: any }>('/admin/avatars/summary'),
  getUsage: () => api.get<{ success: boolean; data: any[] }>('/admin/avatars/usage'),
  add: (body: { url: string; gender: string; is_premium: boolean }) => api.post('/admin/avatars', body),
  update: (id: number, body: Partial<Avatar>) => api.put(`/admin/avatars/${id}`, body),
  delete: (id: number) => api.delete(`/admin/avatars/${id}`),
};

// ── Duels ─────────────────────────────────────────────
export const duelsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; subject_id?: number }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Duel> }>('/admin/duels', { params }),
  getActive: () => api.get<{ success: boolean; data: Duel[] }>('/admin/duels/active'),
  getHistory: (params?: { page?: number; limit?: number; subject_id?: number }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Duel> }>('/admin/duels/history', { params }),
  getStats: () => api.get<{ success: boolean; data: any }>('/admin/duels/stats'),
  getQueue: () => api.get<{ success: boolean; data: any[] }>('/admin/duels/queue'),
  delete: (id: number) => api.delete(`/admin/duels/${id}`),
};

// ── Friends ───────────────────────────────────────────
export const friendsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Friendship> }>('/admin/friends-admin', { params }),
  getRelationships: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<Friendship> }>('/admin/friends-admin/relationships', { params }),
  getRequests: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: Friendship[] }>('/admin/friends-admin/requests', { params }),
  getStats: () => api.get<{ success: boolean; data: any }>('/admin/friends-admin/stats'),
  delete: (id: string) => api.delete(`/admin/friends-admin/${id}`),
};

// ── Audit Logs ────────────────────────────────────────
export const auditApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; entity?: string; action?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<AuditLog> }>('/admin/audit-logs', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/audit-logs/stats'),
  getLogs: (params?: { page?: number; limit?: number; action?: string }) =>
    api.get<{ success: boolean; data: AuditLog[] }>('/admin/audit-logs', { params }),
};

// ── Notifications ─────────────────────────────────────
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<any> }>('/admin/notifications', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/notifications/stats'),
  create: (body: any) => api.post('/admin/notifications', body),
  update: (id: number, body: any) => api.put(`/admin/notifications/${id}`, body),
  delete: (id: number) => api.delete(`/admin/notifications/${id}`),
  send: (id: number) => api.post(`/admin/notifications/${id}/send`),
};

// ── Payments & Orders ─────────────────────────────────
export const paymentsApi = {
  // Orders
  getOrders: (params?: { page?: number; limit?: number; status?: string; product_type?: string; payment_method?: string; search?: string; date_from?: string; date_to?: string }) =>
    api.get<{ success: boolean; data: { orders: any[]; total: number; page: number; limit: number; totalPages: number } }>('/admin/orders', { params }),
  getOrderById: (id: number) => 
    api.get<{ success: boolean; data: any }>(`/admin/orders/${id}`),
  cancelOrder: (id: number, reason: string) => 
    api.post(`/admin/orders/${id}/cancel`, { reason }),
  completeOrder: (id: number, notes?: string) => 
    api.post(`/admin/orders/${id}/complete`, { notes }),
  
  // Statistics
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/payments/stats'),
  getRevenue: (days?: number) => api.get<{ success: boolean; data: any[] }>('/admin/payments/revenue', { params: { days } }),
  getTopProducts: (limit?: number) => api.get<{ success: boolean; data: any[] }>('/admin/payments/top-products', { params: { limit } }),
  
  // Transactions
  getTransactions: (limit?: number) => api.get<{ success: boolean; data: any[] }>('/admin/payments/transactions', { params: { limit } }),
  getFailedPayments: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { transactions: any[]; total: number } }>('/admin/payments/failed', { params }),
  
  // Webhooks
  getWebhooks: (params?: { page?: number; limit?: number; provider?: string }) =>
    api.get<{ success: boolean; data: { webhooks: any[]; page: number; limit: number } }>('/admin/payments/webhooks', { params }),
  
  // Testing
  createTestOrder: (package_id: number, user_id: number) =>
    api.post('/admin/payments/test', { package_id, user_id }),
    
  // Payme Integration Testing
  testPaymeIntegration: () =>
    api.get<{ success: boolean; data: any }>('/admin/payme/test-integration'),
  createPaymeTestOrder: (user_id: number, amount: number, description: string) =>
    api.post('/admin/payme/create-test-order', { user_id, amount, description }),
    
  // Click.uz Integration Testing
  testClickIntegration: () =>
    api.get<{ success: boolean; data: any }>('/admin/click/test-integration'),
  createClickTestOrder: (user_id: number, amount: number, description: string) =>
    api.post('/admin/click/create-test-order', { user_id, amount, description }),
};

// ── Regions ───────────────────────────────────────────
export const regionsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ success: boolean; data: { data: Region[]; total: number; page: number; limit: number } }>('/admin/regions-admin', { params }),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/regions-admin/stats'),
  create: (body: { name: string }) => api.post('/admin/regions-admin', body),
  update: (id: number, body: { name: string }) => api.put(`/admin/regions-admin/${id}`, body),
  delete: (id: number) => api.delete(`/admin/regions-admin/${id}`),
};

export const storeApi = {
  getPackages: () => api.get<{ success: boolean; data: ProductPackage[] }>('/admin/store-packages'),
  createPackage: (body: {
    name: string;
    description?: string;
    product_type: 'coins' | 'premium' | 'cards';
    price_som: number;
    package_data?: any;
    is_active?: boolean;
  }) => api.post('/admin/store-packages', body),
  updatePackage: (id: number, body: {
    name?: string;
    description?: string;
    product_type?: 'coins' | 'premium' | 'cards';
    price_som?: number;
    package_data?: any;
    is_active?: boolean;
  }) => api.put(`/admin/store-packages/${id}`, body),
  deletePackage: (id: number) => api.delete(`/admin/store-packages/${id}`),
  getStats: () => api.get<{ success: boolean; data: any[] }>('/admin/store-packages/stats'),
};
