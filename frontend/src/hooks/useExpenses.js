import { useCallback, useEffect, useState } from 'react'
import { listExpenses } from '../api/expenses'

export default function useExpenses(filters = {}, refreshKey = 0) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filterKey = JSON.stringify(filters)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listExpenses(filters)
      setExpenses(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
    // filters is captured via filterKey below; re-created intentionally per key change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  useEffect(() => {
    refetch()
  }, [refetch, refreshKey])

  return { expenses, loading, error, refetch }
}
