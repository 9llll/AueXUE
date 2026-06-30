const REMEMBER_KEY = 'admin-login-remember'
const REMEMBER_USERNAME_KEY = 'admin-login-username'
const REMEMBER_PASSWORD_KEY = 'admin-login-password'
const CRYPTO_VERSION = 'v1'
const CRYPTO_PEPPER = 'aiovtue-blog-admin-remember-v1'
const PBKDF2_ITERATIONS = 100_000

function hasWebCrypto() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeLegacyBase64(value: string) {
  if (!value)
    return ''
  try {
    return decodeURIComponent(escape(atob(value)))
  }
  catch {
    return ''
  }
}

async function deriveRememberKey(username: string) {
  const encoder = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${CRYPTO_PEPPER}:${username}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(CRYPTO_VERSION),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptRememberedPassword(username: string, password: string) {
  if (!password)
    return ''

  const key = await deriveRememberKey(username)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(password),
  )

  return `${CRYPTO_VERSION}:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`
}

async function decryptRememberedPassword(username: string, payload: string) {
  if (!payload)
    return ''

  if (!payload.startsWith(`${CRYPTO_VERSION}:`))
    return decodeLegacyBase64(payload)

  const [, ivPart, cipherPart] = payload.split(':')
  if (!ivPart || !cipherPart)
    return ''

  try {
    const key = await deriveRememberKey(username)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(ivPart) },
      key,
      base64ToBytes(cipherPart),
    )
    return new TextDecoder().decode(plain)
  }
  catch {
    return ''
  }
}

export async function loadRememberedLogin() {
  if (typeof localStorage === 'undefined')
    return { remember: false, username: '', password: '' }

  const remember = localStorage.getItem(REMEMBER_KEY) === '1'
  if (!remember)
    return { remember: false, username: '', password: '' }

  const username = localStorage.getItem(REMEMBER_USERNAME_KEY) || ''
  const storedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY) || ''
  let password = ''

  if (username && storedPassword && hasWebCrypto())
    password = await decryptRememberedPassword(username, storedPassword)
  else if (storedPassword)
    password = decodeLegacyBase64(storedPassword)

  return { remember: true, username, password }
}

export async function persistRememberedLogin(username: string, password: string, remember: boolean) {
  if (typeof localStorage === 'undefined')
    return

  if (remember) {
    localStorage.setItem(REMEMBER_KEY, '1')
    localStorage.setItem(REMEMBER_USERNAME_KEY, username)

    if (!password) {
      localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      return
    }

    if (!hasWebCrypto()) {
      localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      return
    }

    const encrypted = await encryptRememberedPassword(username, password)
    localStorage.setItem(REMEMBER_PASSWORD_KEY, encrypted)
  }
  else {
    clearRememberedLogin()
  }
}

export function clearRememberedLogin() {
  if (typeof localStorage === 'undefined')
    return

  localStorage.removeItem(REMEMBER_KEY)
  localStorage.removeItem(REMEMBER_USERNAME_KEY)
  localStorage.removeItem(REMEMBER_PASSWORD_KEY)
}
