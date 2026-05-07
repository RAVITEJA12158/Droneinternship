'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FolderOpen, X, AlertCircle } from 'lucide-react'
import { formatBytes } from '@/lib/utils/formatBytes'

interface Props { accept: string[]; label: string; onFilesSelected: (files: File[]) => void }

export function FolderDropzone({ accept, label, onFilesSelected }: Props) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((accepted: File[]) => {
    const filtered = accepted.filter(f => accept.some(ext => f.name.toLowerCase().endsWith(ext)))
    setFiles(filtered)
    onFilesSelected(filtered)
  }, [accept, onFilesSelected])

  // BUG-14 fix: pass accept to useDropzone so the OS file picker filters correctly
  // and fileRejections are populated for wrong-type drops.
  const acceptObj = accept.reduce<Record<string, string[]>>((acc, ext) => {
    const mime = `application/${ext.replace('.', '')}`
    acc[mime] = [ext]
    return acc
  }, {})

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: true,
    accept: acceptObj,
  })

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
      {/* BUG-14 fix: surface rejected file count so users know why files were dropped */}
      {fileRejections.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm text-amber-400">
          <AlertCircle size={14} />
          {fileRejections.length} file{fileRejections.length > 1 ? 's' : ''} ignored — only {accept.join(', ')} files are accepted
        </div>
      )}
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
