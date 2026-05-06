'use client'
import { useState, useCallback, useRef } from 'react'
import { exportsApi } from '@/lib/api/exports'
import { ExportJob } from '@/types'
import toast from 'react-hot-toast'

export function useExport(missionId: string) {
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const pollStatus = useCallback(async (jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await exportsApi.getStatus(jobId)
        setJob(status)
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollRef.current!)
          setIsExporting(false)
          if (status.status === 'completed') {
            toast.success('Export ready for download!')
          } else {
            toast.error('Export failed')
          }
        }
      } catch {
        clearInterval(pollRef.current!)
        setIsExporting(false)
      }
    }, 3000)
  }, [])

  const startExport = useCallback(
    async (type: 'zip' | 'pdf' | 'json') => {
      setIsExporting(true)
      setJob(null)
      try {
        let result: { jobId: string }
        if (type === 'zip') result = await exportsApi.exportZip(missionId)
        else if (type === 'pdf') result = await exportsApi.exportPdf(missionId)
        else result = await exportsApi.exportJson(missionId)

        setJob({ jobId: result.jobId, status: 'waiting' })
        pollStatus(result.jobId)
      } catch {
        setIsExporting(false)
        toast.error('Failed to start export')
      }
    },
    [missionId, pollStatus]
  )

  return { job, isExporting, startExport }
}
