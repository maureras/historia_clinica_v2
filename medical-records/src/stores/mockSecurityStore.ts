// src/stores/mockSecurityStore.ts
import { create } from 'zustand'
import { MockSecurityService, SecurityMetrics, AccessLog, ModificationLog } from '@/services/mockSecurityService'
import type { SecurityReportFilters, PrintLog } from '@/types/security'

interface SecurityState {
  // Métricas
  metrics: SecurityMetrics | null
  metricsLoading: boolean
  metricsError: string | null
  
  // Access logs
  accessLogs: AccessLog[]
  accessFilters: SecurityReportFilters
  accessPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  accessLoading: boolean
  accessError: string | null
  
  // Modification logs
  modificationLogs: ModificationLog[]
  modificationFilters: SecurityReportFilters
  modificationPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  modificationLoading: boolean
  modificationError: string | null

  // Print logs
  printLogs: PrintLog[]
  printFilters: SecurityReportFilters
  printPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  printLoading: boolean
  printError: string | null
  
  // Acciones
  loadMetrics: () => Promise<void>
  loadAccessLogs: () => Promise<void>
  setAccessFilters: (filters: SecurityReportFilters) => void
  clearAccessFilters: () => void
  loadModificationLogs: () => Promise<void>
  setModificationFilters: (filters: SecurityReportFilters) => void
  clearModificationFilters: () => void
  loadPrintLogs: () => Promise<void>
  setPrintFilters: (filters: SecurityReportFilters) => void
  clearPrintFilters: () => void
  exportReport: (options: any) => Promise<void>
  regenerateData: () => void
}

const mockService = MockSecurityService.getInstance()

const defaultPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
}

const defaultFilters: SecurityReportFilters = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  // Estado inicial
  metrics: null,
  metricsLoading: false,
  metricsError: null,
  
  accessLogs: [],
  accessFilters: { ...defaultFilters },
  accessPagination: { ...defaultPagination },
  accessLoading: false,
  accessError: null,
  
  modificationLogs: [],
  modificationFilters: { ...defaultFilters },
  modificationPagination: { ...defaultPagination },
  modificationLoading: false,
  modificationError: null,

  printLogs: [],
  printFilters: { ...defaultFilters },
  printPagination: { ...defaultPagination },
  printLoading: false,
  printError: null,

  // Cargar métricas
  loadMetrics: async () => {
    set({ metricsLoading: true, metricsError: null })
    
    try {
      const metrics = await mockService.getSecurityMetrics()
      set({ metrics, metricsLoading: false })
    } catch (error: any) {
      set({ 
        metricsError: error.message, 
        metricsLoading: false 
      })
    }
  },

  // Cargar logs de acceso
  loadAccessLogs: async () => {
    set({ accessLoading: true, accessError: null })
    
    try {
      const { accessFilters } = get()
      const result = await mockService.getAccessLogs(
        accessFilters, 
        accessFilters.page || 1, 
        accessFilters.limit || 20
      )
      
      set({ 
        accessLogs: result.data,
        accessPagination: result.pagination,
        accessLoading: false 
      })
    } catch (error: any) {
      set({ 
        accessError: error.message, 
        accessLoading: false 
      })
    }
  },

  // Establecer filtros de acceso
  setAccessFilters: (filters: SecurityReportFilters) => {
    set({ 
      accessFilters: { ...get().accessFilters, ...filters }
    })
    // Recargar datos con nuevos filtros
    get().loadAccessLogs()
  },

  // Limpiar filtros de acceso
  clearAccessFilters: () => {
    set({ 
      accessFilters: { ...defaultFilters }
    })
    get().loadAccessLogs()
  },

  // Cargar logs de modificación
  loadModificationLogs: async () => {
    set({ modificationLoading: true, modificationError: null })
    
    try {
      const { modificationFilters } = get()
      const result = await mockService.getModificationLogs(
        modificationFilters,
        modificationFilters.page || 1,
        modificationFilters.limit || 20
      )
      
      set({ 
        modificationLogs: result.data,
        modificationPagination: result.pagination,
        modificationLoading: false 
      })
    } catch (error: any) {
      set({ 
        modificationError: error.message, 
        modificationLoading: false 
      })
    }
  },

  // Establecer filtros de modificación
  setModificationFilters: (filters: SecurityReportFilters) => {
    set({ 
      modificationFilters: { ...get().modificationFilters, ...filters }
    })
    get().loadModificationLogs()
  },

  // Limpiar filtros de modificación
  clearModificationFilters: () => {
    set({ 
      modificationFilters: { ...defaultFilters }
    })
    get().loadModificationLogs()
  },

  // Cargar logs de impresiones
  loadPrintLogs: async () => {
    set({ printLoading: true, printError: null })
    try {
      const { printFilters, printLogs } = get()
      const page = printFilters.page ?? 1
      const limit = printFilters.limit ?? 20
      const total = (printLogs || []).length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      set({
        printPagination: { page: Math.min(page, totalPages), limit, total, totalPages },
        printLoading: false
      })
    } catch (error: any) {
      set({
        printError: error?.message || 'Error al cargar impresiones',
        printLoading: false
      })
    }
  },
  // Establecer filtros de impresiones
  setPrintFilters: (filters: SecurityReportFilters) => {
    set({ printFilters: { ...get().printFilters, ...filters } })
    get().loadPrintLogs()
  },
  // Limpiar filtros de impresiones
  clearPrintFilters: () => {
    set({ printFilters: { ...defaultFilters } })
    get().loadPrintLogs()
  },

  // Exportar reporte
  exportReport: async (options: {
    reportType: 'access' | 'modification'
    format: 'excel' | 'pdf' | 'csv'
    filters?: any
    includeMetadata?: boolean
    watermark?: boolean
  }) => {
    try {
      const result = await mockService.exportReport(options)
      
      if (result.success) {

        
        // En una aplicación real, aquí iniciarías la descarga
        const link = document.createElement('a')
        link.href = `data:text/plain;charset=utf-8,${encodeURIComponent('Mock report content')}`
        link.download = result.downloadUrl || 'report.txt'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error: any) {
      console.error('Error exporting report:', error)
    }
  },

  // Regenerar datos (útil para testing)
  regenerateData: () => {
    mockService.regenerateData()
    // Recargar todos los datos
    get().loadMetrics()
    get().loadAccessLogs()
    get().loadModificationLogs()
    get().loadPrintLogs()
  }
}))

