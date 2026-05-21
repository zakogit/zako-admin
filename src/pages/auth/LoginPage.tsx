import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Eye, EyeOff, Lock, User } from 'lucide-react';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';

import toast from 'react-hot-toast';

const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const mfaSchema = z.object({ token: z.string().length(6) });
type FormData = z.infer<typeof schema>;
type MfaData = z.infer<typeof mfaSchema>;

export default function LoginPage() {
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
        toast('Please enter your 2FA code', { icon: '🔐' });
      } else {
        login(res.data as any);
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Login failed');
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
      toast.success('Welcome back!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-primary-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ZAKO Admin</h1>
          <p className="text-gray-400 mt-1 text-sm">Enterprise Management Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          {!mfaRequired ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
                <p className="text-gray-400 text-sm">Enter your admin credentials</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input {...register('username')} placeholder="admin" autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                  />
                </div>
                {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa(onMfa)} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Two-Factor Auth</h2>
                <p className="text-gray-400 text-sm">Enter the 6-digit code from your authenticator</p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-300">Authentication Code</label>
                <input {...regMfa('token')} placeholder="000000" maxLength={6} inputMode="numeric"
                  className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                />
                {mfaErrors.token && <p className="text-xs text-red-400 text-center">{mfaErrors.token.message}</p>}
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                Verify
              </button>
              <button type="button" onClick={() => setMfaRequired(false)} className="w-full text-sm text-gray-400 hover:text-gray-200 transition">← Back to login</button>
            </form>
          )}
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">ZAKO Enterprise v2.0 · Secured</p>
      </div>
    </div>
  );
}
