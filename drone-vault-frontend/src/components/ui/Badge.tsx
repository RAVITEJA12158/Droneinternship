interface Props { children: React.ReactNode; variant?: 'green' | 'blue' | 'amber' | 'red' | 'slate'; className?: string }
const variants = { green: 'bg-cyan-50 text-cyan-800 border-cyan-200', blue: 'bg-indigo-50 text-indigo-700 border-indigo-200', amber: 'bg-amber-50 text-amber-800 border-amber-200', red: 'bg-red-50 text-red-700 border-red-200', slate: 'bg-slate-100 text-slate-700 border-slate-200' }
export function Badge({ children, variant = 'slate', className = '' }: Props) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]} ${className}`}>{children}</span>
}
