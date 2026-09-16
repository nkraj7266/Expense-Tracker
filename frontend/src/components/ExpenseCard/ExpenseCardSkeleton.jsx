import Skeleton from '../Skeleton/Skeleton'
import './ExpenseCard.css'

export default function ExpenseCardSkeleton() {
  return (
    <div className="expense-card expense-card--skeleton">
      <div className="expense-card__main">
        <Skeleton className="expense-card__icon-skeleton" />
        <div className="expense-card__details">
          <Skeleton className="expense-card__skeleton-line expense-card__skeleton-line--title" />
          <Skeleton className="expense-card__skeleton-line expense-card__skeleton-line--meta" />
        </div>
      </div>
      <div className="expense-card__side">
        <Skeleton className="expense-card__skeleton-line expense-card__skeleton-line--amount" />
      </div>
    </div>
  )
}
