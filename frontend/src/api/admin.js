import request from './client'

export function listUsers({ q, limit = 50, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit, offset })
  if (q) query.set('q', q)
  return request(`/admin/users?${query.toString()}`)
}

export function getUserStats(userId) {
  return request(`/admin/users/${userId}`)
}

export function updateUser(userId, patch) {
  return request(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
