import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import './Notification.css'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null)

  const handleClose = useCallback((_event, reason) => {
    if (reason === 'clickaway') return
    setToast(null)
  }, [])

  const notify = useMemo(
    () => ({
      success: (message) => setToast({ message, severity: 'success' }),
      error: (message) => setToast({ message, severity: 'error' }),
      info: (message) => setToast({ message, severity: 'info' }),
    }),
    [],
  )

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotify must be used within a NotificationProvider')
  return ctx
}
