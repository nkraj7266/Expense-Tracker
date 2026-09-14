import { useState } from 'react'
import { deleteExpense, updateExpense } from '../../api/expenses'
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog'
import CategoryIcon from '../CategoryIcon/CategoryIcon'
import './ExpenseCard.css'

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other']

export default function ExpenseCard({ expense, categories, onChanged }) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState({
    amount: expense.amount,
    category: expense.category,
    merchant: expense.merchant || '',
    payment_method: expense.payment_method || '',
    date: expense.date,
    notes: expense.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSave = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateExpense(expense.id, {
        amount: parseFloat(form.amount),
        category: form.category,
        merchant: form.merchant || null,
        payment_method: form.payment_method || null,
        date: form.date,
        notes: form.notes || null,
      })
      setIsEditing(false)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteExpense(expense.id)
      setShowDeleteConfirm(false)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const categoryOptions = categories?.length ? categories.map((c) => c.name) : [form.category]
  const categoryMeta = categories?.find((c) => c.name === expense.category)

  if (isEditing) {
    return (
      <form className="expense-card expense-card--editing" onSubmit={handleSave}>
        <input type="number" step="0.01" value={form.amount} onChange={handleChange('amount')} />
        <select value={form.category} onChange={handleChange('category')}>
          {categoryOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input type="text" placeholder="Merchant" value={form.merchant} onChange={handleChange('merchant')} />
        <select value={form.payment_method} onChange={handleChange('payment_method')}>
          <option value="">—</option>
          {PAYMENT_METHODS.map((pm) => (
            <option key={pm} value={pm}>
              {pm}
            </option>
          ))}
        </select>
        <input type="date" value={form.date} onChange={handleChange('date')} />
        <input type="text" placeholder="Notes" value={form.notes} onChange={handleChange('notes')} />
        {error && <p className="expense-card__error">{error}</p>}
        <div className="expense-card__actions">
          <button type="button" onClick={() => setIsEditing(false)} disabled={busy}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="expense-card">
      <div className="expense-card__main">
        <CategoryIcon icon={categoryMeta?.icon} color={categoryMeta?.color} />
        <div className="expense-card__details">
          <div className="expense-card__title">
            {expense.merchant || expense.category}
            {expense.subcategory && <span className="expense-card__subcategory"> · {expense.subcategory}</span>}
          </div>
          <div className="expense-card__meta">
            {expense.category}
            {expense.payment_method ? ` · ${expense.payment_method}` : ''}
            {expense.tags?.length ? ` · ${expense.tags.join(', ')}` : ''}
          </div>
          {expense.notes && <div className="expense-card__notes">{expense.notes}</div>}
        </div>
      </div>
      <div className="expense-card__side">
        <div className="expense-card__amount">
          {expense.currency} {expense.amount.toFixed(2)}
        </div>
        <div className="expense-card__actions">
          <button type="button" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
      {error && <p className="expense-card__error">{error}</p>}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete expense?"
        message={`This will permanently remove "${expense.merchant || expense.category}" — ${expense.currency} ${expense.amount.toFixed(2)}.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
