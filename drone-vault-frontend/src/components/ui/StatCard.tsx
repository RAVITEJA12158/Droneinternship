import { LucideIcon } from 'lucide-react'
interface Props { label: string; value: string | number; icon: LucideIcon; color?: string }
export function StatCard({ label, value, icon: Icon, color = 'text-cyan-700' }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <div className={`${color} bg-slate-100 p-2 rounded-xl`}><Icon size={18} /></div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  )
}
