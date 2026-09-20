import request from './client'

export function parseExpense(text, source = 'text') {
  return request('/expenses/parse', {
    method: 'POST',
    body: JSON.stringify({ text, source }),
  })
}

export function parseExpenseImage(file, note) {
  const formData = new FormData()
  formData.append('image', file)
  if (note) formData.append('text', note)
  return request('/expenses/parse-image', {
    method: 'POST',
    body: formData,
  })
}

export function createExpense(expense) {
  return request('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  })
}

export function batchCreateExpenses(expenses) {
  return request('/expenses/batch', {
    method: 'POST',
    body: JSON.stringify({ expenses }),
  })
}

export function listExpenses(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  const qs = query.toString()
  return request(`/expenses${qs ? `?${qs}` : ''}`)
}

export function getExpense(id) {
  return request(`/expenses/${id}`)
}

export function updateExpense(id, updates) {
  return request(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: 'DELETE' })
}

export function listCategories() {
  return request('/categories')
}
