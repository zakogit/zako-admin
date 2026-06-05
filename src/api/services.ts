import api from './client';
import type { AuthState, DashboardStats, User, Question, Subject, Topic, CardType, Avatar, Region, Duel, Friendship, AuditLog, PaginatedResponse, ProductPackage, Season, SeasonReward, SeasonStats, UserBadge, LeaderboardEntry } from '../types';

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
  getAll: (params: { 
    page?: number; 
    limit?: number; 
    search?: string;
    is_verified?: string;
    is_banned?: string;
    is_premium?: string;
    region_id?: string;
    date_from?: string;
    date_to?: string;
    is_online?: string;
  }) =>
    api.get<{ success: boolean; data: User[] }>('/admin/users', { params }),
  getById: (id: number) =>
    api.get<{ success: boolean; data: any }>(`/admin/users/${id}`),
  getTransactions: (id: number, params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: any }>(`/admin/users/${id}/transactions`, { params }),
  getStats: () =>
    api.get<{ success: boolean; data: any }>('/admin/users-stats'),
  create: (body: {
    username: string;
    phone_number: string;
    password: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    region_id?: number;
    is_verified?: boolean;
  }) => api.post('/admin/users', body),
  update: (id: number, body: {
    username?: string;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    region_id?: number;
    birthday?: string;
  }) => api.put(`/admin/users/${id}`, body),
  resetPassword: (id: number, body: { new_password: string }) =>
    api.put(`/admin/users/${id}/reset-password`, body),
  updateBalance: (id: number, body: { amount: number; description: string }) =>
    api.put(`/admin/users/${id}/balance`, body),
  ban: (id: number, body: { reason: string }) =>
    api.put(`/admin/users/${id}/ban`, body),
  unban: (id: number) =>
    api.put(`/admin/users/${id}/unban`),
  verify: (id: number) =>
    api.put(`/admin/users/${id}/verify`),
  unverify: (id: number) =>
    api.put(`/admin/users/${id}/unverify`),
  delete: (id: number) =>
    api.delete(`/admin/users/${id}`),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/users/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
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
  upload: (formData: FormData) => api.post<{ success: boolean; data: any }>('/admin/cards/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
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
  upload: (formData: FormData) => api.post<{ success: boolean; data: any }>('/admin/avatars/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFileStructure: () => api.get<{ success: boolean; data: any }>('/admin/avatars/files'),
  deleteFile: (filePath: string) => api.delete<{ success: boolean }>(`/admin/avatars/files`, { data: { path: filePath } }),
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
  getAll: (params?: { page?: number; limit?: number; search?: string; type?: string }) =>
    api.get<{ success: boolean; data: PaginatedResponse<any> }>('/admin/notifications', { params }),
  getStats: () => 
    api.get<{ success: boolean; data: any }>('/admin/notifications/stats'),
  create: (body: {
    title: string;
    message: string;
    type: string;
    target_type: 'all' | 'verified' | 'premium' | 'specific';
    target_users?: number[];
    data?: any;
  }) => api.post('/admin/notifications', body),
  broadcast: (body: {
    title: string;
    message: string;
    type: string;
    data?: any;
    filters?: {
      verified_only?: boolean;
      premium_only?: boolean;
      exclude_banned?: boolean;
    };
  }) => api.post('/admin/notifications/broadcast', body),
  sendToUsers: (body: {
    user_ids: number[];
    title: string;
    message: string;
    type: string;
    data?: any;
  }) => api.post('/admin/notifications/send-to-users', body),
  getTemplates: () =>
    api.get<{ success: boolean; data: any[] }>('/admin/notifications/templates'),
  updateTemplate: (type: string, body: {
    template_title?: string;
    template_message?: string;
    is_active?: boolean;
  }) => api.put(`/admin/notifications/templates/${type}`, body),
  getDeliveryReport: (id: number, params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: any }>(`/admin/notifications/${id}/delivery-report`, { params }),
  delete: (id: number) => 
    api.delete(`/admin/notifications/${id}`),
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

// ── Seasons ───────────────────────────────────────
export const seasonsApi = {
  // Get all seasons
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ success: boolean; data: Season[] }>('/admin/seasons', { params }),
    
  // Get season by ID with details
  getById: (id: number) =>
    api.get<{ success: boolean; data: { season: Season; rewards: SeasonReward[]; stats: SeasonStats } }>(`/admin/seasons/${id}`),
    
  // Create new season
  create: (body: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    banner_image?: string;
    max_participants?: number;
    rewards: Array<{
      day_number: number;
      reward_type: 'coins' | 'avatar' | 'shield' | 'badge' | 'premium_access';
      reward_value: number;
      reward_data?: any;
      is_special_reward?: boolean;
    }>;
  }) => api.post('/admin/seasons', body),
  
  // Update season status
  updateStatus: (id: number, status: 'upcoming' | 'active' | 'completed' | 'cancelled') =>
    api.patch(`/admin/seasons/${id}/status`, { status }),
    
  // Delete season
  delete: (id: number) => api.delete(`/admin/seasons/${id}`),
  
  // Complete season and distribute badges
  complete: (id: number, notes?: string) =>
    api.post(`/admin/seasons/${id}/complete`, { notes }),
    
  // Get season leaderboard
  getLeaderboard: (id: number, limit: number = 50) =>
    api.get<{ success: boolean; data: LeaderboardEntry[] }>(`/admin/seasons/${id}/leaderboard?limit=${limit}`),
    
  // Get season statistics
  getStats: (id: number) =>
    api.get<{ success: boolean; data: SeasonStats }>(`/admin/seasons/${id}/stats`),
    
  // Get season badges
  getBadges: (id: number) =>
    api.get<{ success: boolean; data: UserBadge[] }>(`/admin/seasons/${id}/badges`),
    
  // Check completion status
  getCompletionStatus: (id: number) =>
    api.get<{ success: boolean; data: { is_completed: boolean; badges_distributed: boolean } }>(`/admin/seasons/${id}/completion-status`),
};

