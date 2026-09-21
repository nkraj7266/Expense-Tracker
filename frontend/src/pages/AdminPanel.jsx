import { useCallback, useEffect, useState } from 'react'
import Modal from '../components/Modal/Modal'
import { getUserStats, listUsers, updateUser } from '../api/admin'
import { useNotify } from '../context/NotificationContext'
import './AdminPanel.css'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function UserDetail({ userId, onClose, onUpdated }) {
  const notify = useNotify()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ display_name: '', email: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getUserStats(userId)
      .then((data) => {
        if (cancelled) return
        setStats(data)
        setForm({ display_name: data.display_name || '', email: data.email })
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const updated = await updateUser(userId, {
        display_name: form.display_name || null,
        email: form.email,
      })
      notify.success('User updated')
      setStats((prev) => ({ ...prev, display_name: updated.display_name, email: updated.email }))
      onUpdated(updated)
    } catch (err) {
      notify.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen title="User details" onClose={onClose}>
      {loading && <p>Loading…</p>}
      {error && <p className="admin-panel__error">{error}</p>}
      {stats && (
        <>
          <div className="admin-panel__stats-grid">
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Signed up</span>
              <span className="admin-panel__stat-value">{formatDate(stats.account_created_at)}</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Last login</span>
              <span className="admin-panel__stat-value">{formatDateTime(stats.last_login_at)}</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Total logins</span>
              <span className="admin-panel__stat-value">{stats.total_logins}</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Login streak</span>
              <span className="admin-panel__stat-value">{stats.current_login_streak_days}d</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Active days (30d)</span>
              <span className="admin-panel__stat-value">{stats.distinct_login_days_30d}/30</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Expenses logged</span>
              <span className="admin-panel__stat-value">{stats.total_expenses_logged}</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Last expense</span>
              <span className="admin-panel__stat-value">{formatDate(stats.last_expense_at)}</span>
            </div>
            <div className="admin-panel__stat">
              <span className="admin-panel__stat-label">Expense days (30d)</span>
              <span className="admin-panel__stat-value">{stats.distinct_expense_days_30d}/30</span>
            </div>
          </div>

          <form className="admin-panel__edit-form" onSubmit={handleSave}>
            <h3>Edit account</h3>
            <label>
              Display name
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </>
      )}
    </Modal>
  )
}

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)

  const fetchUsers = useCallback((query) => {
    setLoading(true)
    setError(null)
    listUsers({ q: query, limit: 100 })
      .then((data) => {
        setUsers(data.users)
        setTotal(data.total)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => fetchUsers(q), q ? 300 : 0)
    return () => clearTimeout(handle)
  }, [q, fetchUsers])

  const handleUpdated = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h1>Admin panel</h1>
        <input
          type="text"
          className="admin-panel__search"
          placeholder="Search by email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <p className="admin-panel__summary">{total} account{total === 1 ? '' : 's'}</p>

      {loading && <p>Loading…</p>}
      {error && <p className="admin-panel__error">{error}</p>}

      {!loading && !error && (
        <div className="admin-panel__table-wrap">
          <table className="admin-panel__table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Signed up</th>
                <th>Last login</th>
                <th>Access</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => setSelectedUserId(u.id)}>
                  <td>{u.email}</td>
                  <td>{u.display_name || '—'}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{formatDateTime(u.last_login_at)}</td>
                  <td>
                    <span className={`admin-panel__badge admin-panel__badge--${u.access_level}`}>
                      {u.access_level}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-panel__badge admin-panel__badge--${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-panel__empty">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUserId && (
        <UserDetail
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  )
}
