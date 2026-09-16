import Skeleton from '../Skeleton/Skeleton'
import './Charts.css'

export function SummaryCardSkeleton() {
  return (
    <div className="summary-card">
      <Skeleton className="summary-card__skeleton-label" />
      <Skeleton className="summary-card__skeleton-total" />
      <Skeleton className="summary-card__skeleton-count" />
    </div>
  )
}

export function ChartPanelSkeleton() {
  return <Skeleton className="chart-skeleton" />
}
