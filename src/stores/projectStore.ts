import { create } from 'zustand'
import { ProjectData } from '../types/project.types'
import localforage from 'localforage'

interface ProjectStore {
  projectData: ProjectData | null
  setProjectData: (data: ProjectData) => void
  clearProjectData: () => void
  loadFromStorage: () => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projectData: null,

  setProjectData: async (data: ProjectData) => {
    set({ projectData: data })
    await localforage.setItem('projectData', data)
  },

  clearProjectData: async () => {
    set({ projectData: null })
    await localforage.removeItem('projectData')
  },

  loadFromStorage: async () => {
    const data = await localforage.getItem<ProjectData>('projectData')
    if (data) {
      set({ projectData: data })
    }
  },
}))
