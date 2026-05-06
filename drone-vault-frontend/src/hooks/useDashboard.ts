'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000,
  })
}
