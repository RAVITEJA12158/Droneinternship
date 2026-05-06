'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, X } from 'lucide-react'
import { formatBytes } from '@/lib/utils/formatBytes'

interface Props { accept: string[]; label: string; onFilesSelected: (files: File[]) => void }

export function FolderDropzone({ accept, label, onFilesSelected }: Props) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((accepted: File[]) => {
    const filtered = accepted.filter(f => accept.some(ext => f.name.toLowerCase().endsWith(ext)))
    setFiles(filtered)
    onFilesSelected(filtered)
  }, [accept, onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })
  const totalSize = files.reduce((s, f) => s + f.size, 0)

  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-green-500 bg-green-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
            <FolderOpen size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="text-white font-medium">{label}</p>
            <p className="text-slate-400 text-sm mt-1">Drop folder or click to select • {accept.join(', ')}</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-300">
            <Upload size={14} />Select Files
          </div>
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-3 bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-white font-medium">{files.length} files selected</span>
            <span className="text-slate-400 ml-2">({formatBytes(totalSize)})</span>
          </div>
          <button onClick={() => { setFiles([]); onFilesSelected([]) }} className="text-slate-500 hover:text-red-400 transition-colors"><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
