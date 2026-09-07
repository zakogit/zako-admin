# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server on port 5173
npm run build      # tsc -b (strict type check) + Vite production build → dist/
npm run lint       # ESLint (flat config: js + typescript-eslint + react-hooks + react-refresh)
npm run preview    # Preview the production build locally
```

No test framework is configured. The backend (`../zako_backend`) must be running on `localhost:3000` for any page to load data; its dev CORS allows `localhost:5173`.

`npm run build` fails on unused imports/variables (`noUnusedLocals`, `noUnusedParameters`), and `verbatimModuleSyntax` requires `import type` for type-only imports. Run it before committing — there is no CI.

`README.md` is the stock Vite template and says nothing about this project. `DEPLOYMENT.md` covers the manual deploy (build locally, `rsync dist/` to the VPS, Nginx with `try_files … /index.html` for SPA routing at `admin.zakoapp.uz`).

## What this is

Admin panel for Zako, an educational quiz/duel mobile app. React 19 SPA (Vite 8, TypeScript 6, Tailwind 3, TanStack Query 5, Zustand 5, react-hook-form 7, react-router-dom 7, Recharts, Lucide icons, react-hot-toast). It talks only to the backend's `/api/v1/admin/...` endpoints; there is no local persistence beyond auth/UI state.

`@tanstack/react-table` and `@headlessui/react` are installed but **unused** — tables are hand-rolled with the `Table` primitive, modals are the custom `Modal`. Don't reach for them just because they're in `package.json`.

## Architecture

### Adding a page (three places to touch)
1. `src/pages/<feature>/<Name>Page.tsx` — default export, one folder per feature.
2. `src/App.tsx` — add a `React.lazy` import and a `<Route>` inside the `PrivateRoute`/`AppLayout` group. This file is the authoritative route list.
3. `src/components/layout/Sidebar.tsx` — add an entry to the `nav` array (sections: Content / Platform / System).

`Header.tsx` has a hard-coded `titles` map that only covers the original routes; newer pages fall back to the title "Admin". Add to it if the page title matters.

### API layer
- **`src/api/client.ts`** — Axios instance, `baseURL = VITE_API_BASE_URL`. Request interceptor reads the JWT from **raw `localStorage.adminToken`** (not from the Zustand store). On 401 it calls `/admin/refresh` with a bare `axios.post` (bypassing the interceptor to avoid loops), expects `accessToken` at the top level of the response, retries once, and on failure calls `useAuthStore.getState().logout()`.
- **`src/api/services.ts`** — every backend call, grouped as `xxxApi = { ... }` objects per domain. Admin route prefixes are inconsistent on the backend (`/admin/admin-subjects`, `/admin/admin-topics`, `/admin/admin-questions`, `/admin/friends-admin`, `/admin/regions-admin`, but `/admin/cards`, `/admin/avatars`, `/admin/seasons`, …). Copy the path from the backend controller rather than guessing the pattern.
- Some domain types live inline in `services.ts` next to their API object (daily rewards, premium config, app version, admins, weekly leaderboard, dashboard chart/health) instead of `src/types/index.ts`. Check both before defining a new one.
- **Two different `AdminUser` interfaces exist**: `types/index.ts` (the logged-in session shape: `adminId`, role `super_admin|admin|moderator`) and `services.ts` (an `admin_users` table row: `id`, `is_active`, `mfa_enabled`, role `super_admin|moderator|viewer`). Import the right one.

### Response shapes and how pages unwrap them
Every endpoint returns `{ success, data }`, so with Axios the payload is `res.data.data`. Paginated lists nest one level deeper: `{ success, data: { data: T[], total, page, limit } }` (`PaginatedResponse<T>`). The established page pattern is:

```ts
const { data } = useQuery({ queryKey: ['admin-regions', page, search], queryFn: () => regionsApi.getAll({ page, limit, search }).then(r => r.data) });
const rows: Region[] = Array.isArray((data as any)?.data?.data) ? (data as any).data.data : [];
const total: number = (data as any)?.data?.total ?? 0;
```

Pass `total` and `limit` to `Pagination`; it computes the page count itself. Mutations invalidate by the list's query-key prefix (`qc.invalidateQueries({ queryKey: ['admin-regions'] })`) and toast `e.response?.data?.message || 'fallback'` on error.

### Auth
- `LoginPage` handles a two-step flow: `/admin/login` may return `mfaRequired` + `adminId`, then `/admin/login/mfa` with a 6-digit token.
- `authStore` (Zustand + `persist`, key `zako-admin-auth`) writes the tokens **both** into its own persisted state and into raw `localStorage.adminToken` / `adminRefreshToken`, because `client.ts` reads only the raw keys. `login()`/`logout()` keep them in sync — don't set one without the other.
- `PrivateRoute` only checks `isAuthenticated` from the store; expired tokens are discovered lazily via the 401 interceptor.

### UI primitives (`src/components/ui/index.tsx`)
`Button` (primary/secondary/danger/ghost/outline; sm/md/lg; `loading`), `Badge` (8 colors via `color` prop), `Input`, `Select`, `Card`, `StatCard`, `Modal` (sm/md/lg/xl; plain conditional render, no portal/focus trap), `Table` (`headers` + `<tr>` children, `loading`), `Pagination`, `Spinner`, `EmptyState`, `LazyImage`. Use these instead of ad-hoc elements.

`components/ui/Badge.tsx` and `components/ui/LazyImage.tsx` are **orphaned older variants** that nothing imports (the `Badge.tsx` one takes `variant`, not `color`). The live components are the ones exported from `index.tsx`.

### Styling / state conventions
- Dark mode is class-based; `uiStore.toggleDarkMode` toggles `document.documentElement.classList` and `App.tsx` re-applies it on load. Every color needs a `dark:` counterpart.
- `cn()` in `utils/helpers.ts` = `tailwind-merge` + `clsx`. Custom palette is `primary-*` (indigo). `.scrollbar-thin` and `animate-fade-in` / `animate-slide-in` are project utilities.
- `getStaticFileUrl(path)` always prefixes with `VITE_BACKEND_URL` (normalising to `/uploads/...`), so upload images hit the backend origin directly even in dev.
- Zod + `zodResolver` is only used on the login page; most forms use `useForm<any>()` with `register(..., { required })` rules. Either is acceptable; match the surrounding page.
- Pages that track background jobs (`books`, `ai-tests`, `dashboard`) poll with `refetchInterval`. `pages/ai-tests/shared.ts` shows the pattern for label/colour maps shared between a list page and its detail page.

### Language
UI copy is mixed: older pages are English, newer ones are Uzbek (`AI Kitoblar`, `Maqolalar`, `Kunlik sovg'alar`, `Adminlar`). Match the language of the page you are editing. Commit messages are conventional-commit style with Uzbek descriptions (`feat(ai-tests): AI Testlar boshqaruv sahifasi`).

## Environment

`.env` and `.env.production` are **committed** (`.gitignore` doesn't exclude them). Vite picks `.env.production` automatically for `vite build`.

| Variable | `.env` (dev) | `.env.production` |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000/api/v1` | `https://api.zakoapp.uz/api/v1` |
| `VITE_BACKEND_URL` | `http://localhost:3000` | `https://api.zakoapp.uz` |

`vite.config.ts` **statically substitutes** `import.meta.env.VITE_API_BASE_URL` via `define` (fallback `/api/v1`), so it is fixed at build/dev-server start — change `.env`, then restart `npm run dev`. Because the committed dev value is an absolute URL, API calls bypass the Vite `/api` proxy and go straight to `localhost:3000`; the `/api` and `/uploads` proxy entries are effectively unused today.
