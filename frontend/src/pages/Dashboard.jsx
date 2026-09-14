import { useEffect, useState } from 'react'
import MonthlySummaryCard from '../components/Charts/MonthlySummaryCard'
import CategoryBreakdown from '../components/Charts/CategoryBreakdown'
import SpendTrend from '../components/Charts/SpendTrend'
import { getSummary, getTrend } from '../api/analytics'
import { useExpensesRefresh } from '../context/ExpensesRefreshContext'
import './Dashboard.css'

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

const PERIODS = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
]

export default function Dashboard() {
  const { refreshKey } = useExpensesRefresh()
  const [period, setPeriod] = useState('monthly')
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getSummary({ period }),
      getTrend({ from: isoDaysAgo(29), to: new Date().toISOString().slice(0, 10), groupBy: 'day' }),
    ])
      .then(([summaryData, trendData]) => {
        if (cancelled) return
        setSummary(summaryData)
        setTrend(trendData.series)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period, refreshKey])

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1>Dashboard</h1>
        <div className="dashboard-page__period-toggle">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={period === p.key ? 'active' : ''}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="dashboard-page__error">{error}</p>}

      {!loading && !error && summary && (
        <>
          <MonthlySummaryCard
            label={PERIODS.find((p) => p.key === period).label}
            total={summary.total}
            count={summary.count}
          />

          <div className="dashboard-page__grid">
            <div className="dashboard-page__panel">
              <h2>By category</h2>
              <CategoryBreakdown data={summary.category_breakdown} />
            </div>
            <div className="dashboard-page__panel">
              <h2>Last 30 days</h2>
              <SpendTrend data={trend} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
