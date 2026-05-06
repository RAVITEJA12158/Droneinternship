import api from './axios'
import { Project, Mission } from '@/types'

export interface SearchResults {
  projects: Project[]
  missions: Mission[]
}

export const searchApi = {
  search: async (query: string): Promise<SearchResults> => {
    const res = await api.get('/api/search', { params: { q: query } })
    return res.data
  },
}
