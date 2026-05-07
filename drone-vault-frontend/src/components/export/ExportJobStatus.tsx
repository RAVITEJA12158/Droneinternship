import { ExportJob } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Download, Loader2 } from 'lucide-react'

const statusVariant: Record<string, 'amber' | 'blue' | 'green' | 'red'> = { waiting: 'amber', active: 'blue', completed: 'green', failed: 'red' }

export function ExportJobStatus({ job }: { job: ExportJob }) {
  return (
    <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-4">
      <Badge variant={statusVariant[job.status] || 'amber'}>{job.status.toUpperCase()}</Badge>
      <span className="text-slate-400 text-sm">Job {job.jobId}</span>
      {job.status === 'completed' && job.downloadUrl && (
        <a href={job.downloadUrl} download>
          <Button size="sm"><Download size={14} className="mr-2" />Download</Button>
        </a>
      )}
      {(job.status === 'waiting' || job.status === 'active') && (
        <Loader2 size={16} className="animate-spin text-slate-400 ml-auto" />
      )}
    </div>
  )
}
