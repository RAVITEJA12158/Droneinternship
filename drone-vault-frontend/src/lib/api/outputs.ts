import api from './axios'

export const outputsApi = {
  getByMission: async (missionId: string, params?: { subdir?: string }) => {
    const res = await api.get(`/api/missions/${missionId}/outputs`, { params })
    return res.data as any[]
  },
}
