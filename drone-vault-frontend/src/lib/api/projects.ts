import api from './axios'
import { Project, PaginatedResponse } from '@/types'

export interface CreateProjectPayload {
  name: string
  description?: string
  latitude?: number
  longitude?: number
}

export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const res = await api.get('/api/projects')
    return res.data
  },

  getById: async (id: string): Promise<Project> => {
    const res = await api.get(`/api/projects/${id}`)
    return res.data
  },

  create: async (data: CreateProjectPayload): Promise<Project> => {
    const res = await api.post('/api/projects', data)
    return res.data
  },

  update: async (id: string, data: Partial<CreateProjectPayload>): Promise<Project> => {
    const res = await api.patch(`/api/projects/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`)
  },
}
