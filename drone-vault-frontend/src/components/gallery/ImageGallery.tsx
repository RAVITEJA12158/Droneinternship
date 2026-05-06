'use client'
import { useState, useEffect, useRef } from 'react'
import { useFiles } from '@/hooks/useFiles'
import { ThumbnailCard } from './ThumbnailCard'
import { LightboxViewer } from './LightboxViewer'
import { Spinner } from '@/components/ui/Spinner'
import { DroneFile } from '@/types'

interface Props { missionId: string; fileType: 'RGB_JPG' | 'MS_TIF' }
export function ImageGallery({ missionId, fileType }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFiles(missionId, fileType)
  const [lightbox, setLightbox] = useState<{ file: DroneFile; allFiles: DroneFile[]; idx: number } | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const allFiles = data?.pages.flatMap(p => p.data) ?? []

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && hasNextPage) fetchNextPage() })
    if (loadMoreRef.current) obs.observe(loadMoreRef.current)
    return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage])

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!allFiles.length) return <p className="text-slate-400 text-center py-12">No {fileType} files uploaded yet.</p>

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {allFiles.map((f, i) => (
          <ThumbnailCard key={f.id} file={f} onClick={() => setLightbox({ file: f, allFiles, idx: i })} />
        ))}
      </div>
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage && <Spinner />}
      </div>
      {lightbox && (
        <LightboxViewer
          file={lightbox.file}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.idx > 0 ? () => setLightbox({ ...lightbox, file: lightbox.allFiles[lightbox.idx - 1], idx: lightbox.idx - 1 }) : undefined}
          onNext={lightbox.idx < lightbox.allFiles.length - 1 ? () => setLightbox({ ...lightbox, file: lightbox.allFiles[lightbox.idx + 1], idx: lightbox.idx + 1 }) : undefined}
        />
      )}
    </>
  )
}
