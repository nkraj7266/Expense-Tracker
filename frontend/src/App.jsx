import { NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import TodayIcon from '@mui/icons-material/TodayOutlined'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import HistoryIcon from '@mui/icons-material/HistoryOutlined'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { AnimatePresence, motion } from 'motion/react'
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
import { DURATION_BASE, EASE_STANDARD } from './lib/motion'
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

const NAV_ITEMS = [
  { to: '/', end: true, label: 'Today', icon: <TodayIcon fontSize="small" /> },
  { to: '/dashboard', end: false, label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> },
  { to: '/history', end: false, label: 'History', icon: <HistoryIcon fontSize="small" /> },
]

const PILL_TRANSITION = { duration: DURATION_BASE, ease: EASE_STANDARD }

function AppShell() {
  const { bumpRefresh } = useExpensesRefresh()
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <span className="app-shell__brand">Expense Tracker</span>
        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-shell__nav-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="desktop-active-tab"
                      className="app-shell__nav-pill"
                      transition={PILL_TRANSITION}
                    />
                  )}
                  <span className="app-shell__nav-label">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={PILL_TRANSITION}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="app-shell__tabbar" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `app-shell__tab${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-active-tab"
                    className="app-shell__tab-pill"
                    transition={PILL_TRANSITION}
                  />
                )}
                {item.icon}
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
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
