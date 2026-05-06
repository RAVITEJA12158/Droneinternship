'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { missionsApi, CreateMissionPayload } from '@/lib/api/missions'
import toast from 'react-hot-toast'

export function useMissions(projectId: string) {
  return useQuery({
    queryKey: ['missions', 'project', projectId],
    queryFn: () => missionsApi.getByProject(projectId),
    enabled: !!projectId,
  })
}

export function useMission(id: string) {
  return useQuery({
    queryKey: ['missions', id],
    queryFn: () => missionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateMission(projectId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: CreateMissionPayload) => missionsApi.create(projectId, data),
    onSuccess: (mission) => {
      queryClient.invalidateQueries({ queryKey: ['missions', 'project', projectId] })
      toast.success('Mission created!')
      router.push(`/projects/${projectId}/missions/${mission.id}`)
    },
    onError: () => {
      toast.error('Failed to create mission')
    },
  })
}

export function useDeleteMission(projectId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (id: string) => missionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions', 'project', projectId] })
      toast.success('Mission deleted')
      router.push(`/projects/${projectId}`)
    },
    onError: () => {
      toast.error('Failed to delete mission')
    },
  })
}
