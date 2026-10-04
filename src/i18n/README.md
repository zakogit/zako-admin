# i18n guide (uz · ru · en)

The admin panel speaks **three languages**: Uzbek (Latin script, the default), Russian and English.
Stack: `i18next` + `react-i18next`. The language is picked with `LanguageSwitcher` (header + login page)
and persisted in `localStorage['zako-admin-lang']`.

## Files

```
src/i18n/index.ts                      # init, LANGUAGES, setLanguage(), getIntlLocale()
src/i18n/locales/<lang>/<ns>.json      # lang = uz | ru | en   — auto-bundled (import.meta.glob), no registration
scripts/check-i18n.mjs                 # consistency checker — run it before you finish
```

One **namespace per page/feature** (`users.json`, `books.json`, …) plus two shared ones:
`common` (buttons, statuses, table headers, units, roles — see the file) and `layout` (sidebar / header).
Every namespace must exist in **all three** language folders with **identical key sets**.

## Using translations

```tsx
import { useTranslation } from 'react-i18next';

export default function UsersPage() {
  const { t } = useTranslation('users');          // default namespace for this file
  return (
    <>
      <h1>{t('title')}</h1>                        {/* users:title */}
      <Button>{t('common:actions.save')}</Button>  {/* another namespace → "ns:key" prefix */}
      <p>{t('deleteConfirm', { name: user.username })}</p>
    </>
  );
}
```

Rules:

1. **Always call it `t`** (`const { t } = useTranslation(...)`). The checker only follows `t(...)` / `i18n.t(...)`.
   Cross-namespace keys use the `ns:key` prefix. `useTranslation(['users', 'common'])` is fine; the first one is the default.
2. **Every component that renders text needs its own `useTranslation()`** (sub-components declared in the same file too) —
   that is what re-renders it on a language switch. Don't thread translated strings through module scope.
3. **Never call `t()` at module scope** (top-level constants, arrays, `z.object({...})` with messages). It would be evaluated once, in
   the language active at load time. Instead:
   - store **keys** in the constant (`{ value: 'active', labelKey: 'status.active' }`) and call `t(item.labelKey)` at render, or
   - build the constant inside the component / a `useMemo`, or make a factory `makeSchema(t)`.
   Outside React (callbacks, `api/` layer) use `import i18n from '../../i18n'` and `i18n.t('ns:key')` at call time.
4. **Don't keep translated strings in `useState`** or compare against them — keep stable ids (`'pending'`) in state/logic and translate
   when rendering. `<option value="pending">{t('status.pending')}</option>`: translate the text, never the `value`.
5. **Interpolation**: `"deleteConfirm": "{{name}} o'chirilsinmi?"` → `t('deleteConfirm', { name })`. All three languages use the same `{{vars}}`.
6. **Plurals** — whenever a number sits in front of a noun use `count`; give the plural forms in **all** languages:
   - uz / en: `key_one`, `key_other` (uz: same text in both) — ru: `key_one`, `key_few`, `key_many`, `key_other`.
   - `t('questionsCount', { count: n })`; every form contains `{{count}}`.
   ```json
   "questionsCount_one": "{{count}} вопрос", "questionsCount_few": "{{count}} вопроса",
   "questionsCount_many": "{{count}} вопросов", "questionsCount_other": "{{count}} вопроса"
   ```
7. **Dynamic keys** like ``t(`status.${s}`)`` are fine when every possible `s` exists under `status.` in all three languages
   (the checker only verifies the prefix). Give unknown backend values a fallback: ``t(`status.${s}`, { defaultValue: s })``.
8. **Inline markup** (`<strong>`, links) inside a sentence → `<Trans i18nKey="ns:key" values={{ name }} components={{ b: <strong /> }} />`
   with `"key": "<b>{{name}}</b> o'chirilsinmi?"`. **`<Trans>` ignores the namespace of `useTranslation('ns')`** — always write the
   key with its prefix (`i18nKey="users:deleteConfirm"`), otherwise it looks in `common` and renders the raw key (the checker enforces
   this). When a value is **user/backend data** (usernames, titles…) also pass
   `tOptions={{ interpolation: { escapeValue: true } }} shouldUnescape` — `escapeValue` is globally `false`, so without it `<Trans>`
   would re-parse markup-looking characters inside the value.
   **Form validation messages**: react-hook-form freezes the message string at validation time, so a message passed as
   `register('x', { required: t('…') })` keeps the old language until the form validates again. Prefer `required: true` and render
   the text at render time (`{errors.x && <p>{t('validation.xRequired')}</p>}`) so an error that is already on screen follows a
   language switch (Articles, Regions, Payments and Login do this). Older forms that still pass `t()` into `register` are acceptable —
   the message only goes stale if the language is switched while the error is visible.
9. **Dates / numbers / money**: use `formatDate`, `formatNumber` from `utils/helpers` (they follow the active language). For anything
   custom use `getIntlLocale()` from `src/i18n` — never hard-code `'uz-UZ'` / `'en-GB'`. The currency suffix is `common:units.som`.
10. **Backend text is data**, not UI: names of subjects/regions/cards, API error messages (`e.response?.data?.message || t('…fallback')`),
    ids, enum values sent to the API, URLs, brand names (ZAKO, Telegram, Google, AdMob, Payme, Click, Uzum, Apple), technical tokens
    (ID, XP, OTP, IP, URL, JSON) stay as they are.
11. **Translate everything the admin can see**: headings, buttons, table headers, placeholders, `title=`/`aria-label=` tooltips, empty states,
    modal titles, confirm dialogs, toasts (success **and** error fallbacks), validation messages, select options, badges, chart
    series/axis/tooltip labels, tab names, `window.confirm` texts.
12. Behaviour, layout, classNames, API calls and query keys must not change — only text.

