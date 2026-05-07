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

function normalizeProjectResponse(payload: unknown): PaginatedResponse<Project> {
  if (Array.isArray(payload)) {
    return {
      data: payload.map((project) => normalizeProject(project as ProjectResponse)),
      total: payload.length,
      page: 1,
      limit: payload.length,
      hasMore: false,
    }
  }

  const response = payload as Partial<PaginatedResponse<ProjectResponse>> | null
  const data = Array.isArray(response?.data) ? response.data : []

  return {
    data: data.map(normalizeProject),
    total: typeof response?.total === 'number' ? response.total : data.length,
    page: typeof response?.page === 'number' ? response.page : 1,
    limit: typeof response?.limit === 'number' ? response.limit : data.length,
    hasMore: Boolean(response?.hasMore),
  }
}

export const projectsApi = {
  getAll: async (): Promise<PaginatedResponse<Project>> => {
    const res = await api.get('/api/projects')
    return normalizeProjectResponse(res.data)
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
