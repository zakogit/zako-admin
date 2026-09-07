import api from './client';
import type { AuthState, DashboardStats, User, Question, Subject, Topic, CardType, Avatar, Region, Duel, Friendship, AuditLog, PaginatedResponse, ProductPackage, Season, SeasonStats, BadgeType, UserBadge, LeaderboardEntry, League, Book, BookTopic, BookPage, GenerationJob, GeneratedQuestion, GenEstimate, AiStats, DraftsSummary, Article, AiTest, AiTestDetail, AiTestQuestion, AiTestStats, AiTestFilters } from '../types';

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
export interface ChartPoint { day: string; users: number; duels: number }
export interface SystemHealth {
  api: 'online' | 'offline';
  database: 'online' | 'offline';
  redis: 'online' | 'offline';
  websocket: 'online' | 'offline';
}
export interface GiftUsage { type: string; count: number; percentage: number }

// Product analytics (DAU/WAU/MAU, retention, duel completion, win rate) — "ZAKO - Dashboard" spec
export interface RetentionPoint { day: number; rate: number | null; cohort_size: number; returned: number }
export interface DuelModeStat { mode: 'bot' | 'random' | 'friend'; started: number; finished: number; rate: number | null }
export interface TopPlayer {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  xp: number;
  rating: number;
  total_duels: number;
  won_duels: number;
  win_rate: number | null;
  league: string | null;
}
export interface DashboardAnalytics {
  users: { total: number; online: number; new_today: number; new_7d: number; prev_7d: number; growth_7d_pct: number | null };
  active: { dau: number; dau_yesterday: number; wau: number; mau: number; stickiness: number | null };
  retention: { d1: RetentionPoint; d7: RetentionPoint; d30: RetentionPoint };
  duels: { today: number; active_now: number; started_30d: number; finished_30d: number; completion_rate: number | null; by_mode: DuelModeStat[] };
  win_rate: { players: number; avg_win_rate: number | null; buckets: { label: string; users: number }[] };
  questions: { answered_today: number; correct_today: number; correct_rate: number | null };
  top_player: TopPlayer | null;
  cards_sold: number;
  generated_at: string;
}
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  weekday: string;
  dau: number;
  new_users: number;
  duels: number;
  duels_finished: number;
  questions: number;
}
export interface XpBucket { league: string; min_xp: number; max_xp: number; users: number }
export interface QuestionStatRow {
  id: number;
  question_text: string;
  difficulty: string;
  subject: string | null;
  attempts: number;
  correct: number;
  wrong: number;
  correct_rate: number;
}
export interface QuestionStats {
  total_attempts: number;
  hardest: QuestionStatRow[];
  by_difficulty: { difficulty: string; attempts: number; correct: number; correct_rate: number | null }[];
}

export const dashboardApi = {
  getStats: () => api.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard'),
  getActivity: () => api.get<{ success: boolean; data: any[] }>('/admin/activity'),
  getChart: () => api.get<{ success: boolean; data: ChartPoint[] }>('/admin/dashboard/chart'),
  getHealth: () => api.get<{ success: boolean; data: SystemHealth }>('/admin/dashboard/health'),
  getGiftTypeUsage: () =>
    api.get<{ success: boolean; data: GiftUsage[] }>('/admin/gift-type-usage'),
  getAnalytics: () =>
    api.get<{ success: boolean; data: DashboardAnalytics }>('/admin/dashboard/analytics'),
  getTrends: (days: number) =>
    api.get<{ success: boolean; data: TrendPoint[] }>('/admin/dashboard/trends', { params: { days } }),
  getXpDistribution: () =>
    api.get<{ success: boolean; data: XpBucket[] }>('/admin/dashboard/xp-distribution'),
  getQuestionStats: (params?: { limit?: number; min?: number }) =>
    api.get<{ success: boolean; data: QuestionStats }>('/admin/dashboard/question-stats', { params }),
};

