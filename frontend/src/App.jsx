import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import CaptureBar from './components/CaptureBar/CaptureBar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useExpensesRefresh } from './context/ExpensesRefreshContext'
import { useAuth } from './context/AuthContext'
import './App.css'

function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function AppShell() {
  const { bumpRefresh } = useExpensesRefresh()
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Expense Tracker</span>
        <nav className="app-shell__nav">
          <NavLink to="/" end>
            Today
          </NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/history">History</NavLink>
        </nav>
        <div className="app-shell__account">
          <span className="app-shell__user">{user.display_name || user.email}</span>
          <button className="app-shell__logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-shell__main">
        <CaptureBar onSaved={bumpRefresh} />
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
