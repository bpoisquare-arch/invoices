export type UserRole = 'admin' | 'viewer'

export const VIEWER_ALLOWED_ENTITIES = ['aimt', 'stc']
export const ALL_ENTITIES = ['edlink-pk', 'edlink-au', 'aimt', 'nsc', 'isquare-bpo', 'stc']

export function getRoleFromCookie(): UserRole {
  if (typeof document === 'undefined') return 'admin'
  const match = document.cookie.match(/(?:^|; )user-role=([^;]*)/)
  if (match && match[1] === 'viewer') return 'viewer'
  const devSession = document.cookie.match(/(?:^|; )dev-auth-session=([^;]*)/)
  if (devSession && devSession[1] === 'viewer') return 'viewer'
  return 'admin'
}

export function setRoleCookie(role: UserRole) {
  if (typeof document !== 'undefined') {
    document.cookie = `user-role=${role}; path=/; max-age=86400; SameSite=Lax`
  }
}

export function clearRoleCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'user-role=; path=/; max-age=0'
  }
}

export function isAllowedEntity(entityId: string, role: UserRole): boolean {
  if (role === 'viewer') {
    return VIEWER_ALLOWED_ENTITIES.includes(entityId)
  }
  return true
}
