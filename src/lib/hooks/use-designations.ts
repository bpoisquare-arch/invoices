'use client'

import { useState, useEffect, useCallback } from 'react'
import { EMPLOYEE_DESIGNATIONS } from '@/lib/constants/designations'

export const ATTENDANCE_DESIGNATIONS_UPDATED_EVENT = 'attendance:designation-updated'
const STORAGE_KEY = 'attendance_custom_designations'

export function useDesignations() {
  const [designations, setDesignations] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const set = new Set<string>([...EMPLOYEE_DESIGNATIONS, ...parsed])
            return Array.from(set).sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: 'base' })
            )
          }
        }
      } catch {
        // Fallback to constants
      }
    }
    return [...EMPLOYEE_DESIGNATIONS]
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchDesignations = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/attendance/designations')
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.designations)) {
          setDesignations(data.designations)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.designations))
          } catch {
            // Ignore quota errors
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch designations from API, using cached/defaults:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDesignations()

    // Listen to local custom event for instant cross-component updates in same window
    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ added?: string; designations?: string[] }>
      if (customEvent.detail?.designations && Array.isArray(customEvent.detail.designations)) {
        setDesignations(customEvent.detail.designations)
      } else if (customEvent.detail?.added) {
        const added = customEvent.detail.added
        setDesignations((prev) => {
          if (prev.some((d) => d.toLowerCase() === added.toLowerCase())) return prev
          return [...prev, added].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          )
        })
      } else {
        fetchDesignations()
      }
    }

    // Listen to storage event for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (Array.isArray(parsed)) {
            setDesignations(parsed)
          }
        } catch {
          // Ignore
        }
      }
    }

    window.addEventListener(ATTENDANCE_DESIGNATIONS_UPDATED_EVENT, handleLocalUpdate)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(ATTENDANCE_DESIGNATIONS_UPDATED_EVENT, handleLocalUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [fetchDesignations])

  const addDesignation = useCallback(async (newDesig: string): Promise<string> => {
    const trimmed = (newDesig || '').trim()
    if (!trimmed) {
      throw new Error('Designation cannot be empty.')
    }

    // Optimistically update local state immediately
    setDesignations((prev) => {
      if (prev.some((d) => d.toLowerCase() === trimmed.toLowerCase())) return prev
      return [...prev, trimmed].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      )
    })

    const res = await fetch('/api/attendance/designations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ designation: trimmed }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to add designation.')
    }

    const data = await res.json()
    const finalAdded: string = data.added || trimmed
    const updatedList: string[] = data.designations || []

    if (updatedList.length > 0) {
      setDesignations(updatedList)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList))
      } catch {
        // Ignore
      }
    }

    // Broadcast live event across all open pages/components
    window.dispatchEvent(
      new CustomEvent(ATTENDANCE_DESIGNATIONS_UPDATED_EVENT, {
        detail: { added: finalAdded, designations: updatedList },
      })
    )

    return finalAdded
  }, [])

  return {
    designations,
    isLoading,
    addDesignation,
    refetch: fetchDesignations,
  }
}
