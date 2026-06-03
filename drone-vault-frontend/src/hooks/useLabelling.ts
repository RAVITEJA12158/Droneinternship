'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { labellingApi } from '@/lib/api/labelling'

export function useLabelling(missionId: string) {
  return useQuery({
    queryKey: ['labelling', missionId],
    queryFn: () => labellingApi.getByMission(missionId),
    enabled: !!missionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PENDING' || status === 'PROCESSING' ? 3000 : false
    },
  })
}

export function useStartLabelling(missionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => labellingApi.start(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labelling', missionId] })
      toast.success('Labelling started')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to start labelling')
    },
  })
}

export function useStopLabelling(missionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => labellingApi.stop(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labelling', missionId] })
      toast.success('Labelling stopped')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to stop labelling')
    },
  })
}

export function useResumeDisease(missionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => labellingApi.startDisease(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labelling', missionId] })
      toast.success('Disease prediction started')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to start disease prediction')
    },
  })
}

export function useResumeYield(missionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => labellingApi.startYield(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labelling', missionId] })
      toast.success('Yield prediction started')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to start yield prediction')
    },
  })
}
