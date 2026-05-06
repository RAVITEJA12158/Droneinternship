'use client'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { filesApi } from '@/lib/api/files'
import { captureSetsApi } from '@/lib/api/captureSets'
import { orthomosaicsApi } from '@/lib/api/orthomosaics'

export function useFiles(missionId: string, fileType?: string) {
  return useInfiniteQuery({
    queryKey: ['files', missionId, fileType],
    queryFn: ({ pageParam = 1 }) =>
      filesApi.getByMission(missionId, { fileType, page: pageParam as number, limit: 30 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!missionId,
  })
}

export function useCaptureSets(missionId: string) {
  return useInfiniteQuery({
    queryKey: ['captureSets', missionId],
    queryFn: ({ pageParam = 1 }) =>
      captureSetsApi.getByMission(missionId, { page: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!missionId,
  })
}

export function useOrthomosaics(missionId: string) {
  return useQuery({
    queryKey: ['orthomosaics', missionId],
    queryFn: () => orthomosaicsApi.getByMission(missionId),
    enabled: !!missionId,
  })
}
