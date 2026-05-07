'use client'
import { useState } from 'react'
import { CaptureSet } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatBytes } from '@/lib/utils/formatBytes'

export function CaptureSetCard({ captureSet }: { captureSet: CaptureSet }) {
  const [expanded, setExpanded] = useState(false)
  const statusVariant: Record<string, 'green' | 'amber' | 'red'> = { PROCESSED: 'green', RAW: 'amber', FAILED: 'red' }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-cyan-50/60" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <span className="text-slate-950 font-medium">Shot #{captureSet.shotNumber}</span>
          {captureSet.timestamp && <span className="text-slate-500 text-sm">{new Date(captureSet.timestamp).toLocaleTimeString()}</span>}
          {captureSet.lat != null && <span className="text-slate-500 text-xs">{captureSet.lat.toFixed(4)}, {captureSet.lng?.toFixed(4)}</span>}
          <Badge variant={statusVariant[captureSet.status] ?? 'slate'}>{captureSet.status}</Badge>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>
      {expanded && captureSet.files && (
        <div className="border-t border-slate-200 divide-y divide-slate-200">
          {captureSet.files.map(f => (
            <div key={f.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {f.thumbnailPath && <img src={`${process.env.NEXT_PUBLIC_API_URL}${f.thumbnailPath}`} alt="" className="w-8 h-8 rounded object-cover" />}
                <span className="text-sm text-slate-700">{f.originalName}</span>
              </div>
              <span className="text-xs text-slate-500">{formatBytes(f.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
