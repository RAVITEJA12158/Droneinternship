'use client'
import { useState, useCallback } from 'react'
import axios from 'axios'
import { useUIStore } from '@/store/ui.store'
import { UploadJob } from '@/types'

interface UploadOptions {
  missionId: string
  onComplete?: () => void
}

export function useUpload({ missionId, onComplete }: UploadOptions) {
  const { addUploadJob, updateUploadJob } = useUIStore()
  const [isUploading, setIsUploading] = useState(false)

  const uploadFiles = useCallback(
    async (
      files: File[],
      endpoint: string,
      step: UploadJob['step'],
      fieldName = 'files'
    ) => {
      const jobId = `${missionId}-${step}-${Date.now()}`
      const job: UploadJob = {
        id: jobId,
        missionId,
        step,
        status: 'uploading',
        progress: 0,
      }
      addUploadJob(job)
      setIsUploading(true)

      try {
        const formData = new FormData()
        files.forEach((file) => formData.append(fieldName, file))

        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
          formData,
          {
            withCredentials: true,
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              const progress = evt.total
                ? Math.round((evt.loaded * 100) / evt.total)
                : 0
              updateUploadJob(jobId, { progress })
            },
          }
        )

        updateUploadJob(jobId, { status: 'complete', progress: 100 })
        onComplete?.()
      } catch (err) {
        updateUploadJob(jobId, { status: 'failed' })
        throw err
      } finally {
        setIsUploading(false)
      }
    },
    [missionId, addUploadJob, updateUploadJob, onComplete]
  )

  const uploadRgb = useCallback(
    (files: File[]) =>
      uploadFiles(files, `/api/missions/${missionId}/upload/rgb`, 'rgb'),
    [uploadFiles, missionId]
  )

  const uploadMultispectral = useCallback(
    (files: File[]) =>
      uploadFiles(files, `/api/missions/${missionId}/upload/multispectral`, 'multispectral'),
    [uploadFiles, missionId]
  )

  const uploadPlan = useCallback(
    (files: File[]) =>
      uploadFiles(files, `/api/missions/${missionId}/upload/plan`, 'plan', 'plan'),
    [uploadFiles, missionId]
  )

  const uploadOrthomosaic = useCallback(
    (files: File[]) =>
      uploadFiles(files, `/api/missions/${missionId}/upload/orthomosaic`, 'orthomosaic'),
    [uploadFiles, missionId]
  )

  return { uploadRgb, uploadMultispectral, uploadPlan, uploadOrthomosaic, isUploading }
}
