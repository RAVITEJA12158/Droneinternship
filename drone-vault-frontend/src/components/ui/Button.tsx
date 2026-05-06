import { ReactNode, ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const variants = {
  primary: 'bg-green-600 hover:bg-green-500 text-white',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
}
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }

export function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }: Props) {
  return (
    <button {...props} disabled={disabled || loading} className={`inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
