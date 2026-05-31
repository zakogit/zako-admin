import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const QuestionsPage = lazy(() => import('./pages/questions/QuestionsPage'));
const SubjectsPage = lazy(() => import('./pages/subjects/SubjectsPage'));
const TopicsPage = lazy(() => import('./pages/topics/TopicsPage'));
const CardsPage = lazy(() => import('./pages/cards/CardsPage'));
const AvatarsPage = lazy(() => import('./pages/avatars/AvatarsPage'));
const DuelsPage = lazy(() => import('./pages/duels/DuelsPage'));
const FriendsPage = lazy(() => import('./pages/friends/FriendsPage'));
const RegionsPage = lazy(() => import('./pages/regions/RegionsPage'));
const StorePage = lazy(() => import('./pages/store/StorePage'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const AuditLogsPage = lazy(() => import('./pages/audit/AuditLogsPage'));
const SeasonsPage = lazy(() => import('./pages/seasons/SeasonsPage'));
const CreateSeasonPage = lazy(() => import('./pages/seasons/CreateSeasonPage'));
const SeasonDetailsPage = lazy(() => import('./pages/seasons/SeasonDetailsPage'));
const AdsPage = lazy(() => import('./pages/ads/AdsPage'));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function Loading() {
  return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950"><Spinner size="lg" /></div>;
}

export default function App() {
  const { darkMode } = useUIStore();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="subjects" element={<SubjectsPage />} />
              <Route path="topics" element={<TopicsPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="avatars" element={<AvatarsPage />} />
              <Route path="duels" element={<DuelsPage />} />
              <Route path="friends" element={<FriendsPage />} />
              <Route path="regions" element={<RegionsPage />} />
              <Route path="store" element={<StorePage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="seasons" element={<SeasonsPage />} />
              <Route path="seasons/create" element={<CreateSeasonPage />} />
              <Route path="seasons/:id" element={<SeasonDetailsPage />} />
              <Route path="ads" element={<AdsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-gray-800 dark:text-white' }} />
    </QueryClientProvider>
  );
}
