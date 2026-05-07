import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variants = {
  primary: 'bg-cyan-700 hover:bg-cyan-600 text-white shadow-sm shadow-cyan-900/10',
  secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-cyan-50 text-slate-600 hover:text-cyan-800',
}
const sizes = { sm: 'px-3 py-2 text-sm h-9', md: 'px-4 py-2.5 text-sm h-10', lg: 'px-5 py-3 text-base h-11' }

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }: Props) {
  return (
    <button {...props} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
