'use client'
import { useState, useCallback } from 'react'
// BUG-10 fix: use the configured api instance (not raw axios) so that:
// 1. The 401 redirect interceptor is applied
// 2. baseURL is always set from the configured instance (no undefined URL risk)
import api from '@/lib/api/axios'
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

        // BUG-10 fix: api instance has baseURL set + interceptors; no manual withCredentials needed
        await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const progress = evt.total
              ? Math.round((evt.loaded * 100) / evt.total)
              : 0
            updateUploadJob(jobId, { progress })
          },
        })

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
    (files: File[]) => {
      const jobId = `${missionId}-orthomosaic-${Date.now()}`
      const job: UploadJob = {
        id: jobId,
        missionId,
        step: 'orthomosaic',
        status: 'uploading',
        progress: 0,
      }
      addUploadJob(job)
      const post = async () => {
        try {
          const formData = new FormData()

          const inferField = (f: File) => {
            const name = f.name.toLowerCase()
            if (name.includes('ndvi')) return 'ndvi'
            if (name.includes('dsm')) return 'dsm'
            if (name.includes('rgb')) return 'rgb'
            if (name.includes('multi') || name.includes('multispect') || name.endsWith('.tif') || name.endsWith('.tiff')) return 'multispectral'
            if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'rgb'
            return 'rgb'
          }

          files.forEach((file) => {
            const field = inferField(file)
            formData.append(field, file)
          })

          await api.post(`/api/missions/${missionId}/upload/orthomosaic`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              const progress = evt.total ? Math.round((evt.loaded * 100) / evt.total) : 0
              updateUploadJob(jobId, { progress })
            },
          })

          updateUploadJob(jobId, { status: 'complete', progress: 100 })
        } catch (err) {
          updateUploadJob(jobId, { status: 'failed' })
          throw err
        }
      }

      post()
    },
    [uploadFiles, missionId]
  )

  return { uploadRgb, uploadMultispectral, uploadPlan, uploadOrthomosaic, isUploading }
}
