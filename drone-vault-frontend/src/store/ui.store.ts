import { create } from 'zustand'
import { UploadJob } from '@/types'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  activeUploadJobs: UploadJob[]
  addUploadJob: (job: UploadJob) => void
  updateUploadJob: (id: string, update: Partial<UploadJob>) => void
  removeUploadJob: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  activeUploadJobs: [],
  addUploadJob: (job) =>
    set((state) => ({ activeUploadJobs: [...state.activeUploadJobs, job] })),
  updateUploadJob: (id, update) =>
    set((state) => ({
      activeUploadJobs: state.activeUploadJobs.map((j) =>
        j.id === id ? { ...j, ...update } : j
      ),
    })),
  removeUploadJob: (id) =>
    set((state) => ({
      activeUploadJobs: state.activeUploadJobs.filter((j) => j.id !== id),
    })),
}))
