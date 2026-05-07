interface Props { children: React.ReactNode; className?: string; onClick?: () => void }
export function Card({ children, className = '', onClick }: Props) {
  return (
    <div onClick={onClick} className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm ${onClick ? 'cursor-pointer hover:border-cyan-300 hover:shadow-md transition-all' : ''} ${className}`}>
      {children}
    </div>
  )
}
