'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { getRoleFromCookie, setRoleCookie, UserRole, VIEWER_ALLOWED_ENTITIES, ALL_ENTITIES } from '@/lib/auth/role'

export function useAuthRole() {
  const [role, setRole] = useState<UserRole>('admin')
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Initial role from cookie
    const currentCookieRole = getRoleFromCookie()
    setRole(currentCookieRole)

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        const userEmail = data.user.email || ''
        setEmail(userEmail)

        // Check if user is viewer based on metadata or specific viewer email
        if (
          data.user.user_metadata?.role === 'viewer' ||
          userEmail.toLowerCase() === 'team@mis.isquarebpo.com' ||
          userEmail.toLowerCase().startsWith('viewer@')
        ) {
          setRole('viewer')
          setRoleCookie('viewer')
        } else if (currentCookieRole !== 'viewer') {
          setRole('admin')
          setRoleCookie('admin')
        }
      } else {
        // Fallback for dev-session login
        if (currentCookieRole === 'viewer') {
          setEmail('team@mis.isquarebpo.com')
        } else {
          setEmail('admin@mis.isquarebpo.com')
        }
      }
      setIsLoading(false)
    }).catch(() => {
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
