import request from './client'

export function getSummary({ period = 'monthly', date } = {}) {
  const query = new URLSearchParams({ period })
  if (date) query.set('date', date)
  return request(`/analytics/summary?${query.toString()}`)
}

export function getTrend({ from, to, groupBy = 'day' }) {
  const query = new URLSearchParams({ from, to, group_by: groupBy })
  return request(`/analytics/trend?${query.toString()}`)
}
