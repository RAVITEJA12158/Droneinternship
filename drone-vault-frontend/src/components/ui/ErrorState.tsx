import { AlertTriangle } from 'lucide-react'
interface Props { message?: string }
export function ErrorState({ message = 'Something went wrong' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle size={40} className="text-red-400 mb-3" />
      <p className="text-slate-300">{message}</p>
    </div>
  )
}
