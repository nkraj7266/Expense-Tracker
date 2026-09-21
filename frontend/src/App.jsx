import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import LogoutIcon from '@mui/icons-material/Logout'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import TodayIcon from '@mui/icons-material/Today'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HistoryIcon from '@mui/icons-material/History'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import CaptureBar from './components/CaptureBar/CaptureBar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminPanel from './pages/AdminPanel'
import { useExpensesRefresh } from './context/ExpensesRefreshContext'
import { useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import './App.css'

function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function RequireAdmin() {
  const { user } = useAuth()
  return user.access_level === 'admin' ? <Outlet /> : <Navigate to="/" replace />
}

const TAB_ICONS = {
  today: <TodayIcon fontSize="small" />,
  dashboard: <DashboardIcon fontSize="small" />,
  history: <HistoryIcon fontSize="small" />,
}

function AppShell() {
  const { bumpRefresh } = useExpensesRefresh()
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()

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
          {user.access_level === 'admin' && (
            <button
              className="app-shell__admin"
              onClick={() => navigate('/admin')}
              aria-label="Open admin panel"
              title="Admin panel"
            >
              <AdminPanelSettingsIcon fontSize="small" />
            </button>
          )}
          <button
            className="app-shell__theme-toggle"
            onClick={toggleTheme}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </button>
          <button className="app-shell__logout" onClick={logout} aria-label="Log out" title="Log out">
            <LogoutIcon fontSize="small" />
          </button>
        </div>
      </header>

      <main className="app-shell__main">
        <CaptureBar onSaved={bumpRefresh} />
        <Outlet />
      </main>

      <nav className="app-shell__tabbar" aria-label="Primary">
        <NavLink to="/" end className="app-shell__tab">
          {TAB_ICONS.today}
          <span>Today</span>
        </NavLink>
        <NavLink to="/dashboard" className="app-shell__tab">
          {TAB_ICONS.dashboard}
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/history" className="app-shell__tab">
          {TAB_ICONS.history}
          <span>History</span>
        </NavLink>
      </nav>
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
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
