import crypto from 'crypto'

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash || !storedHash.includes(':')) {
    return false
  }
  const [salt, originalHash] = storedHash.split(':')
  if (!salt || !originalHash) {
    return false
  }

  try {
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
    const hashBuffer = Buffer.from(hash, 'hex')
    const originalHashBuffer = Buffer.from(originalHash, 'hex')

    if (hashBuffer.length !== originalHashBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(hashBuffer, originalHashBuffer)
  } catch {
    return false
  }
}