## Key naming

camelCase, grouped by UI area, at most 3 levels deep:

```
title, subtitle
tabs.*  filters.*  table.*  form.*  modal.*  confirm.*  toast.*  status.*  empty.*  stats.*  actions.*  errors.*  validation.*
```

Don't duplicate what `common` already has (save/cancel/delete/edit, `table.id|name|status|created|actions`, `status.active|pending|…`,
`state.loading|noData`, `pagination.*`, `toast.saved|deleted|…`, `units.*`, `roles.*`) — use `t('common:…')`.
If `common` lacks a generic word you need, put it in your own namespace (don't edit `common.json`).

## Translation style

- **Uzbek**: Latin script, sentence case, straight apostrophe `'` for `o'`/`g'`/`'` (same as the existing UI: `Qo'shish`, `Kunlik sovg'alar`).
  Natural, short, UI-style — not a word-for-word calque.
- **Russian**: formal «вы», sentence case, natural UI wording (see glossary).
- **English**: sentence case, concise.
- Keep `{{placeholders}}`, emoji and symbols (✅ ⏳ → ·) identical across languages. Keep the technical tokens listed above.
- Existing Uzbek text in the code is the source of truth for tone and terminology; existing English text was written by the same team — translate its meaning.

### Glossary (use these terms consistently)

| English | O'zbekcha | Русский |
|---|---|---|
| Users / User | Foydalanuvchilar / Foydalanuvchi | Пользователи / Пользователь |
| Question(s) | Savol(lar) | Вопрос(ы) |
| Subject | Fan | Предмет |
| Topic | Mavzu | Тема |
| Card(s) (in-game boost cards) | Karta(lar) | Карта (Карты) |
| Avatar / Premium avatar | Avatar / Premium avatar | Аватар / Премиум-аватар |
| Store / Package / Offer | Do'kon / Paket / Taklif | Магазин / Пакет / Предложение |
| Coins | Tangalar | Монеты |
| Balance | Balans | Баланс |
| Season / Zako Pass | Mavsum / Zako Pass | Сезон / Zako Pass |
| Daily reward | Kunlik sovg'a | Ежедневная награда |
| League / Leaderboard | Liga / Reyting jadvali | Лига / Таблица лидеров |
| Rating | Reyting | Рейтинг |
| Weekly TOP-10 | Haftalik TOP-10 | Еженедельный ТОП-10 |
| Subscription | Obuna | Подписка |
| Duel / Win / Loss / Draw | Duel / G'alaba / Mag'lubiyat / Durang | Дуэль / Победа / Поражение / Ничья |
| Friend(s) / Friend request | Do'st(lar) / Do'stlik so'rovi | Друг (Друзья) / Запрос в друзья |
| Region | Hudud | Регион |
| Payment / Order / Transaction | To'lov / Buyurtma / Tranzaksiya | Платёж / Заказ / Транзакция |
| Refund | Qaytarish | Возврат |
| Notification / Push / Campaign / Template | Bildirishnoma / Push-bildirishnoma / Kampaniya / Shablon | Уведомление / Push-уведомление / Кампания / Шаблон |
| Audit log | Audit jurnali | Журнал аудита |
| Admin / Role / Permission | Admin / Rol / Ruxsat | Администратор / Роль / Право доступа |
| Verified / Unverified | Tasdiqlangan / Tasdiqlanmagan | Подтверждён / Не подтверждён |
| Ban / Banned / Unban | Bloklash / Bloklangan / Blokdan chiqarish | Заблокировать / Заблокирован / Разблокировать |
| Online / Offline | Onlayn / Oflayn | Онлайн / Офлайн |
| Book / Page / Chapter | Kitob / Sahifa / Bob | Книга / Страница / Глава |
| Draft / Published | Qoralama / E'lon qilingan | Черновик / Опубликовано |
| Article | Maqola | Статья |
| AI generation / Generate | AI orqali yaratish / Yaratish | Генерация ИИ / Сгенерировать |
| Answer / Option / Correct answer | Javob / Variant / To'g'ri javob | Ответ / Вариант / Правильный ответ |
| Explanation | Izoh | Пояснение |
| Difficulty: easy / medium / hard | Oson / O'rta / Qiyin | Лёгкий / Средний / Сложный |
| Level / Badge | Daraja / Nishon | Уровень / Значок |
| App version / Force update | Ilova versiyasi / Majburiy yangilash | Версия приложения / Принудительное обновление |
| Ads / Reward per ad / Daily limit | Reklama / Reklama uchun mukofot / Kunlik limit | Реклама / Награда за рекламу / Дневной лимит |
| Retention / Win rate | Ushlab qolish / G'alaba ulushi | Удержание / Доля побед |
| Dashboard | Boshqaruv paneli | Панель управления |
| Settings | Sozlamalar | Настройки |
| Statistics / Analytics | Statistika / Analitika | Статистика / Аналитика |

## Checking your work

```bash
node scripts/check-i18n.mjs --ns=users,common --hardcoded src/pages/users   # your namespaces + your files
node scripts/check-i18n.mjs                                                 # everything (CI-style)
npx tsc -b                                                                  # type check (also part of `npm run build`)
```

The checker fails on: missing/extra keys between languages, differing `{{placeholders}}`, missing plural forms, `t('…')` keys that
don't exist, variables a key needs but the call doesn't pass, `t()` in a file without `useTranslation()`.
`--hardcoded` lists UI strings that still bypass `t()`; silence a genuine non-UI string with a `// i18n-ignore` comment on that line
(or the line above).

## Adding a language

1. Add `locales/<code>/` with every namespace.
2. Add the entry to `LANGUAGES` in `src/i18n/index.ts` (code, label, short, BCP-47 tag) and to `LANGS` in `scripts/check-i18n.mjs`.
