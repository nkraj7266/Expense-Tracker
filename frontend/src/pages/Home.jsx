import { useMemo } from 'react'
import ExpenseList from '../components/ExpenseList/ExpenseList'
import ExpenseListSkeleton from '../components/ExpenseList/ExpenseListSkeleton'
import AnimatedNumber from '../components/AnimatedNumber/AnimatedNumber'
import useExpenses from '../hooks/useExpenses'
import useCategories from '../hooks/useCategories'
import { useExpensesRefresh } from '../context/ExpensesRefreshContext'
import './Home.css'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Home() {
  const { refreshKey } = useExpensesRefresh()
  const categories = useCategories()
  const today = todayISO()
  const filters = useMemo(() => ({ from: today, to: today, limit: 200 }), [today])
  const { expenses, loading, error, refetch } = useExpenses(filters, refreshKey)

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="home-page">
      <div className="home-page__header">
        <h1>Today</h1>
        <span className="home-page__total">
          {expenses[0]?.currency || 'INR'} <AnimatedNumber value={total} />
        </span>
      </div>
      {loading && <ExpenseListSkeleton />}
      {error && <p className="home-page__error">{error}</p>}
      {!loading && !error && (
        <ExpenseList
          expenses={expenses}
          categories={categories}
          onChanged={refetch}
          emptyMessage="No expenses logged today yet — try the box above."
        />
      )}
    </div>
  )
}
