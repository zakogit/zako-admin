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
  gradient_start?: string;
  gradient_end?: string;
  border_color?: string;
  is_premium?: boolean;
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

// Product Package
export interface ProductPackage {
  id: number;
  product_type: 'coins' | 'premium' | 'cards';
  name: string;
  description?: string;
  price_som: number;
  discount_percent?: number;
  package_data: {
    coins?: number;
    bonus?: number;
    duration_days?: number;
    features?: string[];
    card_type?: string;
    quantity?: number;
  };
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
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

// Seasons & Badges
export interface Season {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  banner_image?: string;
  total_participants: number;
  max_participants?: number;
  season_number?: number;
  duration_days?: number;
  created_at: string;
  updated_at: string;
}

export interface SeasonStats {
  total_participants: number;
  active_participants: number;
  completion_rate: number;
}

export interface BadgeType {
  id: number;
  name: string;
  title: string;
  description?: string;
  icon_path?: string;
  rank_min: number;
  rank_max?: number;
  badge_color?: string;
  is_active: boolean;
}

export interface UserBadge {
  id: number;
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  badge_name: string;
  badge_title: string;
  badge_icon_path?: string;
  badge_color?: string;
  rank_position?: number;
  season_title?: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  total_points: number;
  days_completed: number;
  achievements_count: number;
  rank_position: number;
}

export interface League {
  id: number;
  name: string;
  description?: string | null;
  icon_url?: string | null;
  min_xp: number;
  max_xp: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// AI Books (PDF -> test generatsiya)
export interface Book {
  id: number;
  title: string;
  file_path: string;
  file_size: number;
  page_count?: number;
  subject_id?: number;
  subject_name?: string;
  grade?: number;
  status:
    | 'uploaded'
    | 'extracting'
    | 'analyzing'
    | 'reanalyze'
    | 'needs_review'
    | 'ready'
    | 'needs_ocr'
    | 'failed';
  status_error?: string;
  progress: number;
  meta: {
    page_offset?: number | null;
    offset_confidence?: number;
    toc_pages?: number[];
    proposed_subject?: {
      id: number | null;
      name: string | null;
      is_new: boolean;
      confidence: 'high' | 'medium' | 'low';
    };
    proposed_grade?: number | null;
    extraction_quality?: { avg: number; low_pages: Array<{ page: number; score: number }> };
    vision_indexed?: {
      mode: string;
      pages: number;
      failed: number;
      input_tokens: number;
      output_tokens: number;
      skipped_reason?: string;
    };
  };
  topic_count?: number;
  confirmed_topic_count?: number;
  draft_count?: number;
  pending_count?: number;
  flagged_count?: number;
  approved_count?: number;
  created_at: string;
}

export interface BookTopic {
  id: number;
  book_id: number;
  title: string;
  start_page: number;
  end_page: number;
  order_index: number;
  linked_topic_id?: number | null;
  linked_topic_name?: string;
  source: 'toc' | 'fallback' | 'manual';
  is_confirmed: boolean;
  draft_count?: number;
  approved_count?: number;
}

export interface GenerationJob {
  id: number;
  book_id: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: {
    book_topic_ids: number[];
    per_topic_count: number;
    difficulty: { easy: number; medium: number; hard: number };
  };
  topics_total: number;
  topics_done: number;
  questions_created: number;
  current_topic_id?: number | null;
  error?: string;
  input_tokens: number;
  output_tokens: number;
  batch_name?: string | null;
  created_at: string;
}

export interface GeneratedQuestion {
  id: number;
  job_id: number;
  book_id: number;
  book_topic_id: number;
  book_topic_title?: string;
  question_text: string;
  question_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  options: { option_text: string; is_correct: boolean; order_index: number }[];
  source_page?: number;
  source_quote?: string;
  grounded: boolean;
  flag_reason?: string;
  quality_score?: number | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  created_question_id?: number;
  created_at: string;
}

export interface BookPage {
  page_no: number;
  text: string;
  char_count: number;
  needs_ocr: boolean;
}

export interface GenEstimate {
  requests: number;
  input_tokens: number;
  output_tokens: number;
  est_cost_usd: number;
  batch_mode: boolean;
}

export interface AiStats {
  month: { calls: number; input_tokens: number; output_tokens: number; cost_usd: number };
  total: { calls: number; input_tokens: number; output_tokens: number; cost_usd: number };
  questions: { drafts: number; approved: number; avg_quality: number | null };
  monthly_budget_usd: number | null;
}

export interface DraftsSummary {
  pending: number;
  needs_review: number;
  approved: number;
  rejected: number;
  ready: number;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  body: string;
  cover_image_url?: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}
