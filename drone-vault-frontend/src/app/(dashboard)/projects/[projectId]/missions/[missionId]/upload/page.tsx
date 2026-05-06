'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { FolderDropzone } from '@/components/upload/FolderDropzone'
import { UploadProgressBar } from '@/components/upload/UploadProgressBar'
import { Button } from '@/components/ui/Button'
import { useUpload } from '@/hooks/useUpload'
import toast from 'react-hot-toast'

const STEPS = [
  { id: 'rgb', label: 'RGB Images', description: 'Upload .jpg/.jpeg files from RGB camera' },
  { id: 'multispectral', label: 'Multispectral', description: 'Upload .tif/.tiff files from multispectral camera' },
  { id: 'plan', label: 'Mission Plan', description: 'Upload .plan, .json, or .waypoints file' },
  { id: 'orthomosaic', label: 'Orthomosaics', description: 'Upload processed orthomosaic files (optional)' },
]

const ACCEPTS: Record<string, string[]> = {
  rgb: ['.jpg', '.jpeg'],
  multispectral: ['.tif', '.tiff'],
  plan: ['.plan', '.json', '.waypoints'],
  orthomosaic: ['.tif', '.tiff', '.jpg'],
}

export default function UploadPage() {
  const { projectId, missionId } = useParams<{ projectId: string; missionId: string }>()
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<Record<string, { status: string; progress: number }>>({})
  const { uploadRgb, uploadMultispectral, uploadPlan, uploadOrthomosaic, isUploading } = useUpload({ missionId })

  const currentStep = STEPS[step]

  const handleUpload = async () => {
    if (!files.length) { toast.error('Please select files first'); return }
    const stepId = currentStep.id
    setUploadStatus(prev => ({ ...prev, [stepId]: { status: 'uploading', progress: 0 } }))
    try {
      if (stepId === 'rgb') await uploadRgb(files)
      else if (stepId === 'multispectral') await uploadMultispectral(files)
      else if (stepId === 'plan') await uploadPlan(files)
      else await uploadOrthomosaic(files)
      setUploadStatus(prev => ({ ...prev, [stepId]: { status: 'complete', progress: 100 } }))
      toast.success(`${currentStep.label} uploaded!`)
      setFiles([])
      if (step < STEPS.length - 1) setStep(s => s + 1)
    } catch {
      setUploadStatus(prev => ({ ...prev, [stepId]: { status: 'failed', progress: 0 } }))
      toast.error('Upload failed')
    }
  }

  return (
    <PageShell title="Upload Data" subtitle={`Mission upload wizard — Step ${step + 1} of ${STEPS.length}`}>
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button onClick={() => setStep(i)} className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${i === step ? 'bg-green-600 text-white' : i < step ? 'bg-green-800 text-green-300' : 'bg-slate-800 text-slate-500'}`}>{i + 1}</button>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < step ? 'bg-green-600' : 'bg-slate-800'}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg">{currentStep.label}</h2>
            <p className="text-slate-400 text-sm mt-1">{currentStep.description}</p>
          </div>
          <FolderDropzone accept={ACCEPTS[currentStep.id]} label={currentStep.label} onFilesSelected={setFiles} />
          {uploadStatus[currentStep.id] && (
            <UploadProgressBar progress={uploadStatus[currentStep.id].progress} status={uploadStatus[currentStep.id].status} label={currentStep.label} />
          )}
          <div className="flex gap-3">
            {step > 0 && <Button variant="secondary" onClick={() => setStep(s => s - 1)}>Previous</Button>}
            <Button loading={isUploading} onClick={handleUpload} disabled={!files.length}>Upload & Continue</Button>
            {step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={() => { setFiles([]); setStep(s => s + 1) }}>Skip</Button>
            )}
          </div>
        </div>

        {/* Completed steps */}
        {Object.entries(uploadStatus).filter(([, v]) => v.status === 'complete').map(([stepId]) => (
          <div key={stepId} className="flex items-center gap-3 text-green-400 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {STEPS.find(s => s.id === stepId)?.label} uploaded
          </div>
        ))}
      </div>
    </PageShell>
  )
}
