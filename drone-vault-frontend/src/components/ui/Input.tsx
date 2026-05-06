import { InputHTMLAttributes, forwardRef } from 'react'
interface Props extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }
export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...props }, ref) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
    <input ref={ref} className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${className}`} {...props} />
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
))
Input.displayName = 'Input'
