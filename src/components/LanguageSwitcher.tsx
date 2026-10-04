import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n';
import { cn } from '../utils/helpers';

interface Props {
  /** `dark` is for surfaces that are always dark (login page). */
  variant?: 'auto' | 'dark';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'auto', className }: Props) {
  const { i18n, t } = useTranslation('layout');
  const dark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label={t('language')}
      title={t('language')}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg p-0.5',
        dark ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800',
        className,
      )}
    >
      <Globe className={cn('w-4 h-4 ml-1.5', dark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400')} />
      {LANGUAGES.map((l) => {
        const active = i18n.language === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code as LanguageCode)}
            title={l.label}
            aria-pressed={active}
            className={cn(
              'px-2 py-1 rounded-md text-xs font-semibold transition',
              active
                ? 'bg-primary-600 text-white'
                : dark
                  ? 'text-gray-300 hover:bg-white/10'
                  : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
