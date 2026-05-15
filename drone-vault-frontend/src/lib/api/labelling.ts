import api from './axios'
import { LabellingJob } from '@/types'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function withApiBase(url?: string | null) {
  if (!url) return url
  if (/^https?:\/\//.test(url)) return url
  return `${apiBaseUrl}${url}`
}

function normalize(job: LabellingJob | null): LabellingJob | null {
  if (!job) return null
  const withApiBaseMap = <T extends object>(map?: T | null): T | undefined => {
    if (!map) return undefined
    return Object.fromEntries(
      Object.entries(map).map(([key, value]) => [
        key,
        typeof value === 'string' ? withApiBase(value) : value,
      ])
    ) as T
  }

  return {
    ...job,
    labelMapUrl: withApiBase(job.labelMapUrl),
    ndviMapUrl: withApiBase(job.ndviMapUrl),
    ndreMapUrl: withApiBase(job.ndreMapUrl),
    stats: job.stats
      ? {
          ...job.stats,
          visualizations: withApiBaseMap(job.stats.visualizations),
          artifacts: withApiBaseMap(job.stats.artifacts),
        }
      : job.stats,
  }
}

export const labellingApi = {
  getByMission: async (missionId: string): Promise<LabellingJob | null> => {
    const res = await api.get(`/api/missions/${missionId}/labelling`)
    return normalize(res.data)
  },

  start: async (missionId: string): Promise<LabellingJob> => {
    const res = await api.post(`/api/missions/${missionId}/labelling/start`)
    return normalize(res.data) as LabellingJob
  },

  stop: async (missionId: string): Promise<LabellingJob> => {
    const res = await api.post(`/api/missions/${missionId}/labelling/stop`)
    return normalize(res.data) as LabellingJob
  },
}
