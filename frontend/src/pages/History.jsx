import { useMemo, useState } from 'react'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import ExpenseList from '../components/ExpenseList/ExpenseList'
import ExpenseListSkeleton from '../components/ExpenseList/ExpenseListSkeleton'
import useExpenses from '../hooks/useExpenses'
import useCategories from '../hooks/useCategories'
import { useExpensesRefresh } from '../context/ExpensesRefreshContext'
import './History.css'

const EMPTY_FILTERS = { from: '', to: '', category: '', q: '', min_amount: '', max_amount: '' }

export default function History() {
  const { refreshKey } = useExpensesRefresh()
  const categories = useCategories()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  const appliedFilters = useMemo(() => ({ ...filters, limit: 300 }), [filters])
  const { expenses, loading, error, refetch } = useExpenses(appliedFilters, refreshKey)

  const handleChange = (field) => (event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }))
  const handleClear = () => setFilters(EMPTY_FILTERS)

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="history-page">
      <div className="history-page__header">
        <h1>History</h1>
        <button
          type="button"
          className="history-page__filters-toggle"
          onClick={() => setIsFiltersOpen(true)}
        >
          <FilterListIcon fontSize="small" />
          Filters
          {activeFilterCount > 0 && <span className="history-page__filters-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {isFiltersOpen && (
        <div className="history-page__filters-backdrop" onClick={() => setIsFiltersOpen(false)} />
      )}

      <div className={`history-page__filters${isFiltersOpen ? ' history-page__filters--open' : ''}`}>
        <div className="history-page__filters-panel-header">
          <h2>Filters</h2>
          <button
            type="button"
            className="history-page__filters-close"
            onClick={() => setIsFiltersOpen(false)}
            aria-label="Close filters"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>
        <label>
          From
          <input type="date" value={filters.from} onChange={handleChange('from')} />
        </label>
        <label>
          To
          <input type="date" value={filters.to} onChange={handleChange('to')} />
        </label>
        <label>
          Category
          <select value={filters.category} onChange={handleChange('category')}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input type="text" placeholder="Merchant or notes" value={filters.q} onChange={handleChange('q')} />
        </label>
        <label>
          Min amount
          <input type="number" value={filters.min_amount} onChange={handleChange('min_amount')} />
        </label>
        <label>
          Max amount
          <input type="number" value={filters.max_amount} onChange={handleChange('max_amount')} />
        </label>
        <button type="button" onClick={handleClear} className="history-page__clear">
          Clear filters
        </button>
      </div>

      <div className="history-page__summary">
        {expenses.length} expense{expenses.length === 1 ? '' : 's'} · {expenses[0]?.currency || 'INR'} {total.toFixed(2)}
      </div>
      {loading && <ExpenseListSkeleton rows={5} />}
      {error && <p className="history-page__error">{error}</p>}
      {!loading && !error && <ExpenseList expenses={expenses} categories={categories} onChanged={refetch} />}
    </div>
  )
}
