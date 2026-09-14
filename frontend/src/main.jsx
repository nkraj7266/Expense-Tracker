import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/variables.css'
import './styles/global.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ExpensesRefreshProvider } from './context/ExpensesRefreshContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ExpensesRefreshProvider>
          <App />
        </ExpensesRefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
