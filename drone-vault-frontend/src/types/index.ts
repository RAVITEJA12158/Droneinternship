// types/index.ts

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER'
  createdAt: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  latitude?: number
  longitude?: number
  missionCount?: number
  createdAt: string
  updatedAt: string
}

export interface Mission {
  id: string
  projectId: string
  name: string
  captureDate: string
  notes?: string
  fileCount?: number
  storageUsed?: number
  createdAt: string
  updatedAt: string
}

export interface CaptureSet {
  id: string
  missionId: string
  shotNumber: number
  timestamp?: string
  lat?: number
  lng?: number
  status: 'RAW' | 'PROCESSED' | 'FAILED'
  files?: DroneFile[]
}

export interface DroneFile {
  id: string
  missionId: string
  captureSetId?: string
  fileType: 'RGB_JPG' | 'MS_TIF' | 'MISSION_PLAN' | 'METADATA_JSON' | 'OTHER'
  originalName: string
  relativePath: string
  thumbnailPath?: string
  size: number
  checksum?: string
  uploadedAt: string
}

export interface Orthomosaic {
  id: string
  missionId: string
  type: 'RGB' | 'MULTISPECTRAL' | 'NDVI' | 'DSM'
  relativePath: string
  previewPath?: string
  version: number
  createdAt: string
}

export interface DashboardStats {
  totalProjects: number
  totalMissions: number
  totalFiles: number
  storageUsed: number
  recentMissions: Mission[]
  recentProjects: Project[]
}

export interface ExportJob {
  jobId: string
  status: 'waiting' | 'active' | 'completed' | 'failed'
  downloadUrl?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface UploadJob {
  id: string
  missionId: string
  step: 'rgb' | 'multispectral' | 'plan' | 'orthomosaic'
  status: 'uploading' | 'processing' | 'complete' | 'failed'
  progress: number
  fileName?: string
  error?: string
}
