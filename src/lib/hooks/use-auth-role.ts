'use client'

import { useState, useEffect } from 'react'
import { getRoleFromCookie, setRoleCookie, UserRole, VIEWER_ALLOWED_ENTITIES, ALL_ENTITIES } from '@/lib/auth/role'

export interface AuthUser {
  id?: string
  email?: string
  user_metadata?: Record<string, any>
}

export function useAuthRole() {
  const [role, setRole] = useState<UserRole>('admin')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 1. Initial role from cookie
    const currentCookieRole = getRoleFromCookie()
    setRole(currentCookieRole)

    // 2. Fetch session from internal auth API
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data?.authenticated && data?.user) {
          const userRole = (data.user.role === 'viewer' ? 'viewer' : 'admin') as UserRole
          setRole(userRole)
          setRoleCookie(userRole)
          setEmail(data.user.email || (userRole === 'viewer' ? 'team@mis.isquarebpo.com' : 'admin@mis.isquarebpo.com'))
          setUser({ email: data.user.email, user_metadata: { role: userRole } })
        } else {
          // Fallback based on cookies
          if (currentCookieRole === 'viewer') {
            setEmail('team@mis.isquarebpo.com')
            setUser({ email: 'team@mis.isquarebpo.com', user_metadata: { role: 'viewer' } })
          } else {
            setEmail('admin@mis.isquarebpo.com')
            setUser({ email: 'admin@mis.isquarebpo.com', user_metadata: { role: 'admin' } })
          }
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (currentCookieRole === 'viewer') {
          setEmail('team@mis.isquarebpo.com')
          setUser({ email: 'team@mis.isquarebpo.com', user_metadata: { role: 'viewer' } })
        } else {
          setEmail('admin@mis.isquarebpo.com')
          setUser({ email: 'admin@mis.isquarebpo.com', user_metadata: { role: 'admin' } })
        }
        setIsLoading(false)
      })
  }, [])

  const isViewer = role === 'viewer'
  const isAdmin = role === 'admin'
  const allowedEntities = isViewer ? VIEWER_ALLOWED_ENTITIES : ALL_ENTITIES

  return {
    role,
    isViewer,
    isAdmin,
    user,
    email: email || (isViewer ? 'team@mis.isquarebpo.com' : 'admin@mis.isquarebpo.com'),
    isLoading,
    allowedEntities,
    canCreate: !isViewer,
    canEdit: !isViewer,
    canDelete: !isViewer,
  }
}
