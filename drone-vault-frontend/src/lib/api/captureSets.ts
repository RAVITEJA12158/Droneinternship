import api from './axios'
import { CaptureSet, PaginatedResponse } from '@/types'

export const captureSetsApi = {
  getByMission: async (
    missionId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<CaptureSet>> => {
    const res = await api.get(`/api/missions/${missionId}/capture-sets`, { params })
    return res.data
  },

  getById: async (id: string): Promise<CaptureSet> => {
    const res = await api.get(`/api/capture-sets/${id}`)
    return res.data
  },
}
