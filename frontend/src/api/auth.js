import request from './client'

export function signup({ email, password, displayName }) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName || undefined }),
  })
}

export function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}

export function me() {
  return request('/auth/me')
}
