import { ExportJob } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

const statusVariant: Record<string, 'amber' | 'blue' | 'green' | 'red'> = { QUEUED: 'amber', PROCESSING: 'blue', READY: 'green', FAILED: 'red' }

export function ExportJobStatus({ job }: { job: ExportJob }) {
  return (
    <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-4">
      <Badge variant={statusVariant[job.status]}>{job.status}</Badge>
      <span className="text-slate-400 text-sm">Job {job.jobId}</span>
      {job.status === 'READY' && job.downloadUrl && (
        <a href={job.downloadUrl} download>
          <Button size="sm"><Download size={14} />Download</Button>
        </a>
      )}
    </div>
  )
}
