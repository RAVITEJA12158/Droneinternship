'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            <span className="text-2xl font-bold text-white">DroneVault</span>
          </div>
          <p className="text-slate-400">Sign in to your account</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit((d) => login(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input {...register('email')} type="email" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input {...register('password')} type="password" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="••••••••" />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isLoggingIn} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
              {isLoggingIn ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">Don&apos;t have an account? <Link href="/register" className="text-green-400 hover:text-green-300">Register</Link></p>
        </div>
      </div>
    </div>
  )
}
