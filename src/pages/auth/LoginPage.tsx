import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Zap, Eye, EyeOff, Lock, User } from 'lucide-react';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import LanguageSwitcher from '../../components/LanguageSwitcher';

import toast from 'react-hot-toast';

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const mfaSchema = z.object({ token: z.string().length(6) });
type FormData = z.infer<typeof schema>;
type MfaData = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { register: regMfa, handleSubmit: handleMfa, formState: { errors: mfaErrors } } = useForm<MfaData>({ resolver: zodResolver(mfaSchema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      if ((res.data as any).mfaRequired) {
        setMfaRequired(true);
        setPendingAdminId((res.data as any).adminId);
        toast(t('toast.mfaPrompt'), { icon: '🔐' });
      } else {
        login(res.data as any);
        toast.success(t('toast.welcome'));
        navigate('/');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('toast.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onMfa = async (data: MfaData) => {
    if (!pendingAdminId) return;
    setLoading(true);
    try {
      const res = await authApi.loginMfa({ adminId: pendingAdminId, token: data.token });
      login(res.data as any);
      toast.success(t('toast.welcome'));
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('toast.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-primary-950 flex items-center justify-center p-4">
      <LanguageSwitcher variant="dark" className="absolute top-4 right-4" />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ZAKO Admin</h1>
          <p className="text-gray-400 mt-1 text-sm">{t('tagline')}</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!mfaRequired ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">{t('login.title')}</h2>
                <p className="text-gray-400 text-sm">{t('login.subtitle')}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">{t('common:table.username')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input {...register('username')} placeholder="admin" autoComplete="username" // i18n-ignore: example value
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                  />
                </div>
                {errors.username && <p className="text-xs text-red-400">{t('validation.usernameRequired')}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{t('validation.passwordRequired')}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {t('login.submit')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa(onMfa)} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">{t('mfa.title')}</h2>
                <p className="text-gray-400 text-sm">{t('mfa.subtitle')}</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">{t('mfa.code')}</label>
                <input {...regMfa('token')} placeholder="000000" maxLength={6} inputMode="numeric"
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
                {mfaErrors.token && <p className="text-xs text-red-400 text-center">{t('validation.codeLength')}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {t('mfa.verify')}
              </button>
              <button type="button" onClick={() => setMfaRequired(false)} className="w-full text-sm text-gray-400 hover:text-gray-200 transition">{t('mfa.back')}</button>
            </form>
          )}
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">{t('footer')}</p>
      </div>
    </div>
  );
}