// ── Ads ───────────────────────────────────────────
export const adsApi = {
  // Get ads settings
  getSettings: () =>
    api.get<{ success: boolean; data: {
      daily_limit: number;
      coins_per_ad: number;
      ads_enabled: boolean;
      admob_app_id: string;
      rewarded_unit_id: string;
      admob_app_id_android: string;
      admob_app_id_ios: string;
      rewarded_unit_id_android: string;
      rewarded_unit_id_ios: string;
      test_mode: boolean;
    } }>('/admin/ads/settings'),
    
  // Update ads setting
  updateSetting: (setting_key: string, setting_value: string) =>
    api.patch<{ success: boolean; message: string }>('/admin/ads/settings', { setting_key, setting_value }),
    
  // Get analytics
  getAnalytics: (params?: { limit?: number }) =>
    api.get<{ success: boolean; data: {
      top_viewers: Array<{
        username: string;
        first_name?: string;
        last_name?: string;
        total_ads_watched: number;
        total_coins_earned: number;
      }>;
      daily_stats: Array<{
        view_date: string;
        total_views: number;
        total_coins_given: number;
        unique_users: number;
      }>;
      total_stats: {
        total_ad_views: number;
        total_coins_distributed: number;
        total_unique_users: number;
      };
    } }>('/admin/ads/analytics', { params }),
    
  // Get user stats
  getUserStats: () =>
    api.get<{ success: boolean; data: Array<{
      username: string;
      first_name?: string;
      last_name?: string;
      avatar?: string;
      active_days: number;
      total_views: number;
      total_coins_earned: number;
      last_active_date: string;
    }> }>('/admin/ads/users'),
};

