const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

function formatErrorDetail(detail, fallback) {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        const field = Array.isArray(item?.loc) ? item.loc.at(-1) : null
        return field ? `${field}: ${item.msg}` : item.msg
      })
      .filter(Boolean)
      .join('; ') || fallback
  }
  if (typeof detail === 'object') return detail.msg || JSON.stringify(detail)
  return fallback
}

function doFetch(path, options) {
  const isFormData = options.body instanceof FormData
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: isFormData
      ? { ...(options.headers || {}) }
      : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
}

async function throwForError(res) {
  let detail = res.statusText
  try {
    const body = await res.json()
    detail = formatErrorDetail(body.detail, res.statusText)
  } catch {
    // response had no JSON body
  }
  throw new Error(detail)
}

export default async function request(path, options = {}) {
  let res = await doFetch(path, options)

  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshRes = await doFetch('/auth/refresh', { method: 'POST' })
    if (refreshRes.ok) {
      res = await doFetch(path, options)
    } else {
      unauthorizedHandler?.()
      await throwForError(res)
    }
  }

  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.()
    await throwForError(res)
  }

  if (res.status === 204) return null
  return res.json()
}
