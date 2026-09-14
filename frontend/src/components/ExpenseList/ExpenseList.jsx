import ExpenseCard from '../ExpenseCard/ExpenseCard'
import './ExpenseList.css'

function groupByDay(expenses) {
  const groups = new Map()
  for (const expense of expenses) {
    const key = expense.date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(expense)
  }
  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
}

function formatDay(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExpenseList({ expenses, categories, onChanged, emptyMessage = 'No expenses yet.' }) {
  if (!expenses.length) {
    return <p className="expense-list__empty">{emptyMessage}</p>
  }

  const groups = groupByDay(expenses)

  return (
    <div className="expense-list">
      {groups.map(([day, items]) => {
        const dayTotal = items.reduce((sum, e) => sum + e.amount, 0)
        return (
          <section key={day} className="expense-list__group">
            <div className="expense-list__group-header">
              <h3>{formatDay(day)}</h3>
              <span>
                {items[0].currency} {dayTotal.toFixed(2)}
              </span>
            </div>
            <div className="expense-list__items">
              {items.map((expense) => (
                <ExpenseCard key={expense.id} expense={expense} categories={categories} onChanged={onChanged} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
