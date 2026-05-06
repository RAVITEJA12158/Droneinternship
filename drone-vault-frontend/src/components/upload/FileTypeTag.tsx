import { Badge } from '@/components/ui/Badge'
const tagMap: Record<string, { label: string; variant: 'green' | 'blue' | 'amber' | 'red' | 'slate' }> = {
  RGB_JPG: { label: 'RGB JPG', variant: 'green' },
  MS_TIF: { label: 'MS TIF', variant: 'blue' },
  MISSION_PLAN: { label: 'Plan', variant: 'amber' },
  METADATA_JSON: { label: 'Meta', variant: 'slate' },
  OTHER: { label: 'Other', variant: 'slate' },
}
export function FileTypeTag({ fileType }: { fileType: string }) {
  const t = tagMap[fileType] ?? { label: fileType, variant: 'slate' as const }
  return <Badge variant={t.variant}>{t.label}</Badge>
}
