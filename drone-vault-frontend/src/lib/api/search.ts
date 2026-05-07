import api from './axios'
import { Project, Mission, DroneFile } from '@/types'

export interface SearchResults {
  projects: Project[]
  missions: Mission[]
  files: Array<DroneFile & { mission?: { id: string; name: string; projectId: string } }>
}

export const searchApi = {
  search: async (query: string): Promise<SearchResults> => {
    const res = await api.get('/api/search', { params: { q: query } })
    return {
      projects: Array.isArray(res.data.projects) ? res.data.projects : [],
      missions: Array.isArray(res.data.missions) ? res.data.missions : [],
      files: Array.isArray(res.data.files) ? res.data.files : [],
    }
  },
}
