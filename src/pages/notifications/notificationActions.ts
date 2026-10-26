// Xabar ichidagi tugma — mobil ilova shu kalitlarni o'z sahifalariga moslaydi.
// Backend `NOTIFICATION_ACTION_ROUTES` bilan bir xil bo'lishi SHART: yangi
// kalit qo'shsangiz backend va mobil `NotificationRouter`ni ham yangilang
// (nomi: `notifications:form.action.routes.<kalit>`, 3 tilda).

export type NotificationActionType = 'route' | 'url';

export interface NotificationAction {
  label: string;
  type: NotificationActionType;
  value: string;
}

export const NOTIFICATION_ACTION_ROUTES = [
  'home',
  'exercise',
  'all_topics',
  'treasure',
  'leaderboard',
  'profile',
  'store',
  'coin_store',
  'diamond_store',
  'zako_pass',
  'ai_test_create',
  'ai_test_list',
  'cards',
  'friends',
  'chat',
] as const;

export const ACTION_LABEL_MAX = 40;

/** `notifications:form.action.errors.<key>` */
export type NotificationActionError = 'textRequired' | 'textTooLong' | 'routeRequired' | 'urlInvalid';

const URL_PATTERN = /^https?:\/\/[^\s]+\.[^\s]+$/i;

/**
 * Forma qiymatlaridan backendga yuboriladigan `action` ni yig'adi.
 * Tugma tanlanmagan bo'lsa `null`; xato bo'lsa tarjima kaliti `error` sifatida qaytadi.
 */
export function buildNotificationAction(form: {
  action_type?: string;
  action_label?: string;
  action_route?: string;
  action_url?: string;
}): { action: NotificationAction | null; error?: NotificationActionError } {
  const type = form.action_type;
  if (type !== 'route' && type !== 'url') return { action: null };

  const label = (form.action_label || '').trim();
  if (!label) return { action: null, error: 'textRequired' };
  if (label.length > ACTION_LABEL_MAX) return { action: null, error: 'textTooLong' };

  const value = ((type === 'route' ? form.action_route : form.action_url) || '').trim();
  if (type === 'route' && !(NOTIFICATION_ACTION_ROUTES as readonly string[]).includes(value)) {
    return { action: null, error: 'routeRequired' };
  }
  if (type === 'url' && !URL_PATTERN.test(value)) return { action: null, error: 'urlInvalid' };
  return { action: { label, type, value } };
}
