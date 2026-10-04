import {
  LayoutDashboard,
  Users,
  HelpCircle,
  BookOpen,
  List,
  Layers,
  Image,
  Swords,
  UserCheck,
  MapPin,
  Bell,
  ClipboardList,
  CreditCard,
  Coins,
  Trophy,
  Smartphone,
  Diamond,
  Crown,
  Medal,
  RefreshCw,
  Sparkles,
  Newspaper,
  Award,
  ShieldCheck,
  Gift,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';

/** `key` indexes `layout:nav.*`, `section` indexes `layout:sections.*`. */
export type NavEntry =
  | { section: 'content' | 'platform' | 'system' }
  | { key: string; icon: LucideIcon; to: string };

export const NAV: NavEntry[] = [
  { key: 'dashboard', icon: LayoutDashboard, to: '/' },
  { key: 'users', icon: Users, to: '/users' },
  { section: 'content' },
  { key: 'questions', icon: HelpCircle, to: '/questions' },
  { key: 'subjects', icon: BookOpen, to: '/subjects' },
  { key: 'topics', icon: List, to: '/topics' },
  { key: 'books', icon: Sparkles, to: '/books' },
  { key: 'aiTests', icon: FlaskConical, to: '/ai-tests' },
  { key: 'articles', icon: Newspaper, to: '/articles' },
  { section: 'platform' },
  { key: 'cards', icon: Layers, to: '/cards' },
  { key: 'avatars', icon: Image, to: '/avatars' },
  { key: 'premiumAvatars', icon: Crown, to: '/premium-avatars' },
  { key: 'store', icon: Coins, to: '/store' },
  { key: 'seasons', icon: Trophy, to: '/seasons' },
  { key: 'dailyRewards', icon: Gift, to: '/daily-rewards' },
  { key: 'leagues', icon: Medal, to: '/leagues' },
  { key: 'leaderboard', icon: Award, to: '/leaderboard' },
  { key: 'subscriptions', icon: Diamond, to: '/subscriptions' },
  { key: 'duels', icon: Swords, to: '/duels' },
  { key: 'friends', icon: UserCheck, to: '/friends' },
  { key: 'regions', icon: MapPin, to: '/regions' },
  { section: 'system' },
  { key: 'payments', icon: CreditCard, to: '/payments' },
  { key: 'ads', icon: Smartphone, to: '/ads' },
  { key: 'appVersion', icon: RefreshCw, to: '/app-version' },
  { key: 'admins', icon: ShieldCheck, to: '/admins' },
  { key: 'notifications', icon: Bell, to: '/notifications' },
  { key: 'auditLogs', icon: ClipboardList, to: '/audit-logs' },
];

/** The nav entry a pathname belongs to (`/books/12` → books), for the header title. */
export function navKeyForPath(pathname: string): string | undefined {
  let best: { key: string; len: number } | undefined;
  for (const item of NAV) {
    if (!('key' in item)) continue;
    const matches = item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(item.to + '/');
    if (matches && (!best || item.to.length > best.len)) best = { key: item.key, len: item.to.length };
  }
  return best?.key;
}
