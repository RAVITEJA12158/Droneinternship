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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            <span className="text-2xl font-bold text-white">DroneVault</span>
          </div>
          <p className="text-slate-400">Create your account</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit((d) => signup({ name: d.name, email: d.email, password: d.password }))} className="space-y-4">
            {[
              { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
              { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
            ].map((f) => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-slate-300 mb-1">{f.label}</label>
                <input {...register(f.name as keyof FormValues)} type={f.type} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" placeholder={f.placeholder} />
                {errors[f.name as keyof FormValues] && <p className="text-red-400 text-xs mt-1">{errors[f.name as keyof FormValues]?.message}</p>}
              </div>
            ))}
            <button type="submit" disabled={isRegistering} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
              {isRegistering ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">Already have an account? <Link href="/login" className="text-green-400 hover:text-green-300">Sign in</Link></p>
        </div>
      </div>
    </div>
  )
}
