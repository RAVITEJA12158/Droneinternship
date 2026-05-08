'use client'

import { MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useDeleteMission } from '@/hooks/useMissions'

interface Props {
  projectId: string
  missionId: string
  missionName: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  className?: string
  preventNavigation?: boolean
}

export function DeleteMissionButton({
  projectId,
  missionId,
  missionName,
  size = 'sm',
  variant = 'danger',
  className,
  preventNavigation = false,
}: Props) {
  const deleteMission = useDeleteMission(projectId)

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (preventNavigation) {
      event.preventDefault()
      event.stopPropagation()
    }

    const confirmed = window.confirm(
      `Delete mission "${missionName}"? This will permanently remove its uploads, capture sets, and orthomosaics.`
    )

    if (!confirmed) {
      return
    }

    deleteMission.mutate(missionId)
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      loading={deleteMission.isPending}
      onClick={handleClick}
    >
      <Trash2 size={14} />
      Delete
    </Button>
  )
}
