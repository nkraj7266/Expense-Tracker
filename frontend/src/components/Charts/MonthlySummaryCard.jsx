import './Charts.css'

export default function MonthlySummaryCard({ label, total, count, currency = 'INR' }) {
  return (
    <div className="summary-card">
      <span className="summary-card__label">{label}</span>
      <span className="summary-card__total">
        {currency} {total.toFixed(2)}
      </span>
      <span className="summary-card__count">
        {count} expense{count === 1 ? '' : 's'}
      </span>
    </div>
  )
}
