import { InputHTMLAttributes, forwardRef } from 'react'
interface Props extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <input ref={ref} className={`w-full h-10 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg px-3.5 py-2 text-slate-950 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 ${className}`} {...props} />
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
))
Input.displayName = 'Input'