// ── Users ─────────────────────────────────────────────
export interface UserDuelRow {
  id: number;
  status: string;
  subject_name: string | null;
  is_bot_game: boolean;
  opponent_id: number | null;
  opponent_username: string | null;
  my_score: number;
  opponent_score: number;
  result: 'won' | 'lost' | 'draw' | null;
  xp_change: number | null;
  duration_seconds: number | null;
  created_at: string;
  finished_at: string | null;
}
export interface UserDeviceRow {
  id: number;
  platform: string;
  app_version: string;
  device_info: Record<string, unknown> | null;
  token_preview: string;
  created_at: string;
  updated_at: string;
}
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
  adjustXp: (id: number, body: { delta: number; description?: string }) =>
    api.put<{ success: boolean; message: string; data: { previous_xp: number; xp: number } }>(`/admin/users/${id}/xp`, body),
  getDuels: (id: number, params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { data: UserDuelRow[]; total: number; page: number; limit: number } }>(`/admin/users/${id}/duels`, { params }),
  getDevices: (id: number) =>
    api.get<{ success: boolean; data: UserDeviceRow[] }>(`/admin/users/${id}/devices`),
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
  setPremium: (id: number, is_premium: boolean) =>
    api.patch(`/admin/premium-cards/${id}/premium-status`, { is_premium }),
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
/** Admin-editable duel config (duel_settings) — vaqt variantlari, savollar soni, XP qoidalari */
export interface DuelConfig {
  timeOptions: number[];
  defaultSeconds: number;
  questionCount: number;
  xpWin: number;
  xpLose: number;
  xpDraw: number;
}
export interface ReplayFlag {
  code: 'fast_perfect' | 'instant_answers' | 'perfect_score' | 'high_win_rate';
  severity: 'low' | 'medium' | 'high';
  text: string;
}
export interface ReplayAnswer {
  selected_option_id: number | null;
  is_correct: boolean;
  answered_at: string;
  seconds_from_start: number;
}
export interface ReplayPlayer {
  id: number | null;
  username: string | null;
  is_bot?: boolean;
  score: number;
  answered: number;
  correct: number;
  accuracy: number | null;
  avg_gap_seconds: number | null;
  min_gap_seconds: number | null;
  xp_change: number | null;
  flags: ReplayFlag[];
}
export interface DuelReplay {
  duel: {
    id: number;
    status: string;
    subject_name: string | null;
    is_bot_game: boolean;
    is_draw: boolean;
    ai_test_id: number | null;
    duration_seconds: number | null;
    created_at: string;
    finished_at: string | null;
    winner_id: number | null;
    winner_username: string | null;
    questions_total: number;
  };
  players: { p1: ReplayPlayer; p2: ReplayPlayer };
  questions: {
    index: number;
    id: number;
    text: string | null;
    difficulty: string | null;
    image_url: string | null;
    options: { id: number; text: string; is_correct: boolean }[];
    p1: ReplayAnswer | null;
    p2: ReplayAnswer | null;
  }[];
}
export const duelsApi = {
  getReplay: (id: number) => api.get<{ success: boolean; data: DuelReplay }>(`/admin/duels/${id}/replay`),
  getConfig: () => api.get<{ success: boolean; data: DuelConfig }>('/admin/duels/config'),
  updateConfig: (body: {
    time_options?: number[];
    default_duel_time?: number;
    questions_per_duel?: number;
    xp_win?: number;
    xp_lose?: number;
    xp_draw?: number;
  }) => api.put<{ success: boolean; message: string; data: DuelConfig }>('/admin/duels/config', body),
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; subject_id?: number; sort?: string }) =>
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
    image_url?: string | null;
  }) => api.post('/admin/notifications', body),
  broadcast: (body: {
    title: string;
    message: string;
    type: string;
    data?: any;
    image_url?: string | null;
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
    image_url?: string | null;
  }) => api.post('/admin/notifications/send-to-users', body),
  uploadImage: (formData: FormData) =>
    api.post<{ success: boolean; data: { url: string } }>('/admin/notifications/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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

// ── Leagues ───────────────────────────────────────────
export const leaguesApi = {
  getAll: () => api.get<{ success: boolean; data: League[] }>('/admin/leagues'),
  create: (body: {
    name: string;
    description?: string;
    min_xp: number;
    max_xp: number;
    sort_order?: number;
    is_active?: boolean;
  }) => api.post<{ success: boolean; data: League }>('/admin/leagues', body),
  update: (id: number, body: Partial<Omit<League, 'id' | 'created_at' | 'updated_at'>>) =>
    api.put<{ success: boolean; data: League }>(`/admin/leagues/${id}`, body),
  uploadIcon: (id: number, formData: FormData) =>
    api.post<{ success: boolean; data: League }>(`/admin/leagues/${id}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/admin/leagues/${id}`),
};

// ── Articles (Maqolalar) ──────────────────────────────
export const articlesApi = {
  getAll: () => api.get<{ success: boolean; data: Article[] }>('/admin/articles'),
  getById: (id: number) =>
    api.get<{ success: boolean; data: Article }>(`/admin/articles/${id}`),
  create: (body: { title: string; body: string; excerpt?: string; is_published?: boolean }) =>
    api.post<{ success: boolean; data: Article }>('/admin/articles', body),
  update: (id: number, body: Partial<Omit<Article, 'id' | 'slug' | 'created_at' | 'updated_at'>>) =>
    api.put<{ success: boolean; data: Article }>(`/admin/articles/${id}`, body),
  uploadCover: (id: number, formData: FormData) =>
    api.post<{ success: boolean; data: Article }>(`/admin/articles/${id}/cover`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/admin/articles/${id}`),
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
    api.get<{ success: boolean; data: { season: Season; stats: SeasonStats } }>(`/admin/seasons/${id}`),

  // Create new season
  create: (body: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    banner_image?: string;
    max_participants?: number;
  }) => api.post('/admin/seasons', body),

  // Update season
  update: (id: number, body: Record<string, any>) =>
    api.patch<{ success: boolean; message: string; data: Season }>(`/admin/seasons/${id}`, body),

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

  // Get badge catalog (champion / top10 / top50 / top100)
  getBadgeTypes: () =>
    api.get<{ success: boolean; data: BadgeType[] }>('/admin/badge-types'),

  // Check completion status
  getCompletionStatus: (id: number) =>
    api.get<{ success: boolean; data: { is_completed: boolean; badges_distributed: boolean } }>(`/admin/seasons/${id}/completion-status`),

  // Get season overview stats
  getOverviewStats: () =>
    api.get<{ success: boolean; data: any }>('/admin/seasons/overview/stats'),
};

// ── Daily Rewards (kunlik sovg'a "spravochnik" + premium config) ───────────
export interface DailyRewardSlot {
  id?: number;
  day_number?: number;
  reward_date?: string;
  is_premium: boolean;
  reward_type: 'coins' | 'avatar' | 'card';
  amount: number;
  ref_id: number | null;
  title: string | null;
  description: string | null;
  is_active: boolean;
  source?: 'template' | 'override';
}
export interface CalendarDay {
  date: string;
  day_number: number;
  regular: DailyRewardSlot | null;
  premium: DailyRewardSlot | null;
}
export interface RewardCalendarConfig {
  cycle_anchor: string;
  cycle_length: number;
  daily_xp_required: number;
}
export interface PremiumConfig {
  price_som: number;
  duration_days: number;
  is_purchasable: boolean;
  discount_price: number | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  is_discount_active?: boolean;
  effective_price?: number;
}

export const dailyRewardsApi = {
  // Shablon (30 kunlik spravochnik)
  getTemplates: () =>
    api.get<{ success: boolean; data: DailyRewardSlot[] }>('/admin/daily-rewards/templates'),
  upsertTemplate: (body: {
    day_number: number;
    is_premium: boolean;
    reward_type: 'coins' | 'avatar' | 'card';
    amount?: number;
    ref_id?: number | null;
    title?: string | null;
    description?: string | null;
    is_active?: boolean;
  }) => api.put('/admin/daily-rewards/templates', body),
  deleteTemplate: (day: number, tier: 'regular' | 'premium') =>
    api.delete('/admin/daily-rewards/templates', { params: { day, tier } }),

  // Kalendar (override)
  getCalendar: (from: string, to: string) =>
    api.get<{ success: boolean; data: { from: string; to: string; cycle_length: number; days: CalendarDay[] } }>(
      '/admin/daily-rewards/calendar',
      { params: { from, to } }
    ),
  upsertOverride: (body: {
    reward_date: string;
    is_premium: boolean;
    reward_type: 'coins' | 'avatar' | 'card';
    amount?: number;
    ref_id?: number | null;
    title?: string | null;
    description?: string | null;
    is_active?: boolean;
  }) => api.put('/admin/daily-rewards/overrides', body),
  deleteOverride: (date: string, tier: 'regular' | 'premium') =>
    api.delete('/admin/daily-rewards/overrides', { params: { date, tier } }),

  // Kalendar konfiguratsiyasi (anchor / XP sharti)
  getConfig: () =>
    api.get<{ success: boolean; data: RewardCalendarConfig }>('/admin/daily-rewards/config'),
  updateConfig: (body: Partial<RewardCalendarConfig>) =>
    api.put('/admin/daily-rewards/config', body),

  // Premium narx/muddat konfiguratsiyasi
  getPremiumConfig: () =>
    api.get<{ success: boolean; data: PremiumConfig }>('/admin/premium-config'),
  updatePremiumConfig: (body: Partial<PremiumConfig>) =>
    api.put('/admin/premium-config', body),
  clearPremiumDiscount: () => api.delete('/admin/premium-config/discount'),
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

// ── App version / force-update gate ───────────────────
export interface AppVersionConfig {
  force_update_enabled: boolean;
  min_version_android: string;
  min_version_ios: string;
  latest_version_android: string;
  latest_version_ios: string;
  store_url_android: string;
  store_url_ios: string;
  update_message: string;
}

export const appApi = {
  getVersionConfig: () =>
    api.get<{ success: boolean; data: AppVersionConfig }>('/admin/app/version'),
  updateVersionConfig: (body: Partial<AppVersionConfig>) =>
    api.put<{ success: boolean; message: string; data: AppVersionConfig }>('/admin/app/version', body),
};

// ── Admin accounts (admin_users) ─────────────────────────
export interface AdminUser {
  id: number;
  username: string;
  role: 'super_admin' | 'moderator' | 'viewer';
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
}
export const adminsApi = {
  getAll: () => api.get<{ success: boolean; data: AdminUser[] }>('/admin/admins'),
  create: (body: { username: string; password: string; role: string }) =>
    api.post<{ success: boolean; message: string; data: AdminUser }>('/admin/admins', body),
  update: (id: number, body: { role?: string; is_active?: boolean }) =>
    api.put<{ success: boolean; message: string; data: AdminUser }>(`/admin/admins/${id}`, body),
  resetPassword: (id: number, body: { new_password: string }) =>
    api.put<{ success: boolean; message: string }>(`/admin/admins/${id}/password`, body),
  remove: (id: number) => api.delete<{ success: boolean; message: string }>(`/admin/admins/${id}`),
};

// ── Weekly leaderboard (haftalik TOP-10 Telegram post) ───────────────────────
export interface LeaderboardSchedule {
  enabled: boolean;
  day: number; // 0=Yakshanba .. 6=Shanba
  time: string; // "HH:MM"
}
export interface WeeklyLbEntry {
  rank: number;
  name: string;
  avatar: string | null;
  xp: number;
}
export interface TopPlayerRow {
  rank: number;
  id: number;
  username: string;
  name: string;
  avatar: string | null;
  region: string | null;
  league: string | null;
  xp: number;
  rating: number;
  total_duels: number;
  won_duels: number;
  win_rate: number | null;
  created_at: string;
}
export const leaderboardApi = {
  getTop: (limit: 10 | 50 | 100) =>
    api.get<{ success: boolean; data: TopPlayerRow[] }>('/admin/leaderboard/top', { params: { limit } }),
  resetXp: (userId: number) =>
    api.post<{ success: boolean; message: string; data: { previous_xp: number } }>(`/admin/leaderboard/users/${userId}/reset-xp`),
  remove: (userId: number, reason?: string) =>
    api.post<{ success: boolean; message: string; data: { previous_xp: number } }>(`/admin/leaderboard/users/${userId}/remove`, { reason }),
  getSchedule: () =>
    api.get<{ success: boolean; data: LeaderboardSchedule }>('/admin/leaderboard/schedule'),
  updateSchedule: (body: Partial<LeaderboardSchedule>) =>
    api.put<{ success: boolean; message: string; data: LeaderboardSchedule }>(
      '/admin/leaderboard/schedule',
      body,
    ),
  preview: () =>
    api.get<{ success: boolean; data: { image_url: string; entries: WeeklyLbEntry[] } }>(
      '/admin/leaderboard/preview',
    ),
  sendNow: () =>
    api.post<{ success: boolean; message: string; data: { sent: boolean; count: number } }>(
      '/admin/leaderboard/send',
    ),
};

// ── AI Books (PDF -> test generatsiya) ────────────────
export const booksApi = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; total: number; data: Book[] }>('/admin/books', { params }),
  getById: (id: number) =>
    api.get<{ success: boolean; data: Book }>(`/admin/books/${id}`),
  upload: (file: File, title?: string) => {
    const fd = new FormData();
    if (title) fd.append('title', title);
    fd.append('file', file);
    return api.post<{ success: boolean; data: { book_id: number } }>('/admin/books', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
  },
  delete: (id: number) => api.delete(`/admin/books/${id}`),
  getPages: (id: number, from: number, to?: number) =>
    api.get<{ success: boolean; data: BookPage[] }>(`/admin/books/${id}/pages`, {
      params: { from, to },
    }),
  confirmSubject: (
    id: number,
    body: {
      subject_id?: number;
      new_subject?: { name: string; icon?: string; description?: string };
      grade?: number | null;
    },
  ) => api.post<{ success: boolean; data: Book }>(`/admin/books/${id}/confirm-subject`, body),
  reanalyze: (id: number) => api.post(`/admin/books/${id}/reanalyze`),
  // Mavzular
  getTopics: (id: number) =>
    api.get<{ success: boolean; data: BookTopic[] }>(`/admin/books/${id}/topics`),
  createTopic: (id: number, body: { title: string; start_page: number; end_page: number }) =>
    api.post(`/admin/books/${id}/topics`, body),
  updateTopic: (id: number, topicId: number, body: Partial<BookTopic>) =>
    api.put(`/admin/books/${id}/topics/${topicId}`, body),
  confirmAllTopics: (id: number) => api.post(`/admin/books/${id}/topics/confirm-all`),
  deleteTopic: (id: number, topicId: number) =>
    api.delete(`/admin/books/${id}/topics/${topicId}`),
  // Generatsiya
  generate: (
    id: number,
    body: {
      book_topic_ids: number[];
      per_topic_count: number;
      difficulty?: { easy: number; medium: number; hard: number };
    },
  ) => api.post<{ success: boolean; data: { job_id: number } }>(`/admin/books/${id}/generate`, body),
  getEstimate: (id: number, body: { book_topic_ids: number[]; per_topic_count: number }) =>
    api.post<{ success: boolean; data: GenEstimate }>(`/admin/books/${id}/generate-estimate`, body),
  getAiStats: () => api.get<{ success: boolean; data: AiStats }>('/admin/books/stats/ai'),
  getJobs: (id: number) =>
    api.get<{ success: boolean; data: GenerationJob[] }>(`/admin/books/${id}/jobs`),
  getJob: (jobId: number) =>
    api.get<{ success: boolean; data: GenerationJob }>(`/admin/books/jobs/${jobId}`),
  cancelJob: (jobId: number) => api.post(`/admin/books/jobs/${jobId}/cancel`),
  // Draft savollar
  getDrafts: (
    id: number,
    params?: { book_topic_id?: number; review_status?: string; page?: number; limit?: number },
  ) =>
    api.get<{ success: boolean; total: number; data: GeneratedQuestion[] }>(
      `/admin/books/${id}/questions`,
      { params },
    ),
  getDraftsSummary: (id: number, book_topic_id?: number) =>
    api.get<{ success: boolean; data: DraftsSummary }>(`/admin/books/${id}/questions/summary`, {
      params: { book_topic_id },
    }),
  updateDraft: (qid: number, body: Partial<GeneratedQuestion>) =>
    api.put(`/admin/books/questions/${qid}`, body),
  approveDraft: (qid: number) => api.post(`/admin/books/questions/${qid}/approve`),
  rejectDraft: (qid: number) => api.post(`/admin/books/questions/${qid}/reject`),
  bulkApprove: (id: number, body: { ids?: number[]; book_topic_id?: number; all_ready?: boolean }) =>
    api.post<{ success: boolean; data: { approved_count: number } }>(
      `/admin/books/${id}/questions/bulk-approve`,
      body,
    ),
};

// ── AI Testlar (foydalanuvchi yaratgan) ───────────────
export const aiTestsApi = {
  getAll: (params?: AiTestFilters & { page?: number; limit?: number }) =>
    api.get<{ success: boolean; total: number; page: number; limit: number; data: AiTest[] }>(
      '/admin/ai-tests',
      { params },
    ),
  getStats: (params?: AiTestFilters) =>
    api.get<{ success: boolean; data: AiTestStats }>('/admin/ai-tests/stats', { params }),
  getById: (id: number) =>
    api.get<{ success: boolean; data: AiTestDetail }>(`/admin/ai-tests/${id}`),
  getQuestions: (id: number) =>
    api.get<{ success: boolean; data: AiTestQuestion[] }>(`/admin/ai-tests/${id}/questions`),
  retry: (id: number) =>
    api.post<{ success: boolean; message: string }>(`/admin/ai-tests/${id}/retry`),
  refund: (id: number) =>
    api.post<{ success: boolean; message: string; data: { refunded: number; balance: number } }>(
      `/admin/ai-tests/${id}/refund`,
    ),
  delete: (id: number) => api.delete(`/admin/ai-tests/${id}`),
};
