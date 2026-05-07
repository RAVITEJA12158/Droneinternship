import api from './axios'
import { DroneFile, PaginatedResponse } from '@/types'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const filesApi = {
  getByMission: async (
    missionId: string,
    params?: { fileType?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<DroneFile>> => {
    const res = await api.get(`/api/missions/${missionId}/files`, { params })
    return res.data
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
