# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 5173 (proxies /api and /uploads to localhost:3000)
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test framework is configured.

## Architecture

This is the **admin panel** for Zako — an educational quiz/duel mobile app. It's a React 19 SPA built with Vite, TypeScript, and Tailwind CSS.

### Key layers

- **`src/api/client.ts`** — Axios instance with JWT auth interceptor and automatic token refresh on 401. Tokens stored in localStorage (`adminToken`, `adminRefreshToken`).
- **`src/api/services.ts`** — All backend API calls grouped by domain (auth, users, subjects, topics, questions, cards, avatars, duels, friends, payments, regions, notifications, audit). Every endpoint returns `{ success: boolean; data: T }`.
- **`src/store/`** — Zustand stores with `persist` middleware. `authStore` handles login/logout state; `uiStore` handles sidebar and dark mode.
- **`src/types/index.ts`** — All shared TypeScript interfaces. When adding a new entity, define its interface here and import it in services.
- **`src/components/ui/index.tsx`** — Reusable primitives: Button, Badge, Input, Select, Card, StatCard, Modal, Table, Pagination, Spinner, EmptyState, LazyImage. Use these instead of creating one-off components.
- **`src/components/layout/`** — AppLayout (with Outlet), Header, Sidebar.
- **`src/pages/`** — One folder per feature. Each page is lazy-loaded in App.tsx.
- **`src/utils/helpers.ts`** — `cn()` (tailwind-merge + clsx), formatDate, formatNumber, getStaticFileUrl.

### Patterns

- All routes are protected via `PrivateRoute` wrapper; `/login` is the only public route.
- Pages use TanStack Query (`useQuery`/`useMutation`) for data fetching and cache invalidation.
- Forms use react-hook-form + zod for validation.
- Dark mode is class-based (`darkMode: 'class'` in Tailwind config), toggled via `useUIStore`.
- Static files (uploads/avatars) are served from the backend; use `getStaticFileUrl()` to resolve URLs.
- The custom color palette uses `primary-*` (indigo-based, defined in tailwind.config.js).

## Environment

- `VITE_API_BASE_URL` — API base path (default: `/api/v1`)
- `VITE_BACKEND_URL` — Backend origin for static files (default: `http://localhost:3000`)

Production deployment: `admin.zakoapp.uz` served via Nginx from the `dist/` folder. Backend runs separately.
