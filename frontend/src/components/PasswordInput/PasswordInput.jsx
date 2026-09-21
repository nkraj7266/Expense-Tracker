import { useState } from 'react'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import './PasswordInput.css'

export default function PasswordInput({ id, ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-input">
      <input id={id} type={visible ? 'text' : 'password'} style={{ paddingRight: 38 }} {...inputProps} />
      <button
        type="button"
        className="password-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
      </button>
    </div>
  )
}
