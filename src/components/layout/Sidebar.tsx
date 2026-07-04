import { NavLink } from "react-router-dom";
import { useUIStore } from "../../store/uiStore";
import { useAuthStore } from "../../store/authStore";
import { cn } from "../../utils/helpers";
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
  ChevronLeft,
  Zap,
  LogOut,
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
} from "lucide-react";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Users", icon: Users, to: "/users" },
  { section: "Content" },
  { label: "Questions", icon: HelpCircle, to: "/questions" },
  { label: "Subjects", icon: BookOpen, to: "/subjects" },
  { label: "Topics", icon: List, to: "/topics" },
  { label: "AI Kitoblar", icon: Sparkles, to: "/books" },
  { label: "Maqolalar", icon: Newspaper, to: "/articles" },
  { section: "Platform" },
  { label: "Cards", icon: Layers, to: "/cards" },
  { label: "Avatars", icon: Image, to: "/avatars" },
  { label: "Premium Avatarlar", icon: Crown, to: "/premium-avatars" },
  { label: "Store", icon: Coins, to: "/store" },
  { label: "Seasons", icon: Trophy, to: "/seasons" },
  { label: "Leagues", icon: Medal, to: "/leagues" },
  { label: "Premium Obuna", icon: Diamond, to: "/subscriptions" },
  { label: "Duels", icon: Swords, to: "/duels" },
  { label: "Friends", icon: UserCheck, to: "/friends" },
  { label: "Regions", icon: MapPin, to: "/regions" },
  { section: "System" },
  { label: "Payments", icon: CreditCard, to: "/payments" },
  { label: "Ads", icon: Smartphone, to: "/ads" },
  { label: "App Version", icon: RefreshCw, to: "/app-version" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Audit Logs", icon: ClipboardList, to: "/audit-logs" },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { admin, logout } = useAuthStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => useUIStore.getState().setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300",
          "bg-gray-900 dark:bg-gray-950 border-r border-gray-800",
          sidebarOpen ? "w-64" : "w-16",
          "lg:relative lg:translate-x-0",
          !sidebarOpen && "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">ZAKO</span>
              <span className="text-xs text-primary-400 font-medium">
                Admin
              </span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition",
              !sidebarOpen && "hidden lg:flex",
            )}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform",
                !sidebarOpen && "rotate-180",
              )}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {nav.map((item, i) => {
            if ("section" in item) {
              return sidebarOpen ? (
                <p
                  key={i}
                  className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {item.section}
                </p>
              ) : (
                <hr key={i} className="my-2 border-gray-800" />
              );
            }
            const Icon = item.icon!;
            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                    !sidebarOpen && "justify-center px-2",
                  )
                }
                end={item.to === "/"}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-800 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {admin?.username?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {admin?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{admin?.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="flex justify-center w-full p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
