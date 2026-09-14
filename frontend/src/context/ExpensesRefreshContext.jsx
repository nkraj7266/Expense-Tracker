import { createContext, useContext, useMemo, useState } from 'react'

const ExpensesRefreshContext = createContext(null)

export function ExpensesRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const value = useMemo(
    () => ({ refreshKey, bumpRefresh: () => setRefreshKey((key) => key + 1) }),
    [refreshKey],
  )

  return <ExpensesRefreshContext.Provider value={value}>{children}</ExpensesRefreshContext.Provider>
}

export function useExpensesRefresh() {
  const ctx = useContext(ExpensesRefreshContext)
  if (!ctx) throw new Error('useExpensesRefresh must be used within an ExpensesRefreshProvider')
  return ctx
}
