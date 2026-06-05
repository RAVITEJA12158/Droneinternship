import api from './axios'
import { DroneFile, PaginatedResponse } from '@/types'
import { outputsApi } from './outputs'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const filesApi = {
  getByMission: async (
    missionId: string,
    params?: { fileType?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<DroneFile>> => {
    const res = await api.get(`/api/missions/${missionId}/files`, { params })
    const payload = res.data as PaginatedResponse<DroneFile>

    // On the first page, also include any on-disk outputs found under the mission storage
    try {
      const page = params?.page ?? 1
      if (page === 1) {
        const outputs = await outputsApi.getByMission(missionId)
        if (Array.isArray(outputs) && outputs.length) {
          const transformed = outputs.map((o: any) => ({
            id: o.id,
            missionId: o.missionId,
            captureSetId: undefined,
            fileType: 'OTHER',
            originalName: o.originalName,
            relativePath: o.relativePath,
            thumbnailPath: undefined,
            size: o.size,
            checksum: undefined,
            uploadedAt: o.uploadedAt,
            // Ensure downloadUrl is absolute
            downloadUrl: /^https?:\/\//.test(o.downloadUrl) ? o.downloadUrl : `${apiBaseUrl}${o.downloadUrl}`,
          }))

          payload.data = [...payload.data, ...transformed]
          payload.total = payload.total + transformed.length
        }
      }
    } catch (err) {
      // ignore outputs listing errors so file listing still works
      // console.warn('Could not load mission outputs', err)
    }

    return payload
  },

  getById: async (id: string): Promise<DroneFile> => {
    const res = await api.get(`/api/files/${id}`)
    return res.data
  },

  getThumbnailUrl: (id: string): string => {
    return `${apiBaseUrl}/api/files/${id}/thumbnail`
  },

  getDownloadUrl: (id: string): string => {
    return `${apiBaseUrl}/api/files/${id}/download`
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/files/${id}`)
  },
}
