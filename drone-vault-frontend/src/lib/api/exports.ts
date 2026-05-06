import api from './axios'
import { ExportJob } from '@/types'

export const exportsApi = {
  exportZip: async (missionId: string): Promise<{ jobId: string }> => {
    const res = await api.post(`/api/missions/${missionId}/export/zip`)
    return res.data
  },

  exportPdf: async (missionId: string): Promise<{ jobId: string }> => {
    const res = await api.post(`/api/missions/${missionId}/export/pdf`)
    return res.data
  },

  exportJson: async (missionId: string): Promise<{ jobId: string }> => {
    const res = await api.post(`/api/missions/${missionId}/export/json`)
    return res.data
  },

  getStatus: async (jobId: string): Promise<ExportJob> => {
    const res = await api.get(`/api/exports/${jobId}/status`)
    return res.data
  },
}
