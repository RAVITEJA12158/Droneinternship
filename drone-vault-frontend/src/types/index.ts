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
  captureSetCount?: number
  orthomosaicCount?: number
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

export interface LabellingClassStats {
  id: number
  name: string
  color: string
  pixels: number
  percentage: number
}

export interface LabellingSegmentStats {
  segment_id: number
  class_id: number
  cluster_id?: number
  mean_ndvi: number
  mean_ndre: number
  area_pixels: number
  confidence?: number
}

export interface LabellingVisualizations {
  sourceCompositeMapUrl?: string | null
  superpixelsMapUrl?: string | null
  overlayMapUrl?: string | null
  confidenceMapUrl?: string | null
  diseasePredictionMapUrl?: string | null
  diseasePredictionConfidenceMapUrl?: string | null
  diseasePredictionNotebookMapUrl?: string | null
  diseasePredictionGroundTruthMapUrl?: string | null
  ndviHistogramUrl?: string | null
  ndreHistogramUrl?: string | null
  classDistributionUrl?: string | null
  classDistributionPieUrl?: string | null
  ndviNdreScatterUrl?: string | null
}

export interface LabellingArtifacts {
  ndviTifUrl?: string | null
  ndreTifUrl?: string | null
  labelsTifUrl?: string | null
  superpixelsTifUrl?: string | null
  diseasePredictionTifUrl?: string | null
  diseasePredictionStatsJsonUrl?: string | null
  statisticsJsonUrl?: string | null
  datasetSummaryCsvUrl?: string | null
}

export interface DiseasePredictionStats {
  enabled?: boolean
  status?: string
  error?: string
  model_name?: string
  checkpoint_name?: string
  device?: string
  patch_size?: number
  stride?: number
  batch_size?: number
  target_multispectral_bands?: number
  input_channels?: number
  num_tiles?: number
  prediction_threshold?: number
  average_confidence?: number
  min_confidence?: number
  max_confidence?: number
  covered_pixels?: number
  classes?: Record<string, LabellingClassStats>
}

export interface LabellingStats {
  message?: string
  progress?: number
  stopped?: boolean
  labeling_method?: string
  parameters?: Record<string, number>
  ndvi?: Record<string, number>
  ndre?: Record<string, number>
  ndvi_percentiles?: Record<string, number>
  ndre_percentiles?: Record<string, number>
  classes?: Record<string, LabellingClassStats>
  cluster_centers?: number[][]
  segments?: LabellingSegmentStats[]
  diseasePrediction?: DiseasePredictionStats
  visualizations?: LabellingVisualizations
  artifacts?: LabellingArtifacts
  error?: string
}

export interface LabellingJob {
  id: string
  missionId: string
  orthomosaicId: string
  labelMapUrl?: string | null
  ndviMapUrl?: string | null
  ndreMapUrl?: string | null
  stats?: LabellingStats | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  updatedAt: string
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
