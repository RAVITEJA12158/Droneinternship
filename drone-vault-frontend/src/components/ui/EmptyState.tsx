import { LucideIcon } from 'lucide-react'
interface Props { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-slate-500" />
      </div>
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
