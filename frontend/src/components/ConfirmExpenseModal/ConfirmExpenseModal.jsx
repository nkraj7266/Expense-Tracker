import { useState } from 'react'
import { createExpense } from '../../api/expenses'
import useCategories from '../../hooks/useCategories'
import { useNotify } from '../../context/NotificationContext'
import Modal from '../Modal/Modal'
import './ConfirmExpenseModal.css'

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other']

export default function ConfirmExpenseModal({ draft, onClose, onSaved }) {
  const categories = useCategories()
  const notify = useNotify()
  const [form, setForm] = useState({
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    subcategory: draft.subcategory || '',
    merchant: draft.merchant || '',
    payment_method: draft.payment_method || '',
    date: draft.date,
    tags: (draft.tags || []).join(', '),
    notes: draft.notes || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await createExpense({
        raw_input: draft.raw_input,
        amount: parseFloat(form.amount),
        currency: form.currency || 'INR',
        category: form.category,
        subcategory: form.subcategory || null,
        merchant: form.merchant || null,
        payment_method: form.payment_method || null,
        date: form.date,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes: form.notes || null,
        source: draft.source,
        llm_model: draft.llm_model,
        llm_confidence: draft.llm_confidence,
      })
      notify.success('Expense added')
      onSaved()
    } catch (err) {
      setError(err.message)
      notify.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const categoryOptions = categories.length ? categories.map((c) => c.name) : [form.category]

  return (
    <Modal isOpen onClose={onClose} title="Confirm expense" className="confirm-expense-modal">
      <p className="confirm-modal__raw">&ldquo;{draft.raw_input}&rdquo;</p>
      <form onSubmit={handleSubmit} className="confirm-modal__form">
        <label>
          Amount
          <input type="number" step="0.01" min="0.01" value={form.amount} onChange={handleChange('amount')} required />
        </label>
        <label>
          Currency
          <input type="text" value={form.currency} onChange={handleChange('currency')} maxLength={3} />
        </label>
        <label>
          Category
          <select value={form.category} onChange={handleChange('category')} required>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subcategory
          <input type="text" value={form.subcategory} onChange={handleChange('subcategory')} />
        </label>
        <label>
          Merchant
          <input type="text" value={form.merchant} onChange={handleChange('merchant')} />
        </label>
        <label>
          Payment method
          <select value={form.payment_method} onChange={handleChange('payment_method')}>
            <option value="">—</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={handleChange('date')} required />
        </label>
        <label>
          Tags (comma-separated)
          <input type="text" value={form.tags} onChange={handleChange('tags')} />
        </label>
        <label className="confirm-modal__notes">
          Notes
          <textarea value={form.notes} onChange={handleChange('notes')} rows={2} />
        </label>
        {error && <p className="confirm-modal__error">{error}</p>}
        <div className="confirm-modal__actions">
          <button type="button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
