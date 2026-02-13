import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UserState {
  tier: 'free' | 'pro' | 'enterprise'
  email: string | null
  name: string | null
  userId: string | null
  storageUsedBytes: number
  subscriptionPaused: boolean
  subscriptionCanceled: boolean
  
  setUser: (user: Partial<UserState>) => void
  setTier: (tier: 'free' | 'pro' | 'enterprise') => void
  setStorageUsed: (bytes: number) => void
  reset: () => void
}

const initialUserState = {
  tier: 'free' as const,
  email: null,
  name: null,
  userId: null,
  storageUsedBytes: 0,
  subscriptionPaused: false,
  subscriptionCanceled: false,
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      ...initialUserState,
      
      setUser: (user) => set((state) => ({ ...state, ...user })),
      setTier: (tier) => set({ tier }),
      setStorageUsed: (storageUsedBytes) => set({ storageUsedBytes }),
      reset: () => set(initialUserState),
    }),
    {
      name: 'treefrog-user',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tier: state.tier,
        email: state.email,
        name: state.name,
        userId: state.userId,
      }),
    }
  )
)

interface UsageState {
  monthlyUsed: number
  monthlyLimit: number
  concurrentUsed: number
  concurrentLimit: number
  storageUsedGB: number
  storageLimitGB: number
  monthlyResetAt: string | null
  
  setUsage: (usage: Partial<UsageState>) => void
  incrementMonthlyUsed: () => void
  reset: () => void
}

const initialUsageState = {
  monthlyUsed: 0,
  monthlyLimit: 50,
  concurrentUsed: 0,
  concurrentLimit: 2,
  storageUsedGB: 0,
  storageLimitGB: 1,
  monthlyResetAt: null,
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set) => ({
      ...initialUsageState,
      
      setUsage: (usage) => set((state) => ({ ...state, ...usage })),
      incrementMonthlyUsed: () => set((state) => ({ 
        monthlyUsed: state.monthlyUsed + 1 
      })),
      reset: () => set(initialUsageState),
    }),
    {
      name: 'treefrog-usage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        monthlyUsed: state.monthlyUsed,
      }),
    }
  )
)

interface UiState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  defaultEngine: 'pdflatex' | 'xelatex' | 'lualatex'
  
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setDefaultEngine: (engine: 'pdflatex' | 'xelatex' | 'lualatex') => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      defaultEngine: 'pdflatex',
      
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      setTheme: (theme) => set({ theme }),
      setDefaultEngine: (defaultEngine) => set({ defaultEngine }),
    }),
    {
      name: 'treefrog-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

interface BuildState {
  recentBuilds: Array<{
    id: string
    status: string
    engine: string
    mainFile: string
    createdAt: string
  }>
  activeBuilds: number
  
  setRecentBuilds: (builds: BuildState['recentBuilds']) => void
  addBuild: (build: BuildState['recentBuilds'][0]) => void
  updateBuildStatus: (id: string, status: string) => void
  setActiveBuilds: (count: number) => void
  reset: () => void
}

export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      recentBuilds: [],
      activeBuilds: 0,
      
      setRecentBuilds: (recentBuilds) => set({ recentBuilds }),
      addBuild: (build) => set((state) => ({ 
        recentBuilds: [build, ...state.recentBuilds].slice(0, 20) 
      })),
      updateBuildStatus: (id, status) => set((state) => ({
        recentBuilds: state.recentBuilds.map((b) => 
          b.id === id ? { ...b, status } : b
        ),
      })),
      setActiveBuilds: (activeBuilds) => set({ activeBuilds }),
      reset: () => set({ recentBuilds: [], activeBuilds: 0 }),
    }),
    {
      name: 'treefrog-builds',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentBuilds: state.recentBuilds.slice(0, 10),
      }),
    }
  )
)
