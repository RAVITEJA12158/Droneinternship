'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { authApi, LoginPayload, RegisterPayload } from '@/lib/api/auth'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, setUser, clearUser } = useAuthStore()
  const router = useRouter()

  const loginMutation = useMutation({
    mutationFn: (data: LoginPayload) => authApi.login(data),
    onSuccess: (data) => {
      setUser(data.user)
      toast.success('Welcome back!')
      router.push('/')
    },
    onError: () => {
      toast.error('Invalid credentials')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterPayload) => authApi.register(data),
    onSuccess: (data) => {
      setUser(data.user)
      toast.success('Account created!')
      router.push('/')
    },
    onError: () => {
      toast.error('Registration failed')
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearUser()
      router.push('/login')
    },
  })

  return {
    user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  }
}
