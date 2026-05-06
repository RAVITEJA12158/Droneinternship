import api from './axios'
import { Mission } from '@/types'

export interface CreateMissionPayload {
  name: string
  captureDate: string
  notes?: string
}

export const missionsApi = {
  getByProject: async (projectId: string): Promise<Mission[]> => {
    const res = await api.get(`/api/projects/${projectId}/missions`)
    return res.data
  },

  getById: async (id: string): Promise<Mission> => {
    const res = await api.get(`/api/missions/${id}`)
    return res.data
  },

  create: async (projectId: string, data: CreateMissionPayload): Promise<Mission> => {
    const res = await api.post(`/api/projects/${projectId}/missions`, data)
    return res.data
  },

  update: async (id: string, data: Partial<CreateMissionPayload>): Promise<Mission> => {
    const res = await api.patch(`/api/missions/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/missions/${id}`)
  },
}
