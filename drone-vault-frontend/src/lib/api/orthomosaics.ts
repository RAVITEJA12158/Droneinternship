import api from './axios'
import { Orthomosaic } from '@/types'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const orthomosaicsApi = {
  getByMission: async (missionId: string): Promise<Orthomosaic[]> => {
    const res = await api.get(`/api/missions/${missionId}/orthomosaics`)
    return res.data
  },

  getById: async (id: string): Promise<Orthomosaic> => {
    const res = await api.get(`/api/orthomosaics/${id}`)
    return res.data
  },

  getPreviewUrl: (id: string): string => {
    return `${apiBaseUrl}/api/orthomosaics/${id}/preview`
  },
}
