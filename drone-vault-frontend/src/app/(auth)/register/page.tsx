'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })
type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: signup, isRegistering } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-cyan-700 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-slate-950">DroneVault</span>
          </div>
          <p className="text-slate-500">Create your account</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit((d) => signup({ name: d.name, email: d.email, password: d.password }))} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Password' },
              { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm password' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input {...register(f.name as keyof FormValues)} type={f.type} className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-950 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600" placeholder={f.placeholder} />
                {errors[f.name as keyof FormValues] && <p className="text-red-500 text-xs mt-1">{errors[f.name as keyof FormValues]?.message}</p>}
              </div>
            ))}
            <button type="submit" disabled={isRegistering} className="w-full h-10 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm">
              {isRegistering ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">Already have an account? <Link href="/login" className="text-cyan-700 hover:text-cyan-900 font-medium">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
