interface Props { children: React.ReactNode; variant?: 'green' | 'blue' | 'amber' | 'red' | 'slate'; className?: string }
const variants = { green: 'bg-green-500/20 text-green-400 border-green-500/30', blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30', amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30', red: 'bg-red-500/20 text-red-400 border-red-500/30', slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
export function Badge({ children, variant = 'slate', className = '' }: Props) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]} ${className}`}>{children}</span>
}
