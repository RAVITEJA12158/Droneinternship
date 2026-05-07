import api from './axios'
import { Project, PaginatedResponse } from '@/types'

export interface CreateProjectPayload {
  name: string
  description?: string
  latitude?: number
  longitude?: number
}

type ProjectResponse = Project & {
  _count?: {
    missions?: number
  }
}

function normalizeProject(project: ProjectResponse): Project {
  return {
    ...project,
    missionCount: project.missionCount ?? project._count?.missions,
  }
}

export const projectsApi = {
  getAll: async (): Promise<PaginatedResponse<Project>> => {
    const res = await api.get('/api/projects')
    return {
      ...res.data,
      data: res.data.data.map(normalizeProject),
    }
  },

  getById: async (id: string): Promise<Project> => {
    const res = await api.get(`/api/projects/${id}`)
    return normalizeProject(res.data)
  },

  create: async (data: CreateProjectPayload): Promise<Project> => {
    const res = await api.post('/api/projects', data)
    return normalizeProject(res.data)
  },

  update: async (id: string, data: Partial<CreateProjectPayload>): Promise<Project> => {
    const res = await api.patch(`/api/projects/${id}`, data)
    return normalizeProject(res.data)
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`)
  },
}