// Hooks para componentes
export const useSecurityActions = () => {
  const store = useSecurityStore()
  return {
    loadMetrics: store.loadMetrics,
    loadAccessLogs: store.loadAccessLogs,
    setAccessFilters: store.setAccessFilters,
    clearAccessFilters: store.clearAccessFilters,
    loadModificationLogs: store.loadModificationLogs,
    setModificationFilters: store.setModificationFilters,
    clearModificationFilters: store.clearModificationFilters,
    loadPrintLogs: store.loadPrintLogs,
    setPrintFilters: store.setPrintFilters,
    clearPrintFilters: store.clearPrintFilters,
    exportReport: store.exportReport,
    regenerateData: store.regenerateData
  }
}

export const useSecurityMetrics = (refreshInterval?: number) => {
  const metrics = useSecurityStore(state => state.metrics)
  const loading = useSecurityStore(state => state.metricsLoading)
  const error = useSecurityStore(state => state.metricsError)
  const refresh = useSecurityStore(state => state.loadMetrics)

  // Auto-refresh si se especifica intervalo
  React.useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, refresh])

  return { metrics, loading, error, refresh }
}

export const useAccessLogs = () => {
  const data = useSecurityStore(state => state.accessLogs)
  const filters = useSecurityStore(state => state.accessFilters)
  const pagination = useSecurityStore(state => state.accessPagination)
  const loading = useSecurityStore(state => state.accessLoading)
  const error = useSecurityStore(state => state.accessError)

  return { data, filters, pagination, loading, error }
}

export const useModificationLogs = () => {
  const data = useSecurityStore(state => state.modificationLogs)
  const filters = useSecurityStore(state => state.modificationFilters)
  const pagination = useSecurityStore(state => state.modificationPagination)
  const loading = useSecurityStore(state => state.modificationLoading)
  const error = useSecurityStore(state => state.modificationError)

  return { data, filters, pagination, loading, error }
}

export const usePrintLogs = () => {
  const data = useSecurityStore(state => state.printLogs)
  const filters = useSecurityStore(state => state.printFilters)
  const pagination = useSecurityStore(state => state.printPagination)
  const loading = useSecurityStore(state => state.printLoading)
  const error = useSecurityStore(state => state.printError)
  return { data, filters, pagination, loading, error }
}

export const useSecurityLoading = () => {
  return useSecurityStore(state =>
    state.metricsLoading ||
    state.accessLoading ||
    state.modificationLoading ||
    state.printLoading
  )
}

export const useSecurityError = () => {
  return useSecurityStore(state =>
    state.metricsError ||
    state.accessError ||
    state.modificationError ||
    state.printError
  )
}

// Hook para inicializar datos al montar componentes
export const useInitializeSecurity = () => {
  const { loadMetrics, loadAccessLogs, loadModificationLogs, loadPrintLogs } = useSecurityActions()
  
  React.useEffect(() => {
    // Cargar datos iniciales
    loadMetrics()
    loadAccessLogs()
    loadModificationLogs()
    loadPrintLogs()
  }, [loadMetrics, loadAccessLogs, loadModificationLogs, loadPrintLogs])
}

// Necesitamos importar React para los useEffect
import React from 'react'