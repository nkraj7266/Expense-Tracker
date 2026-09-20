import { useState } from 'react'
import { batchCreateExpenses } from '../../api/expenses'
import useCategories from '../../hooks/useCategories'
import { useNotify } from '../../context/NotificationContext'
import Modal from '../Modal/Modal'
import './BatchConfirmModal.css'

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other']

function draftToRow(draft, id) {
  return {
    id,
    raw_input: draft.raw_input,
    amount: draft.amount,
    currency: draft.currency,
    category: draft.category,
    subcategory: draft.subcategory || '',
    merchant: draft.merchant || '',
    payment_method: draft.payment_method || '',
    date: draft.date,
    tags: (draft.tags || []).join(', '),
    notes: draft.notes || '',
    source: draft.source,
    llm_model: draft.llm_model,
    llm_confidence: draft.llm_confidence,
    error: null,
  }
}

function rowToExpenseCreate(row) {
  return {
    raw_input: row.raw_input,
    amount: parseFloat(row.amount),
    currency: row.currency || 'INR',
    category: row.category,
    subcategory: row.subcategory || null,
    merchant: row.merchant || null,
    payment_method: row.payment_method || null,
    date: row.date,
    tags: row.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    notes: row.notes || null,
    source: row.source,
    llm_model: row.llm_model,
    llm_confidence: row.llm_confidence,
  }
}

export default function BatchConfirmModal({ drafts, onClose, onSaved }) {
  const categories = useCategories()
  const notify = useNotify()
  const [rows, setRows] = useState(() => drafts.map(draftToRow))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleRowChange = (id, field) => (event) => {
    const { value } = event.target
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value, error: null } : row)))
  }

  const handleRemove = (id) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const handleSubmit = async () => {
    if (rows.length === 0 || isSaving) return
    setIsSaving(true)
    setError(null)
    const submitted = rows
    try {
      const result = await batchCreateExpenses(submitted.map(rowToExpenseCreate))
      const failedByIndex = new Map(result.failed.map((f) => [f.index, f.error]))
      const remaining = submitted
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => failedByIndex.has(index))
        .map(({ row, index }) => ({ ...row, error: failedByIndex.get(index) }))

      setRows(remaining)

      if (result.created.length) {
        notify.success(
          `${result.created.length} expense${result.created.length === 1 ? '' : 's'} added` +
            (result.failed.length ? `, ${result.failed.length} failed` : ''),
        )
        onSaved()
      } else if (result.failed.length) {
        notify.error('Could not save these expenses')
      }

      if (remaining.length === 0) onClose()
    } catch (err) {
      setError(err.message)
      notify.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const categoryOptions = categories.length
    ? categories.map((c) => c.name)
    : [...new Set(rows.map((r) => r.category))]

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Confirm ${rows.length} expense${rows.length === 1 ? '' : 's'}`}
      className="batch-confirm-modal"
    >
      {rows.length === 0 ? (
        <p className="batch-confirm-modal__empty">No expenses left to save.</p>
      ) : (
        <div className="batch-confirm-modal__rows">
          {rows.map((row) => (
            <div key={row.id} className="batch-confirm-row">
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="batch-confirm-row__amount"
                value={row.amount}
                onChange={handleRowChange(row.id, 'amount')}
                aria-label="Amount"
              />
              <select
                className="batch-confirm-row__category"
                value={row.category}
                onChange={handleRowChange(row.id, 'category')}
                aria-label="Category"
              >
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="batch-confirm-row__merchant"
                placeholder="Merchant"
                value={row.merchant}
                onChange={handleRowChange(row.id, 'merchant')}
                aria-label="Merchant"
              />
              <input
                type="date"
                className="batch-confirm-row__date"
                value={row.date}
                onChange={handleRowChange(row.id, 'date')}
                aria-label="Date"
              />
              <select
                className="batch-confirm-row__payment"
                value={row.payment_method}
                onChange={handleRowChange(row.id, 'payment_method')}
                aria-label="Payment method"
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="batch-confirm-row__remove"
                onClick={() => handleRemove(row.id)}
                aria-label="Remove this expense"
                title="Remove this expense"
              >
                ✕
              </button>
              {row.error && <p className="batch-confirm-row__error">{row.error}</p>}
            </div>
          ))}
        </div>
      )}
      {error && <p className="batch-confirm-modal__error">{error}</p>}
      <div className="batch-confirm-modal__actions">
        <button type="button" onClick={onClose} disabled={isSaving}>
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={isSaving || rows.length === 0}>
          {isSaving ? 'Saving…' : `Save ${rows.length} expense${rows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </Modal>
  )
}