// ── Season Flexible Rewards ─────────────────────────────────────────
export const seasonFlexibleApi = {
  // Get seasons list
  getSeasons: () =>
    api.get<{ success: boolean; data: Array<{
      id: number;
      title: string;
      description?: string;
      status: 'upcoming' | 'active' | 'completed' | 'cancelled';
      start_date: string;
      end_date: string;
      total_participants: number;
      premium_pass_price?: number;
      premium_pass_discount_price?: number;
    }> }>('/admin/seasons'),

  // Get season rewards calendar
  getSeasonRewardsCalendar: (seasonId: number) =>
    api.get<{ success: boolean; data: { [day: number]: Array<{
      id: number;
      day_number: number;
      reward_type: string;
      reward_value: number;
      gift_type: 'simple' | 'premium' | 'legendary' | 'exclusive';
      gift_rarity: 'common' | 'rare' | 'epic' | 'legendary';
      gift_category: string;
      gift_icon: string;
      gift_color: string;
      gift_animation: string;
      display_order: number;
      is_active: boolean;
      is_special_reward: boolean;
    }> } }>(`/admin/seasons/${seasonId}/rewards/calendar`),

  // Add flexible rewards
  addFlexibleRewards: (seasonId: number, rewards: Array<{
    day_number: number;
    reward_type: string;
    reward_value: number;
    gift_type?: string;
    gift_rarity?: string;
    gift_category?: string;
    display_order?: number;
    is_special_reward?: boolean;
  }>) =>
    api.post<{ success: boolean; message: string; data: any[] }>
      (`/admin/seasons/${seasonId}/rewards/flexible`, { rewards }),

  // Update reward status
  updateRewardStatus: (rewardId: number, is_active: boolean) =>
    api.patch<{ success: boolean; message: string }>
      (`/admin/seasons/rewards/${rewardId}/status`, { is_active }),

  // Auto-assign gift type
  autoAssignGiftType: (rewardId: number) =>
    api.post<{ success: boolean; message: string; data: any }>
      (`/admin/seasons/rewards/${rewardId}/auto-assign-type`),

  // Get gift type configurations
  getGiftTypes: () =>
    api.get<{ success: boolean; data: Array<{
      id: number;
      type_name: string;
      display_name: string;
      description: string;
      default_color: string;
      default_icon: string;
      default_animation: string;
      min_rarity: string;
      is_active: boolean;
    }> }>('/admin/seasons/gift-types'),

  // Update gift type configuration
  updateGiftType: (id: number, config: any) =>
    api.put<{ success: boolean; message: string }>(`/admin/gift-types/${id}`, config),

  // Get rewards by type
  getRewardsByType: (seasonId: number, giftType: string) =>
    api.get<{ success: boolean; data: any[] }>
      (`/admin/seasons/${seasonId}/rewards/type/${giftType}`),

  // Get rewards by category
  getRewardsByCategory: (seasonId: number, category: string) =>
    api.get<{ success: boolean; data: any[] }>
      (`/admin/seasons/${seasonId}/rewards/category/${category}`),

  // Create reward with gift type
  createRewardWithType: (seasonId: number, rewardData: any) =>
    api.post<{ success: boolean; message: string; data: any }>
      (`/admin/seasons/${seasonId}/rewards/with-type`, rewardData),

  // Delete reward
  deleteReward: (rewardId: number) =>
    api.delete<{ success: boolean; message: string }>(`/admin/seasons/rewards/${rewardId}`),


  // Update reward
  updateReward: (seasonId: number, rewardId: number, rewardData: any) =>
    api.patch<{ success: boolean; message: string; data: any }>(`/admin/seasons/${seasonId}/rewards/${rewardId}`, rewardData),
};

// ── Subscriptions ─────────────────────────────────────
export const subscriptionsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; plan_type?: string }) =>
    api.get<{ success: boolean; data: { subscriptions: any[]; total: number; page: number; limit: number } }>('/admin/subscriptions', { params }),
  
  getStats: () => 
    api.get<{ success: boolean; data: any }>('/admin/subscriptions/stats'),
  
  getById: (id: number) => 
    api.get<{ success: boolean; data: any }>(`/admin/subscriptions/${id}`),
  
  create: (body: { user_id: number; plan_type: 'monthly' | 'yearly'; duration_days: number; notes?: string }) =>
    api.post<{ success: boolean; data: any }>('/admin/subscriptions', body),
  
  update: (id: number, body: { status?: string; auto_renew?: boolean; end_date?: string; notes?: string }) =>
    api.patch<{ success: boolean; data: any }>(`/admin/subscriptions/${id}`, body),
  
  extend: (id: number, body: { additional_days: number; notes?: string }) =>
    api.post<{ success: boolean; data: any }>(`/admin/subscriptions/${id}/extend`, body),
  
  cancel: (id: number, body: { reason: string; immediate?: boolean }) =>
    api.post<{ success: boolean; data: any }>(`/admin/subscriptions/${id}/cancel`, body),
};
