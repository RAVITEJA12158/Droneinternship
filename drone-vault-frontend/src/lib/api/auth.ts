import api from './axios'
import { User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export const authApi = {
  login: async (data: LoginPayload): Promise<{ user: User }> => {
    const res = await api.post('/api/auth/login', data)
    return res.data
  },

  register: async (data: RegisterPayload): Promise<{ user: User }> => {
    const res = await api.post('/api/auth/register', data)
    return res.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  me: async (): Promise<{ user: User }> => {
    const res = await api.get('/api/auth/me')
    return res.data
  },
}
