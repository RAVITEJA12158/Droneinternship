'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { exportsApi } from '@/lib/api/exports'
import { ExportJob } from '@/types'
import toast from 'react-hot-toast'

export function useExport(missionId: string) {
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // BUG-13 fix: clean up interval when component unmounts
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

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
      // BUG-05 fix: PDF is not implemented — show a clear message instead of spinning forever
      if (type === 'pdf') {
        toast.error('PDF export is not yet available. Please use ZIP or JSON.')
        return
      }

      setIsExporting(true)
      setJob(null)
      try {
        let result: { jobId: string }
        if (type === 'zip') result = await exportsApi.exportZip(missionId)
        else result = await exportsApi.exportJson(missionId)

        // BUG-05 fix: guard against missing jobId before polling
        if (!result?.jobId) {
          toast.error('Export failed: unexpected server response')
          setIsExporting(false)
          return
        }

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
