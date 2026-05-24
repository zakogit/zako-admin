// Auth
export interface LoginCredentials {
  username: string;
  password: string;
}
export interface AdminUser {
  adminId: number;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
}
export interface AuthState {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  admin: AdminUser;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// User
export interface User {
  id: number;
  username: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
  coins: number;
  rating: number;
  avatar?: string;
  region_id?: number;
}

// Dashboard
export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  activeDuels: number;
  cardsSold: number;
}

export interface ActivityItem {
  id: number;
  type: string;
  user?: string;
  details?: string;
  timestamp: string;
}

// Questions
export interface QuestionOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}
export interface Question {
  id: number;
  subject_id: number;
  topic_id: number;
  subject_name?: string;
  topic_name?: string;
  question_text: string;
  question_type: 'single' | 'multiple' | 'true_false';
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  image_url?: string;
  correct_answer?: string;
  is_active: boolean;
  created_at: string;
  options?: QuestionOption[];
}

// Subject
export interface Subject {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  is_active: boolean;
  topic_count?: number;
  question_count?: number;
  created_at: string;
}

// Topic
export interface Topic {
  id: number;
  subject_id: number;
  subject_name?: string;
  name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  question_count?: number;
  created_at: string;
}

// Card
export interface CardType {
  id: number;
  name: string;
  description: string;
  effect_type: 'loss_reduction' | 'loss_protection' | 'win_boost';
  effect_value: number;
  price_coins: number;
  duration_duels: number;
  icon?: string;
  image?: string;
  is_active: boolean;
  total_sold?: number;
  created_at: string;
}

// Avatar
export interface Avatar {
  id: number;
  url: string;
  gender: 'male' | 'female' | 'both';
  is_premium: boolean;
  usage_count?: number;
  created_at?: string;
}

// Region
export interface Region {
  id: number;
  name: string;
  user_count?: number;
  avg_rating?: number;
  duel_count?: number;
  created_at: string;
  updated_at: string;
}

// Duel
export interface Duel {
  id: number;
  player1_id: number;
  player2_id?: number;
  player1_username?: string;
  player2_username?: string;
  winner_username?: string;
  subject_name?: string;
  subject_id: number;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  is_bot_game: boolean;
  p1_score?: number;
  p2_score?: number;
  created_at: string;
  finished_at?: string;
}

// Friendship
export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_username?: string;
  addressee_username?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

// Audit Log
export interface AuditLog {
  id: number;
  admin_id: number;
  admin_username?: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address?: string;
  created_at: string;
}
