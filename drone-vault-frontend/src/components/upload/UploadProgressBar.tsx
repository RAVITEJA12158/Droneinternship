interface Props { progress: number; status: string; label: string }
const statusColors: Record<string, string> = { uploading: 'bg-blue-500', processing: 'bg-amber-500', complete: 'bg-green-500', failed: 'bg-red-500' }
export function UploadProgressBar({ progress, status, label }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 capitalize">{status} {status === 'uploading' ? `${progress}%` : ''}</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${statusColors[status] ?? 'bg-slate-600'}`} style={{ width: `${status === 'complete' ? 100 : progress}%` }} />
      </div>
    </div>
  )
}
