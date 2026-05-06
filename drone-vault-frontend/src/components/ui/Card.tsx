interface Props { children: React.ReactNode; className?: string; onClick?: () => void }
export function Card({ children, className = '', onClick }: Props) {
  return (
    <div onClick={onClick} className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-slate-700 transition-colors' : ''} ${className}`}>
      {children}
    </div>
  )
}
