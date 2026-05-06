import { LucideIcon } from 'lucide-react'
interface Props { label: string; value: string | number; icon: LucideIcon; color?: string }
export function StatCard({ label, value, icon: Icon, color = 'text-green-400' }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        <div className={`${color} bg-slate-800 p-2 rounded-lg`}><Icon size={18} /></div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
