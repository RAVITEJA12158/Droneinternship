import api from './axios'
import { Mission, PaginatedResponse } from '@/types'

export interface CreateMissionPayload {
  name: string
  captureDate: string
  notes?: string
}

type MissionResponse = Mission & {
  _count?: {
    files?: number
    captureSets?: number
    orthomosaics?: number
  }
}

function normalizeMission(mission: MissionResponse): Mission {
  return {
    ...mission,
    fileCount: mission.fileCount ?? mission._count?.files,
    captureSetCount: mission.captureSetCount ?? mission._count?.captureSets,
    orthomosaicCount: mission.orthomosaicCount ?? mission._count?.orthomosaics,
  }
}

function normalizeMissionList(payload: unknown): PaginatedResponse<Mission> {
  if (Array.isArray(payload)) {
    return {
      data: payload.map((mission) => normalizeMission(mission as MissionResponse)),
      total: payload.length,
      page: 1,
      limit: payload.length,
      hasMore: false,
    }
  }

  const response = payload as Partial<PaginatedResponse<MissionResponse>> | null
  const data = Array.isArray(response?.data) ? response.data : []

  return {
    data: data.map(normalizeMission),
    total: typeof response?.total === 'number' ? response.total : data.length,
    page: typeof response?.page === 'number' ? response.page : 1,
    limit: typeof response?.limit === 'number' ? response.limit : data.length,
    hasMore: Boolean(response?.hasMore),
  }
}

export const missionsApi = {
  getByProject: async (projectId: string): Promise<PaginatedResponse<Mission>> => {
    const res = await api.get(`/api/projects/${projectId}/missions`)
    return normalizeMissionList(res.data)
  },

  getById: async (id: string): Promise<Mission> => {
    const res = await api.get(`/api/missions/${id}`)
    return normalizeMission(res.data)
  },

  create: async (projectId: string, data: CreateMissionPayload): Promise<Mission> => {
    const res = await api.post(`/api/projects/${projectId}/missions`, data)
    return res.data
  },

  update: async (id: string, data: Partial<CreateMissionPayload>): Promise<Mission> => {
    const res = await api.patch(`/api/missions/${id}`, data)
    return normalizeMission(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/missions/${id}`)
  },
}
