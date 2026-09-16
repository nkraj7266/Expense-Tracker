import Skeleton from '../Skeleton/Skeleton'
import ExpenseCardSkeleton from '../ExpenseCard/ExpenseCardSkeleton'
import './ExpenseList.css'

export default function ExpenseListSkeleton({ rows = 4 }) {
  return (
    <div className="expense-list">
      <div className="expense-list__group-header">
        <Skeleton className="expense-list__skeleton-heading" />
        <Skeleton className="expense-list__skeleton-total" />
      </div>
      <div className="expense-list__items">
        {Array.from({ length: rows }).map((_, index) => (
          <ExpenseCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
